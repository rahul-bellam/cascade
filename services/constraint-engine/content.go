package main

import (
	"os"
	"path/filepath"
	"sync"

	"gopkg.in/yaml.v3"
)

var (
	archetypeCache = map[string]*Archetype{}
	cacheMu        sync.Mutex
)

// contentRoot resolves <repo>/content/constraints regardless of CWD.
func contentRoot() string {
	if v := os.Getenv("CONTENT_DIR"); v != "" {
		return filepath.Join(v, "constraints")
	}
	// Running from services/constraint-engine -> ../../content/constraints
	candidates := []string{
		filepath.Join("..", "..", "content", "constraints"),
		filepath.Join("content", "constraints"),
		"/app/content/constraints",
	}
	for _, c := range candidates {
		if st, err := os.Stat(c); err == nil && st.IsDir() {
			return c
		}
	}
	return candidates[0]
}

func loadArchetype(slug string) (*Archetype, error) {
	cacheMu.Lock()
	defer cacheMu.Unlock()
	if a, ok := archetypeCache[slug]; ok {
		return a, nil
	}
	path := filepath.Join(contentRoot(), slug, "levels.yaml")
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var a Archetype
	if err := yaml.Unmarshal(data, &a); err != nil {
		return nil, err
	}
	if a.Slug == "" {
		a.Slug = slug
	}
	archetypeCache[slug] = &a
	return &a, nil
}

func listArchetypes() []map[string]string {
	root := contentRoot()
	entries, _ := os.ReadDir(root)
	out := []map[string]string{}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		if a, err := loadArchetype(e.Name()); err == nil {
			out = append(out, map[string]string{
				"slug": a.Slug, "name": a.Name, "starting_monolith": a.StartingMonolith,
			})
		}
	}
	return out
}

func originCode(a *Archetype) string {
	if a.OriginCode == "" {
		return ""
	}
	path := filepath.Join(contentRoot(), a.OriginCode)
	if data, err := os.ReadFile(path); err == nil {
		return string(data)
	}
	return ""
}
