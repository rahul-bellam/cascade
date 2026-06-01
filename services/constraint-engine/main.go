package main

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	startTime = time.Now()
	sessions  = map[string]*Session{}
	sessMu    sync.Mutex
)

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
		"service": "cascade-constraint-engine",
		"status":  "operational",
		"version": "0.2.0",
		"uptime":  time.Since(startTime).Round(time.Second).String(),
	})
}

func archetypesHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]any{"archetypes": listArchetypes()})
}

func toolkitForUser(userID string) []map[string]any {
	base := os.Getenv("LEARN_ENGINE_URL")
	if base == "" {
		base = "http://localhost:8093"
	}
	resp, err := http.Get(fmt.Sprintf("%s/users/%s/toolkit", base, userID))
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

type startReq struct {
	Archetype string `json:"archetype"`
	UserID    string `json:"user_id"`
}

func levelView(a *Archetype, level int, userID string) map[string]any {
	if level == 0 {
		return map[string]any{
			"level":             0,
			"title":             "Origin — the working monolith",
			"impact":            a.StartingMonolith,
			"origin_code":       originCode(a),
			"is_origin":         true,
			"suggested_toolkit": suggestToolkit(a, 1, userID),
		}
	}
	if level > len(a.Constraints) {
		return map[string]any{"completed": true}
	}
	c := a.Constraints[level-1]
	return map[string]any{
		"level":             c.Level,
		"title":             c.Title,
		"impact":            c.Impact,
		"target_rps":        c.TargetRPS,
		"latency_sla_ms":    c.LatencySLA,
		"error_sla_pct":     c.ErrorSLAPct,
		"change_type":       c.ChangeType,
		"hint_count":        len(c.Hints),
		"is_origin":         false,
		"suggested_toolkit": suggestToolkit(a, level, userID),
	}
}

func suggestToolkit(a *Archetype, level int, userID string) []map[string]any {
	tk := toolkitForUser(userID)
	if len(tk) == 0 {
		return nil
	}
	var ct string
	if level >= 1 && level <= len(a.Constraints) {
		ct = a.Constraints[level-1].ChangeType
	}
	out := []map[string]any{}
	for _, item := range tk {
		key, _ := item["toolkit_key"].(string)
		relevant := false
		switch {
		case strings.Contains(ct, "caching") && strings.Contains(key, "cache"):
			relevant = true
		case strings.Contains(a.Slug, "rate") && strings.Contains(key, "token"):
			relevant = true
		case strings.Contains(key, "cache"):
			relevant = true
		}
		item["relevant"] = relevant
		out = append(out, item)
	}
	return out
}

func startHandler(w http.ResponseWriter, r *http.Request) {
	var req startReq
	json.NewDecoder(r.Body).Decode(&req)
	if req.Archetype == "" {
		req.Archetype = "rate-limiter"
	}
	if req.UserID == "" {
		req.UserID = "demo-user"
	}
	a, err := loadArchetype(req.Archetype)
	if err != nil {
		writeJSON(w, 404, map[string]string{"error": "unknown archetype: " + req.Archetype})
		return
	}
	s := &Session{
		ID: newID(), UserID: req.UserID, Archetype: a.Slug, Name: a.Name,
		CurrentLevel: 0, MaxLevel: len(a.Constraints), Status: "active",
	}
	sessMu.Lock()
	sessions[s.ID] = s
	sessMu.Unlock()
	writeJSON(w, 200, map[string]any{
		"session_id": s.ID, "archetype": a.Slug, "name": a.Name,
		"max_level": s.MaxLevel, "current": levelView(a, 1, req.UserID),
		"origin": levelView(a, 0, req.UserID),
	})
}

func getSession(id string) (*Session, *Archetype, bool) {
	sessMu.Lock()
	s, ok := sessions[id]
	sessMu.Unlock()
	if !ok {
		return nil, nil, false
	}
	a, err := loadArchetype(s.Archetype)
	if err != nil {
		return nil, nil, false
	}
	return s, a, true
}

type submitReq struct {
	Code         string `json:"code"`
	Architecture string `json:"architecture"`
}

func submitHandler(w http.ResponseWriter, r *http.Request, id string) {
	s, a, ok := getSession(id)
	if !ok {
		writeJSON(w, 404, map[string]string{"error": "session not found"})
		return
	}
	if s.Status != "active" {
		writeJSON(w, 409, map[string]string{"error": "session already " + s.Status})
		return
	}
	var req submitReq
	json.NewDecoder(r.Body).Decode(&req)
	fix := req.Code + "\n" + req.Architecture

	levelNum := s.CurrentLevel
	if levelNum < 1 {
		levelNum = 1
	}
	level := a.Constraints[levelNum-1]
	res := evaluate(level, fix)

	resp := map[string]any{
		"session_id": s.ID, "level": levelNum, "metrics": res,
		"passed": res.Passed,
	}

	if res.Passed {
		s.CurrentLevel = levelNum + 1
		s.Completed = append(s.Completed, res)
		s.Score = computeScore(s)
		if s.CurrentLevel > s.MaxLevel {
			s.Status = "completed"
			resp["all_levels_complete"] = true
			resp["score"] = s.Score
		} else {
			resp["next"] = levelView(a, s.CurrentLevel, s.UserID)
		}
	}
	resp["status"] = s.Status
	writeJSON(w, 200, resp)
}

func computeScore(s *Session) int {
	levelScore := len(s.Completed) * 120
	hintPenalty := s.HintsUsed * 20
	perfBonus := 0
	for _, r := range s.Completed {
		if r.P99Latency < 100 {
			perfBonus += 20
		}
	}
	sc := levelScore + perfBonus - hintPenalty
	if sc < 0 {
		sc = 0
	}
	return sc
}

func currentHandler(w http.ResponseWriter, r *http.Request, id string) {
	s, a, ok := getSession(id)
	if !ok {
		writeJSON(w, 404, map[string]string{"error": "session not found"})
		return
	}
	lvl := s.CurrentLevel
	if lvl < 1 {
		lvl = 1
	}
	writeJSON(w, 200, map[string]any{
		"session_id": s.ID, "status": s.Status, "current_level": s.CurrentLevel,
		"max_level": s.MaxLevel, "score": s.Score,
		"current": levelView(a, lvl, s.UserID),
	})
}

func hintHandler(w http.ResponseWriter, r *http.Request, id string) {
	s, a, ok := getSession(id)
	if !ok {
		writeJSON(w, 404, map[string]string{"error": "session not found"})
		return
	}
	level, _ := strconv.Atoi(r.URL.Query().Get("level"))
	if level < 1 {
		level = 1
	}
	lvl := s.CurrentLevel
	if lvl < 1 {
		lvl = 1
	}
	if lvl > len(a.Constraints) {
		writeJSON(w, 404, map[string]string{"error": "no current level"})
		return
	}
	hints := a.Constraints[lvl-1].Hints
	if level > len(hints) {
		level = len(hints)
	}
	if level > s.HintsUsed {
		s.HintsUsed = level
	}
	writeJSON(w, 200, map[string]any{
		"hints": hints[:level], "max_level": len(hints), "hints_used": s.HintsUsed,
	})
}

func constraintRouter(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.WriteHeader(204)
		return
	}
	path := strings.TrimPrefix(r.URL.Path, "/constraint/")
	parts := strings.Split(strings.Trim(path, "/"), "/")

	if len(parts) == 1 && parts[0] == "start" && r.Method == http.MethodPost {
		startHandler(w, r)
		return
	}
	if len(parts) >= 1 && parts[0] != "" {
		id := parts[0]
		action := ""
		if len(parts) > 1 {
			action = parts[1]
		}
		switch {
		case action == "" && r.Method == http.MethodGet:
			currentHandler(w, r, id)
		case action == "submit" && r.Method == http.MethodPost:
			submitHandler(w, r, id)
		case action == "hint" && r.Method == http.MethodGet:
			hintHandler(w, r, id)
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
		port = "8094"
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/archetypes", archetypesHandler)
	mux.HandleFunc("/constraint/", constraintRouter)

	addr := ":" + port
	log.Printf("Constraint engine starting on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}
