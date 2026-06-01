package main

import (
	"fmt"
	"math/rand"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"

	"gopkg.in/yaml.v3"
)

var dagsDir string

func init() {
	// Resolve <repo>/content/dags regardless of CWD.
	candidates := []string{
		filepath.Join("..", "..", "content", "dags"),
		filepath.Join("content", "dags"),
		"/app/content/dags",
	}
	for _, c := range candidates {
		if st, err := os.Stat(c); err == nil && st.IsDir() {
			dagsDir = c
			return
		}
	}
	dagsDir = candidates[0]
}

// ── FixContext ──────────────────────────────────────────────────────────────

type FixContext struct {
	raw  string
	norm string
}

func NewFixContext(fixText string) *FixContext {
	return &FixContext{raw: fixText, norm: strings.ToLower(fixText)}
}

func (c *FixContext) FixContains(needle string) bool {
	return strings.Contains(c.norm, strings.ToLower(needle))
}

func (c *FixContext) FixEmpty() bool {
	return strings.TrimSpace(c.norm) == ""
}

// ── Condition evaluator (recursive descent) ─────────────────────────────────

type tokenType int

const (
	tokEOF tokenType = iota
	tokIdent
	tokString
	tokLParen
	tokRParen
	tokAnd
	tokOr
	tokNot
)

type token struct {
	typ tokenType
	val string
}

type lexer struct {
	input []rune
	pos   int
}

func (l *lexer) peek() rune {
	if l.pos >= len(l.input) {
		return 0
	}
	return l.input[l.pos]
}

func (l *lexer) next() rune {
	r := l.peek()
	l.pos++
	return r
}

func (l *lexer) skipWS() {
	for l.peek() == ' ' || l.peek() == '\t' || l.peek() == '\n' {
		l.pos++
	}
}

func (l *lexer) lex() []token {
	var toks []token
	for {
		l.skipWS()
		r := l.peek()
		if r == 0 {
			toks = append(toks, token{typ: tokEOF})
			return toks
		}
		switch {
		case r == '(':
			l.next()
			toks = append(toks, token{typ: tokLParen, val: "("})
		case r == ')':
			l.next()
			toks = append(toks, token{typ: tokRParen, val: ")"})
		case r == '\'' || r == '"':
			quote := l.next()
			var buf strings.Builder
			for {
				ch := l.peek()
				if ch == 0 || ch == quote {
					break
				}
				buf.WriteRune(l.next())
			}
			if l.peek() == quote {
				l.next()
			}
			toks = append(toks, token{typ: tokString, val: buf.String()})
		case isIdentStart(r):
			var buf strings.Builder
			for isIdentPart(l.peek()) {
				buf.WriteRune(l.next())
			}
			word := buf.String()
			switch strings.ToUpper(word) {
			case "AND":
				toks = append(toks, token{typ: tokAnd, val: "AND"})
			case "OR":
				toks = append(toks, token{typ: tokOr, val: "OR"})
			case "NOT":
				toks = append(toks, token{typ: tokNot, val: "NOT"})
			default:
				toks = append(toks, token{typ: tokIdent, val: word})
			}
		default:
			// skip unknown
			l.next()
		}
	}
}

func isIdentStart(r rune) bool {
	return (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || r == '_'
}

func isIdentPart(r rune) bool {
	return isIdentStart(r) || (r >= '0' && r <= '9')
}

type parser struct {
	toks []token
	pos  int
}

func (p *parser) peek() token {
	if p.pos >= len(p.toks) {
		return token{typ: tokEOF}
	}
	return p.toks[p.pos]
}

func (p *parser) next() token {
	t := p.peek()
	p.pos++
	return t
}

func (p *parser) expect(typ tokenType) token {
	t := p.next()
	if t.typ != typ {
		return token{typ: tokEOF}
	}
	return t
}

// expr = term ( "OR" term )*
func (p *parser) parseExpr(ctx *FixContext) bool {
	result := p.parseTerm(ctx)
	for p.peek().typ == tokOr {
		p.next()
		rhs := p.parseTerm(ctx)
		result = result || rhs
	}
	return result
}

// term = factor ( "AND" factor )*
func (p *parser) parseTerm(ctx *FixContext) bool {
	result := p.parseFactor(ctx)
	for p.peek().typ == tokAnd {
		p.next()
		rhs := p.parseFactor(ctx)
		result = result && rhs
	}
	return result
}

// factor = "NOT" factor | "(" expr ")" | call
func (p *parser) parseFactor(ctx *FixContext) bool {
	if p.peek().typ == tokNot {
		p.next()
		return !p.parseFactor(ctx)
	}
	if p.peek().typ == tokLParen {
		p.next()
		result := p.parseExpr(ctx)
		p.expect(tokRParen)
		return result
	}
	return p.parseCall(ctx)
}

// call = ident "(" string ")"
func (p *parser) parseCall(ctx *FixContext) bool {
	name := p.expect(tokIdent)
	if name.typ == tokEOF {
		return false
	}
	p.expect(tokLParen)
	arg := p.expect(tokString)
	p.expect(tokRParen)

	switch name.val {
	case "fix_contains":
		return ctx.FixContains(arg.val)
	case "fix_empty":
		return ctx.FixEmpty()
	}
	return false
}

func evaluateCondition(cond string, ctx *FixContext) bool {
	cond = strings.TrimSpace(cond)
	if cond == "" {
		return true
	}
	l := &lexer{input: []rune(cond)}
	toks := l.lex()
	p := &parser{toks: toks}
	return p.parseExpr(ctx)
}

// ── DAG model ───────────────────────────────────────────────────────────────

type DagNode struct {
	ID                string                `yaml:"id"`
	Type              string                `yaml:"type"`
	Severity          string                `yaml:"severity,omitempty"`
	Category          string                `yaml:"category,omitempty"`
	Description       string                `yaml:"description,omitempty"`
	Outcome           string                `yaml:"outcome,omitempty"`
	Hints             []Hint                `yaml:"hints,omitempty"`
	SolutionSignature *SolutionSignature     `yaml:"solution_signature,omitempty"`
	Transitions       []DagTransition       `yaml:"transitions,omitempty"`
}

type Hint struct {
	Level int    `yaml:"level"`
	Cost  int    `yaml:"cost"`
	Text  string `yaml:"text"`
}

type SolutionSignature struct {
	Required []string `yaml:"required,omitempty"`
	Preferred string  `yaml:"preferred,omitempty"`
}

type DagTransition struct {
	To        string  `yaml:"to"`
	Condition string  `yaml:"condition,omitempty"`
	Weight    float64 `yaml:"weight,omitempty"`
}

type DagData struct {
	Archetype string    `yaml:"archetype"`
	Name      string    `yaml:"name"`
	Slug      string    `yaml:"slug"`
	Version   float64   `yaml:"version,omitempty"`
	Start     string    `yaml:"start"`
	Lessons   []string  `yaml:"lessons,omitempty"`
	Nodes     []DagNode `yaml:"nodes"`
}

type Dag struct {
	Data    DagData
	nodeMap map[string]*DagNode
}

func (d *Dag) Node(id string) (*DagNode, error) {
	n, ok := d.nodeMap[id]
	if !ok {
		return nil, fmt.Errorf("unknown node '%s'", id)
	}
	return n, nil
}

func (d *Dag) IsTerminal(id string) bool {
	n, err := d.Node(id)
	if err != nil {
		return false
	}
	return n.Type == "terminal"
}

func (d *Dag) FirstNode() string {
	nid := d.Data.Start
	n, err := d.Node(nid)
	if err != nil {
		if len(d.Data.Nodes) > 0 {
			return d.Data.Nodes[0].ID
		}
		return ""
	}
	if n.Type == "starting_state" && len(n.Transitions) > 0 {
		return n.Transitions[0].To
	}
	return nid
}

type ResolvedEdge struct {
	To         string   `json:"to"`
	Condition  string   `json:"condition,omitempty"`
	Reason     string   `json:"reason"`
	Candidates []string `json:"candidates"`
}

func (d *Dag) ResolveTransition(nodeID, fixText string, rng *rand.Rand) (*ResolvedEdge, error) {
	if rng == nil {
		rng = rand.New(rand.NewSource(rand.Int63()))
	}
	n, err := d.Node(nodeID)
	if err != nil {
		return nil, err
	}
	ctx := NewFixContext(fixText)
	edges := n.Transitions

	var matched []DagTransition
	for _, e := range edges {
		cond := e.Condition
		if cond == "" || evaluateCondition(cond, ctx) {
			matched = append(matched, e)
		}
	}

	var pool []DagTransition
	var reason string
	if len(matched) > 0 {
		pool, reason = matched, "condition_matched"
	} else if len(edges) > 0 {
		pool, reason = edges, "fallback"
	} else {
		return nil, fmt.Errorf("node '%s' has no outgoing transitions", nodeID)
	}

	var chosen DagTransition
	if len(pool) == 1 {
		chosen = pool[0]
	} else {
		weights := make([]float64, len(pool))
		total := 0.0
		for i, e := range pool {
			w := e.Weight
			if w <= 0 {
				w = 1.0
			}
			weights[i] = w
			total += w
		}
		r := rng.Float64() * total
		cum := 0.0
		for i, w := range weights {
			cum += w
			if r <= cum {
				chosen = pool[i]
				break
			}
		}
	}

	candidates := make([]string, len(pool))
	for i, e := range pool {
		candidates[i] = e.To
	}

	return &ResolvedEdge{
		To:         chosen.To,
		Condition:  chosen.Condition,
		Reason:     reason,
		Candidates: candidates,
	}, nil
}

var (
	dagCache = map[string]*Dag{}
	dagMu    sync.Mutex
)

func loadDag(slug string) (*Dag, error) {
	dagMu.Lock()
	defer dagMu.Unlock()
	if d, ok := dagCache[slug]; ok {
		return d, nil
	}

	candidates := []string{
		filepath.Join(dagsDir, slug+".yaml"),
		filepath.Join(dagsDir, slug+".yml"),
	}
	var path string
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			path = c
			break
		}
	}
	if path == "" {
		entries, err := os.ReadDir(dagsDir)
		if err != nil {
			return nil, fmt.Errorf("no DAG for '%s'", slug)
		}
		for _, e := range entries {
			if e.IsDir() {
				continue
			}
			data, err := os.ReadFile(filepath.Join(dagsDir, e.Name()))
			if err != nil {
				continue
			}
			var dd DagData
			if err := yaml.Unmarshal(data, &dd); err != nil {
				continue
			}
			if dd.Slug == slug || dd.Archetype == slug {
				path = filepath.Join(dagsDir, e.Name())
				break
			}
		}
	}
	if path == "" {
		return nil, fmt.Errorf("no DAG for '%s'", slug)
	}
	return loadDagFile(path)
}

func loadDagFile(path string) (*Dag, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var dd DagData
	if err := yaml.Unmarshal(data, &dd); err != nil {
		return nil, err
	}
	if dd.Slug == "" {
		dd.Slug = dd.Archetype
	}
	dag := &Dag{Data: dd, nodeMap: map[string]*DagNode{}}
	for i := range dd.Nodes {
		n := &dd.Nodes[i]
		dag.nodeMap[n.ID] = n
	}
	dagCache[dd.Slug] = dag
	return dag, nil
}

// Used by the condition-lexer tests
var conditionRe = regexp.MustCompile(`\b(fix_contains|fix_empty)\b`)
