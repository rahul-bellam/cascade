package main

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

var knownCapabilities = []string{
	"redis", "sentinel", "cluster", "lua", "incr", "atomic",
	"fallback", "circuit", "ttl", "cache", "replica", "shard",
	"queue", "retry", "backoff", "timeout", "pool", "replicate",
	"failover", "bloom", "proxy", "balancer", "batch", "async",
}

var (
	startTime       = time.Now()
	sessions        = map[string]*Session{}
	sessMu          sync.Mutex
	learnEngineURL  = "http://localhost:8093"
	insightEngineURL = "http://localhost:8097"
	telemetry       []TelemetryEntry
	teleMu          sync.Mutex
)

type TelemetryEntry struct {
	UserID             string   `json:"user_id"`
	Mode               string   `json:"mode"`
	Archetype          string   `json:"archetype"`
	Node               string   `json:"node"`
	ConcernIDs         []int    `json:"concern_ids"`
	FixText            string   `json:"fix_text"`
	CapabilitiesSeen   []string `json:"capabilities_detected"`
	Outcome            string   `json:"outcome"`
	LedTo              string   `json:"led_to"`
	HintsUsed          int      `json:"hints_used"`
	TimeToFixMs        int64    `json:"time_to_fix_ms"`
	ReachedForFirst    string   `json:"reached_for_first"`
	Missed             []string `json:"missed"`
	TS                 string   `json:"ts"`
}

func init() {
	if v := os.Getenv("LEARN_ENGINE_URL"); v != "" {
		learnEngineURL = v
	}
}

type Session struct {
	ID               string
	UserID           string
	Archetype        string
	CurrentNode      string
	Path             []PathEntry
	Depth            int
	HintsUsed        int
	HintsRevealedHere int
	Status           string
}

type PathEntry struct {
	From   string `json:"from"`
	Fix    string `json:"fix"`
	To     string `json:"to"`
	Reason string `json:"reason"`
}

func newID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]string{
		"service": "cascade-engine",
		"status":  "operational",
		"version": "0.1.0",
		"uptime":  time.Since(startTime).Round(time.Second).String(),
	})
}

func archetypesHandler(w http.ResponseWriter, r *http.Request) {
	dag, err := loadDag("rate-limiter")
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, map[string]any{
		"archetypes": []map[string]string{{"slug": dag.Data.Slug, "name": dag.Data.Name}},
	})
}

// ── Toolkit fetching ────────────────────────────────────────────────────────

func toolkitForUser(userID string) []map[string]any {
	url := fmt.Sprintf("%s/users/%s/toolkit", learnEngineURL, userID)
	resp, err := http.Get(url)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var parsed struct {
		Toolkit []map[string]any `json:"toolkit"`
	}
	if json.Unmarshal(body, &parsed) != nil {
		return nil
	}
	return parsed.Toolkit
}

func suggestToolkit(node *DagNode, userID string) []map[string]any {
	tk := toolkitForUser(userID)
	if len(tk) == 0 {
		return nil
	}
	blob := strings.ToLower(node.Description + " " + node.Category)
	if node.SolutionSignature != nil {
		blob += " " + strings.Join(node.SolutionSignature.Required, " ")
		blob += " " + node.SolutionSignature.Preferred
	}
	out := []map[string]any{}
	for _, item := range tk {
		key, _ := item["toolkit_key"].(string)
		key = strings.ToLower(key)
		relevant := false
		if strings.Contains(key, "cache") && (strings.Contains(blob, "redis") || strings.Contains(blob, "cache") || strings.Contains(blob, "persist") || strings.Contains(blob, "data_loss")) {
			relevant = true
		}
		if strings.Contains(key, "token") && (strings.Contains(blob, "rate") || strings.Contains(blob, "limit") || strings.Contains(blob, "counter")) {
			relevant = true
		}
		item["relevant"] = relevant
		out = append(out, item)
	}
	sort.Slice(out, func(i, j int) bool {
		ri, _ := out[i]["relevant"].(bool)
		rj, _ := out[j]["relevant"].(bool)
		return ri && !rj
	})
	return out
}

// ── Session helpers ─────────────────────────────────────────────────────────

type startReq struct {
	Archetype string `json:"archetype"`
	UserID    string `json:"user_id"`
}

type fixReq struct {
	Fix string `json:"fix"`
}

func nodeView(dag *Dag, nodeID string, hintsRevealed int, userID string) map[string]any {
	n, err := dag.Node(nodeID)
	if err != nil {
		return map[string]any{"error": err.Error()}
	}
	sort.Slice(n.Hints, func(i, j int) bool { return n.Hints[i].Level < n.Hints[j].Level })
	revealed := []Hint{}
	for _, h := range n.Hints {
		if h.Level <= hintsRevealed {
			revealed = append(revealed, h)
		}
	}
	result := map[string]any{
		"node_id":      nodeID,
		"type":         n.Type,
		"severity":     n.Severity,
		"category":     n.Category,
		"description":  n.Description,
		"outcome":      n.Outcome,
		"is_terminal":  dag.IsTerminal(nodeID),
		"hint_count":   len(n.Hints),
		"hints_revealed": revealed,
	}
	if n.SolutionSignature != nil {
		result["solution_signature"] = n.SolutionSignature
	}
	if !dag.IsTerminal(nodeID) {
		result["suggested_toolkit"] = suggestToolkit(n, userID)
	} else {
		result["suggested_toolkit"] = []map[string]any{}
	}
	return result
}

func score(s *Session) int {
	depth := s.Depth
	hints := s.HintsUsed
	survived := s.Status == "survived"
	base := depth * 200
	hintPenalty := hints * 40
	survivalBonus := 500
	if !survived {
		survivalBonus = 0
	}
	sc := base + survivalBonus - hintPenalty
	if sc < 0 {
		sc = 0
	}
	return sc
}

// ── Handlers ────────────────────────────────────────────────────────────────

func startHandler(w http.ResponseWriter, r *http.Request) {
	var req startReq
	json.NewDecoder(r.Body).Decode(&req)
	if req.Archetype == "" {
		req.Archetype = "rate-limiter"
	}
	if req.UserID == "" {
		req.UserID = "demo-user"
	}
	dag, err := loadDag(req.Archetype)
	if err != nil {
		writeJSON(w, 404, map[string]string{"error": fmt.Sprintf("No DAG for '%s': %s", req.Archetype, err.Error())})
		return
	}
	first := dag.FirstNode()
	sid := newID()
	sessMu.Lock()
	sessions[sid] = &Session{
		ID: sid, UserID: req.UserID, Archetype: dag.Data.Slug,
		CurrentNode: first, Status: "active",
	}
	sessMu.Unlock()
	writeJSON(w, 200, map[string]any{
		"session_id": sid,
		"archetype":  dag.Data.Slug,
		"name":       dag.Data.Name,
		"current":    nodeView(dag, first, 0, req.UserID),
	})
}

func requireSession(sid string) (*Session, *Dag, error) {
	sessMu.Lock()
	s, ok := sessions[sid]
	sessMu.Unlock()
	if !ok {
		return nil, nil, fmt.Errorf("session not found")
	}
	dag, err := loadDag(s.Archetype)
	if err != nil {
		return nil, nil, err
	}
	return s, dag, nil
}

func currentHandler(w http.ResponseWriter, r *http.Request, sid string) {
	s, dag, err := requireSession(sid)
	if err != nil {
		writeJSON(w, 404, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 200, map[string]any{
		"session_id":  sid,
		"status":      s.Status,
		"depth":       s.Depth,
		"hints_used":  s.HintsUsed,
		"current":     nodeView(dag, s.CurrentNode, s.HintsRevealedHere, s.UserID),
	})
}

func hintHandler(w http.ResponseWriter, r *http.Request, sid string) {
	s, dag, err := requireSession(sid)
	if err != nil {
		writeJSON(w, 404, map[string]string{"error": err.Error()})
		return
	}
	levelStr := r.URL.Query().Get("level")
	level := 1
	if levelStr != "" {
		if l, err := strconv.Atoi(levelStr); err == nil && l > 0 {
			level = l
		}
	}
	n, err := dag.Node(s.CurrentNode)
	if err != nil {
		writeJSON(w, 404, map[string]string{"error": err.Error()})
		return
	}
	sort.Slice(n.Hints, func(i, j int) bool { return n.Hints[i].Level < n.Hints[j].Level })
	revealed := []Hint{}
	for _, h := range n.Hints {
		if h.Level <= level {
			revealed = append(revealed, h)
		}
	}
	if len(revealed) == 0 {
		writeJSON(w, 404, map[string]string{"error": "No hint at that level"})
		return
	}
	if level > s.HintsRevealedHere {
		s.HintsUsed += level - s.HintsRevealedHere
		s.HintsRevealedHere = level
	}
	writeJSON(w, 200, map[string]any{"hints": revealed, "hints_used": s.HintsUsed})
}

func submitFixHandler(w http.ResponseWriter, r *http.Request, sid string) {
	s, dag, err := requireSession(sid)
	if err != nil {
		writeJSON(w, 404, map[string]string{"error": err.Error()})
		return
	}
	if s.Status != "active" {
		writeJSON(w, 409, map[string]string{"error": "Session already " + s.Status})
		return
	}
	var req fixReq
	json.NewDecoder(r.Body).Decode(&req)

	fromNode := s.CurrentNode
	edge, err := dag.ResolveTransition(fromNode, req.Fix, nil)
	if err != nil {
		writeJSON(w, 500, map[string]string{"error": err.Error()})
		return
	}
	toNode := edge.To

	s.Path = append(s.Path, PathEntry{From: fromNode, Fix: req.Fix, To: toNode, Reason: edge.Reason})
	s.CurrentNode = toNode
	s.Depth++
	s.HintsRevealedHere = 0

	outcome := "active"
	if dag.IsTerminal(toNode) {
		n, _ := dag.Node(toNode)
		outcome = "survived"
		if n != nil && n.Outcome != "" {
			outcome = n.Outcome
		}
		if outcome == "survived" {
			s.Status = "survived"
		} else {
			s.Status = "failed"
		}
	}

	// ── Signal layer telemetry ─────────────────────────────────────────────
	fromNodeObj, _ := dag.Node(fromNode)
	fixNorm := strings.ToLower(req.Fix)

	var reachedForFirst string
	var capabilitiesSeen []string
	for _, cap := range knownCapabilities {
		if strings.Contains(fixNorm, cap) {
			capabilitiesSeen = append(capabilitiesSeen, cap)
			if reachedForFirst == "" {
				reachedForFirst = cap
			}
		}
	}

	var missed []string
	if fromNodeObj != nil && fromNodeObj.SolutionSignature != nil {
		reqSet := map[string]bool{}
		for _, c := range capabilitiesSeen {
			reqSet[c] = true
		}
		for _, r := range fromNodeObj.SolutionSignature.Required {
			if !reqSet[r] {
				missed = append(missed, r)
			}
		}
	}

	entry := TelemetryEntry{
		UserID:           s.UserID,
		Mode:             "cascade",
		Archetype:        s.Archetype,
		Node:             fromNode,
		FixText:          req.Fix,
		CapabilitiesSeen: capabilitiesSeen,
		Outcome:          outcome,
		LedTo:            toNode,
		HintsUsed:        s.HintsUsed,
		ReachedForFirst:  reachedForFirst,
		Missed:           missed,
		TS:               time.Now().UTC().Format(time.RFC3339),
	}
	if fromNodeObj != nil {
		entry.ConcernIDs = fromNodeObj.ConcernIDs
	}
	teleMu.Lock()
	telemetry = append(telemetry, entry)
	teleMu.Unlock()
	// ────────────────────────────────────────────────────────────────────────

	result := map[string]any{
		"session_id":  sid,
		"from_node":   fromNode,
		"next":        nodeView(dag, toNode, 0, s.UserID),
		"edge_reason": edge.Reason,
		"candidates":  edge.Candidates,
		"depth":       s.Depth,
		"status":      s.Status,
	}
	if s.Status != "active" {
		result["score"] = score(s)
	}
	writeJSON(w, 200, result)
}

// ── Insight gate (Phase 3.6) ────────────────────────────────────────────────

type insightReq struct {
	Diagnosis   string `json:"diagnosis"`
	Tradeoffs   string `json:"tradeoffs"`
	Foresight   string `json:"foresight"`
}

type insightScore struct {
	DiagnosisScore float64 `json:"diagnosis_score"`
	TradeoffScore  float64 `json:"tradeoff_score"`
	ForesightScore float64 `json:"foresight_score"`
	Total          float64 `json:"total"`
	Unlocked       bool    `json:"unlocked"`
	ProcessHint    string  `json:"process_hint,omitempty"`
}

var insightSessions = map[string]*insightScore{}
var insightMu sync.Mutex

func insightGateHandler(w http.ResponseWriter, r *http.Request, sid string) {
	s, dag, err := requireSession(sid)
	if err != nil {
		writeJSON(w, 404, map[string]string{"error": err.Error()})
		return
	}
	n, err := dag.Node(s.CurrentNode)
	if err != nil {
		writeJSON(w, 404, map[string]string{"error": err.Error()})
		return
	}
	var req insightReq
	json.NewDecoder(r.Body).Decode(&req)

	er := n.ExpectedReasoning
	if er == nil {
		// No expected reasoning -> auto-unlock
		writeJSON(w, 200, insightScore{Unlocked: true})
		return
	}

	// Simple keyword-based scoring (deterministic fallback)
	normD := strings.ToLower(req.Diagnosis)
	normT := strings.ToLower(req.Tradeoffs)
	normF := strings.ToLower(req.Foresight)

	diagScore := scoreKeywords(normD, er.Diagnosis)
	tradeScore := scoreKeywords(normT, er.Tradeoffs)
	foresightScore := scoreKeywords(normF, er.Foresight)

	total := (diagScore + tradeScore + foresightScore) / 3.0
	unlocked := total >= 0.3

	var hint string
	if !unlocked {
		if diagScore < 0.3 {
			hint = "Start by identifying the specific component that's failing — what resource is exhausted or unavailable?"
		} else if tradeScore < 0.3 {
			hint = "Your fix has a cost. What trade-off are you making? (Latency? Consistency? Cost?)"
		} else {
			hint = "Good diagnosis. Now think one step ahead — what new failure could your fix introduce?"
		}
	}

	sc := insightScore{
		DiagnosisScore: diagScore,
		TradeoffScore:  tradeScore,
		ForesightScore: foresightScore,
		Total:          total,
		Unlocked:       unlocked,
		ProcessHint:    hint,
	}

	insightMu.Lock()
	insightSessions[sid] = &sc
	insightMu.Unlock()

	writeJSON(w, 200, sc)
}

func scoreKeywords(text string, expected []string) float64 {
	if len(expected) == 0 {
		return 1.0
	}
	hits := 0
	for _, kw := range expected {
		if strings.Contains(text, strings.ToLower(kw)) {
			hits++
		}
	}
	return float64(hits) / float64(len(expected))
}

// ── Challenge-a-friend (Phase 5) ─────────────────────────────────────────────

type challengeReq struct {
	Archetype string `json:"archetype"`
	UserID    string `json:"user_id"`
}

type challengeResp struct {
	ChallengeID  string `json:"challenge_id"`
	URL          string `json:"url"`
	Archetype    string `json:"archetype"`
	CreatedBy    string `json:"created_by"`
}

var challenges = map[string]*challengeResp{}
var chalMu sync.Mutex

func createChallengeHandler(w http.ResponseWriter, r *http.Request) {
	var req challengeReq
	json.NewDecoder(r.Body).Decode(&req)
	if req.Archetype == "" {
		req.Archetype = "rate-limiter"
	}
	if req.UserID == "" {
		req.UserID = "anonymous"
	}
	cid := newID()
	chal := &challengeResp{
		ChallengeID: cid,
		URL:         fmt.Sprintf("https://cascade.dev/challenge/%s", cid),
		Archetype:   req.Archetype,
		CreatedBy:   req.UserID,
	}
	chalMu.Lock()
	challenges[cid] = chal
	chalMu.Unlock()
	writeJSON(w, 201, chal)
}

func acceptChallengeHandler(w http.ResponseWriter, r *http.Request, cid string) {
	chalMu.Lock()
	chal, ok := challenges[cid]
	chalMu.Unlock()
	if !ok {
		writeJSON(w, 404, map[string]string{"error": "challenge not found"})
		return
	}
	// Start a new session for the accepter with the challenge's archetype
	body := strings.NewReader(fmt.Sprintf(`{"archetype":"%s","user_id":"challenge-%s"}`, chal.Archetype, cid))
	r2, _ := http.NewRequest("POST", "/cascade/start", body)
	r2.Header.Set("Content-Type", "application/json")
	startHandler(w, r2)
}

func telemetryHandler(w http.ResponseWriter, r *http.Request) {
	teleMu.Lock()
	out := make([]TelemetryEntry, len(telemetry))
	copy(out, telemetry)
	teleMu.Unlock()
	writeJSON(w, 200, out)
}

func summaryHandler(w http.ResponseWriter, r *http.Request, sid string) {
	s, dag, err := requireSession(sid)
	if err != nil {
		writeJSON(w, 404, map[string]string{"error": err.Error()})
		return
	}
	pathEntries := []map[string]any{}
	for i, p := range s.Path {
		fromDesc := ""
		if n, err := dag.Node(p.From); err == nil {
			fromDesc = n.Description
		}
		toDesc := ""
		if n, err := dag.Node(p.To); err == nil {
			toDesc = n.Description
		}
		pathEntries = append(pathEntries, map[string]any{
			"step":           i + 1,
			"problem":        fromDesc,
			"your_fix":       p.Fix,
			"led_to":         p.To,
			"led_to_problem": toDesc,
		})
	}
	writeJSON(w, 200, map[string]any{
		"session_id": sid,
		"archetype":  s.Archetype,
		"status":     s.Status,
		"depth":      s.Depth,
		"hints_used": s.HintsUsed,
		"score":      score(s),
		"path":       pathEntries,
	})
}

func graphHandler(w http.ResponseWriter, r *http.Request, archetype string) {
	dag, err := loadDag(archetype)
	if err != nil {
		writeJSON(w, 404, map[string]string{"error": fmt.Sprintf("No DAG for '%s': %s", archetype, err.Error())})
		return
	}
	nodes := []map[string]any{}
	edges := []map[string]any{}
	for _, n := range dag.Data.Nodes {
		nodes = append(nodes, map[string]any{
			"id": n.ID, "type": n.Type, "severity": n.Severity,
			"category": n.Category, "outcome": n.Outcome, "description": n.Description,
		})
		for _, t := range n.Transitions {
			edges = append(edges, map[string]any{"from": n.ID, "to": t.To, "weight": t.Weight})
		}
	}
	writeJSON(w, 200, map[string]any{
		"archetype":   dag.Data.Slug,
		"name":        dag.Data.Name,
		"start":       dag.Data.Start,
		"first_issue": dag.FirstNode(),
		"nodes":       nodes,
		"edges":       edges,
	})
}

func dagDataHandler(w http.ResponseWriter, r *http.Request, sid string) {
	s, dag, err := requireSession(sid)
	if err != nil {
		writeJSON(w, 404, map[string]string{"error": err.Error()})
		return
	}
	_ = s
	writeJSON(w, 200, dag.Data)
}

// ── Router ──────────────────────────────────────────────────────────────────

func cascadeRouter(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.WriteHeader(204)
		return
	}
	path := strings.TrimPrefix(r.URL.Path, "/cascade/")
	parts := strings.Split(strings.Trim(path, "/"), "/")

	// /cascade/graph/{archetype}
	if len(parts) == 2 && parts[0] == "graph" && r.Method == http.MethodGet {
		graphHandler(w, r, parts[1])
		return
	}
	// /cascade/start
	if len(parts) == 1 && parts[0] == "start" && r.Method == http.MethodPost {
		startHandler(w, r)
		return
	}
	// /cascade/telemetry
	if len(parts) == 1 && parts[0] == "telemetry" && r.Method == http.MethodGet {
		telemetryHandler(w, r)
		return
	}
	// /cascade/challenge
	if len(parts) == 1 && parts[0] == "challenge" && r.Method == http.MethodPost {
		createChallengeHandler(w, r)
		return
	}
	// /cascade/challenge/{cid}
	if len(parts) == 2 && parts[0] == "challenge" && r.Method == http.MethodGet {
		acceptChallengeHandler(w, r, parts[1])
		return
	}
	if len(parts) >= 1 && parts[0] != "" {
		sid := parts[0]
		action := ""
		if len(parts) > 1 {
			action = parts[1]
		}
		switch {
		case action == "" && r.Method == http.MethodGet:
			currentHandler(w, r, sid)
		case action == "fix" && r.Method == http.MethodPost:
			submitFixHandler(w, r, sid)
		case action == "hint" && r.Method == http.MethodGet:
			hintHandler(w, r, sid)
		case action == "summary" && r.Method == http.MethodGet:
			summaryHandler(w, r, sid)
		case action == "dag" && r.Method == http.MethodGet:
			dagDataHandler(w, r, sid)
		case action == "insight" && r.Method == http.MethodPost:
			insightGateHandler(w, r, sid)
		default:
			writeJSON(w, 404, map[string]string{"error": "not found"})
		}
		return
	}
	writeJSON(w, 404, map[string]string{"error": "not found"})
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8090"
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/archetypes", archetypesHandler)
	mux.HandleFunc("/cascade/", cascadeRouter)

	addr := ":" + port
	log.Printf("Cascade engine starting on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
