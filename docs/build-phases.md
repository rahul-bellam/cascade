# Build Phases — From Zero to Production

> *"How to build Cascade from an empty directory to a live, production-ready web application."*

**Version:** 1.0  
**Total Estimated Time:** 28-36 weeks (single full-stack engineer)  
**Team Mode:** 14-18 weeks (3 engineers: 1 frontend, 1 backend, 1 content/engine)

---

## Phase 0: Foundation (Weeks 1-2)

**Goal:** Empty directory → running local dev environment with one end-to-end flow.

### Step 0.1: Repo Init & File Structure

```bash
mkdir cascade && cd cascade
git init
git config user.email "team@cascade.dev"
git config user.name "Cascade Team"

# Create top-level directories
mkdir -p frontend/src/{components,pages,hooks,styles,lib}
mkdir -p services/{auth,user,content,learn-engine,constraint-engine,refactor-engine,cascade-engine,arena-engine,simulation}
mkdir -p content/{lessons,constraints,codebases,dags,solutions}
mkdir -p docs scripts tests .github/workflows

# Create root files
touch README.md LICENSE .gitignore .env.example docker-compose.yml Makefile

# Initial commit
git add -A && git commit -m "chore: init repo structure"
```

### Step 0.2: .gitignore

```gitignore
node_modules/
.next/
__pycache__/
*.pyc
.env
.venv/
vendor/
*.log
dist/
build/
*.egg-info/
.pytest_cache/
.ruff_cache/
.mypy_cache/
*.tfstate
*.tfstate.backup
```

### Step 0.3: Docker Compose (Local Dev)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: cascade
      POSTGRES_PASSWORD: cascade_dev
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7
    ports: ["6379:6379"]

  minio:
    image: minio/minio
    ports: ["9000:9000", "9001:9001"]
    command: server /data --console-address ":9001"

volumes: {pgdata:}
```

### Step 0.4: Frontend Bootstrap

```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --eslint
npm install react-flow-renderer @monaco-editor/react recharts d3
npm install zustand @tanstack/react-query
```

### Step 0.5: Backend Bootstrap

```bash
# Go services
cd services/auth && go mod init github.com/cascade/auth
cd services/user && go mod init github.com/cascade/user
cd services/constraint-engine && go mod init github.com/cascade/constraint-engine
cd services/arena-engine && go mod init github.com/cascade/arena-engine

# Python services
cd services/learn-engine && python -m venv .venv && pip install fastapi uvicorn pytest
cd services/cascade-engine && python -m venv .venv && pip install fastapi uvicorn pytest astor networkx
cd services/refactor-engine && python -m venv .venv && pip install fastapi uvicorn pytest astor networkx radon
```

### Step 0.6: First End-to-End Test

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Start auth service
cd services/auth && go run . &

# 3. Start frontend
cd frontend && npm run dev &

# 4. Verify: curl http://localhost:3000 -> 200 OK
# 5. Verify: curl http://localhost:8081/health -> 200 OK
# 6. Commit
git add -A && git commit -m "feat: local dev environment with Docker, Next.js, Go, Python"
```

**Phase 0 Deliverables:**
- [x] Repository with directory structure
- [x] Docker Compose for PostgreSQL, Redis, MinIO
- [x] Next.js frontend skeleton
- [x] Go services with module init
- [x] Python services with virtual envs
- [x] Local dev environment running end-to-end

---

## Phase 1: Learn Mode MVP (Weeks 3-5)

**Goal:** Users can take a lesson, write a code snippet, get it evaluated, and save it to their toolkit.

### Step 1.1: Database Schema

```sql
-- Run in PostgreSQL
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    elo_rating INT DEFAULT 1000,
    reputation_points INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    prerequisite_slugs TEXT[] DEFAULT '{}',
    estimated_minutes INT DEFAULT 10,
    concept_content JSONB NOT NULL,
    snippet_prompt TEXT NOT NULL,
    snippet_starter_code TEXT NOT NULL,
    snippet_test_cases JSONB NOT NULL,
    hint_levels JSONB NOT NULL,
    toolkit_key VARCHAR(100),
    order_index INT NOT NULL
);

CREATE TABLE lesson_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    lesson_id UUID REFERENCES lessons(id),
    snippet_code TEXT NOT NULL,
    tests_passed INT DEFAULT 0,
    tests_total INT NOT NULL,
    hints_used INT DEFAULT 0,
    completed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_toolkit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    toolkit_key VARCHAR(100) NOT NULL,
    code TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Step 1.2: Learn Engine (Python/FastAPI)

```python
# services/learn-engine/app.py
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
import ast, sys, io, contextlib, subprocess, tempfile, os

app = FastAPI(title="Learn Engine")

class Submission(BaseModel):
    lesson_slug: str
    user_id: str
    code: str
    hint_level_requested: int = 0

@app.post("/lessons/{slug}/submit")
def submit_lesson(slug: str, sub: Submission):
    lesson = get_lesson_from_db(slug)  # fetches JSONB
    test_cases = lesson["snippet_test_cases"]
    
    results = []
    for tc in test_cases:
        passed, output = run_code_in_sandbox(sub.code, tc)
        results.append({"name": tc["name"], "passed": passed, "output": output})
    
    return {
        "passed": all(r["passed"] for r in results),
        "results": results,
        "tests_passed": sum(1 for r in results if r["passed"]),
        "tests_total": len(results)
    }

def run_code_in_sandbox(code: str, test_case: dict) -> tuple[bool, str]:
    """Execute user code in a restricted sandbox (gVisor in prod, subprocess in dev)."""
    # Dev mode: subprocess with timeout
    with tempfile.NamedTemporaryFile(suffix='.py', mode='w', delete=False) as f:
        f.write(code + "\n\n" + test_case.get("setup", ""))
        f.write(f"\nresult = {test_case['call']}")
    
    try:
        result = subprocess.run(
            ["python3", f.name],
            capture_output=True, text=True, timeout=5
        )
        return result.stdout.strip() == str(test_case["expected"]), result.stdout
    except subprocess.TimeoutExpired:
        return False, "Execution timed out (>5s)"
    finally:
        os.unlink(f.name)
```

### Step 1.3: Lesson Content (YAML → DB Seed)

```yaml
# content/lessons/caching-redis.yaml
slug: caching-redis
title: "Caching with Redis"
prerequisites: []
estimated_minutes: 10
toolkit_key: cache_with_redis

concept:
  - type: text
    body: "Caching stores frequently accessed data in memory..."
  - type: viz
    id: cache-aside-animation
  - type: code_block
    language: python
    code: |
      def get_cached(key, fetch_fn, ttl):
          data = redis.get(key)
          if data:
              return data
          data = fetch_fn()
          redis.setex(key, ttl, data)
          return data

snippet:
  prompt: "Implement getCached(key, fetchFn, ttl)..."
  starter_code: |
    def getCached(key, fetchFn, ttl):
        pass
  test_cases:
    - name: "Returns cached value"
      setup: "redis.set('test_key', 'cached_value')"
      call: "getCached('test_key', lambda: 'new_value', 60)"
      expected: "cached_value"
    - name: "Calls fetchFn on miss"
      setup: "redis.delete('test_key')"
      call: "getCached('test_key', lambda: 'fresh_value', 60)"
      expected: "fresh_value"
  hints:
    - level: 1
      text: "Check if the key exists in Redis first."
    - level: 2
      text: "Use redis.get() to read and redis.setex() to write with TTL."
    - level: 3
      text: "Pattern: check cache → on miss → fetch → store with TTL → return"
```

### Step 1.4: Frontend Lesson Player

```tsx
// frontend/src/components/learn/LessonPlayer.tsx
import { useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { ConceptPanel } from './ConceptPanel';
import { TestResults } from './TestResults';

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const [code, setCode] = useState(lesson.snippet_starter_code);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [hintsRevealed, setHintsRevealed] = useState(0);

  const handleSubmit = async () => {
    const res = await fetch(`/api/lessons/${lesson.slug}/submit`, {
      method: 'POST',
      body: JSON.stringify({ code })
    });
    setResults(await res.json());
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-screen">
      <ConceptPanel lesson={lesson} />
      <div className="flex flex-col">
        <MonacoEditor
          language="python"
          value={code}
          onChange={(v) => setCode(v || '')}
          options={{ minimap: false }}
        />
        <div className="flex gap-2 p-2">
          <button onClick={handleSubmit}>▶ Run</button>
          <button onClick={() => setHintsRevealed(h => Math.min(h + 1, 3))}>
            💡 Hint ({hintsRevealed}/3)
          </button>
        </div>
        {results && <TestResults results={results} />}
      </div>
    </div>
  );
}
```

### Step 1.5: Commit

```bash
git add -A && git commit -m "feat: Learn Mode MVP — lesson player, snippet runner, toolkit"
```

**Phase 1 Deliverables:**
- [x] PostgreSQL schema for users, lessons, completions, toolkit
- [x] Learn Engine (Python/FastAPI) — executes code snippets in sandbox
- [x] Lesson content format (YAML) + seed script
- [x] Frontend lesson player with Monaco Editor
- [x] 3 hint levels per lesson
- [x] Toolkit saves successful snippets

---

## Phase 2: Constraint Unlock MVP (Weeks 6-8)

**Goal:** Users can take a monolith, scale it through 3 levels with real-time performance feedback.

### Step 2.1: Constraint Engine (Go)

```go
// services/constraint-engine/main.go
package main

import (
    "encoding/json"
    "net/http"
    "github.com/docker/docker/client"
)

type ConstraintLevel struct {
    Level       int    `json:"level"`
    Title       string `json:"title"`
    Impact      string `json:"impact"`
    TargetRPS   int    `json:"target_rps"`
    LatencySLA  int    `json:"latency_sla_ms"`
}

type SimulationResult struct {
    Passed       bool    `json:"passed"`
    P50Latency   float64 `json:"p50_latency"`
    P99Latency   float64 `json:"p99_latency"`
    ErrorRate    float64 `json:"error_rate"`
    Throughput   int     `json:"throughput"`
    FailureReason string `json:"failure_reason,omitempty"`
}

func runSimulation(code string, arch Architecture, level ConstraintLevel) SimulationResult {
    // 1. Build Docker image with user's code
    // 2. Spawn container
    // 3. Run k6 load test at TargetRPS
    // 4. Parse metrics from k6 output
    // 5. Tear down container
    // 6. Return result
    cli, _ := client.NewClientWithOpts(client.FromEnv)
    // ... Docker SDK logic
    return SimulationResult{}
}

func main() {
    http.HandleFunc("/constraint/start", handleStartSession)
    http.HandleFunc("/constraint/submit", handleSubmitFix)
    http.ListenAndServe(":8094", nil)
}
```

### Step 2.2: Starting Monolith Template

```python
# content/constraints/url-shortener/origin.py
# A working URL shortener that handles ~10 req/min on a single server.
# It works. It's simple. It's wrong for production.

import redis
from flask import Flask, request, redirect
import string, random

app = Flask(__name__)
urls = {}  # 🚩 Concern #21: No cache — in-memory only, lost on restart
cache = redis.Redis(host='localhost', port=6379)

@app.route('/shorten', methods=['POST'])
def shorten():
    long_url = request.json['url']
    short = ''.join(random.choices(string.ascii_letters + string.digits, k=6))
    urls[short] = long_url  # 🚩 Concern #24: No TTL — keys grow forever
    return {'short': short, 'long': long_url}

@app.route('/<short>')
def redirect_url(short):
    long_url = urls.get(short)  # 🚩 Concern #44: N+1 — every redirect is a dict lookup
    if long_url:
        return redirect(long_url, 302)
    return {'error': 'not found'}, 404

if __name__ == '__main__':
    app.run(port=5000)
```

### Step 2.3: Constraint Levels Definition

```yaml
# content/constraints/url-shortener/levels.yaml
archetype: url_shortener
starting_monolith: "Single Flask server, in-memory dict, 10 req/min"

constraints:
  - level: 1
    title: "10x more users — 100 req/min"
    impact: "Response time spikes. Users complain of slow redirects."
    target_rps: 100
    latency_sla_ms: 200
    change_type: caching
    hints:
      - "What metric is spiking? (Response time)"
      - "What component reduces response time? (A cache)"
      - "Add Redis caching for the URL mappings. See your Toolkit for `cache_with_redis`."

  - level: 2
    title: "100x more users — 1,000 req/min"
    impact: "DB connection pool exhausted. Some requests fail entirely."
    target_rps: 1000
    latency_sla_ms: 500
    change_type: connection_pooling + replicas

  - level: 3
    title: "1000x more users — 10,000 req/min"
    impact: "Single server at 100% CPU. Throughput flatlines."
    target_rps: 10000
    latency_sla_ms: 500
    change_type: horizontal_scaling + lb
```

### Step 2.4: Frontend — Architecture Canvas + Metrics

```tsx
// frontend/src/components/constraint/ConstraintSession.tsx
import { ReactFlow, useNodesState } from 'react-flow-renderer';
import { MetricsDashboard } from './MetricsDashboard';
import MonacoEditor from '@monaco-editor/react';

export function ConstraintSession({ archetype }: { archetype: string }) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [code, setCode] = useState(originCode);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const handleSubmit = async () => {
    const res = await fetch('/api/constraint/submit', {
      method: 'POST',
      body: JSON.stringify({
        archetype,
        level: currentLevel,
        code,
        architecture: { nodes }
      })
    });
    const result = await res.json();
    setMetrics(result.metrics);
    if (result.passed) setCurrentLevel(l => l + 1);
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-screen">
      <ReactFlow nodes={nodes} onNodesChange={onNodesChange}>
        <div className="h-full">
          <MonacoEditor value={code} onChange={setCode} />
        </div>
      </ReactFlow>
      <MetricsDashboard metrics={metrics} level={currentLevel} />
    </div>
  );
}
```

### Step 2.5: Commit

```bash
git add -A && git commit -m "feat: Constraint Unlock MVP — monolith scaling with real-time metrics"
```

**Phase 2 Deliverables:**
- [x] Constraint Engine (Go) — Docker-based simulation with k6
- [x] Starting monolith template (url-shortener)
- [x] 3 constraint levels (10x, 100x, 1000x users)
- [x] Architecture canvas (React Flow) for diagramming fixes
- [x] Real-time metrics dashboard (p50, p99, error rate, throughput)
- [x] Level progression (pass → next level)

---

## Phase 3: Cascade Engine MVP (Weeks 9-11)

**Goal:** The DAG walker works. Users experience chain-reaction failures for one topic.

### Step 3.1: Cascade Engine Core (Python)

```python
# services/cascade-engine/engine.py
import yaml, random, re

class CascadeEngine:
    def __init__(self, archetype_slug: str):
        with open(f"content/dags/{archetype_slug}.yaml") as f:
            self.dag = yaml.safe_load(f)
        self.current_node_id = "origin"
        self.history = []
    
    def get_current_issue(self) -> dict:
        node = self._get_node(self.current_node_id)
        return {
            "id": node["id"],
            "description": node["description"],
            "severity": node.get("severity", "info"),
            "category": node.get("category", "general"),
            "hints": node.get("hints", []),
            "is_terminal": node["type"] == "terminal"
        }
    
    def submit_fix(self, code_diff: str, architecture_changes: list) -> dict:
        if self._is_terminal():
            return {"status": "already_complete"}
        
        # 1. Analyze the fix
        fix_signature = self._analyze_fix(code_diff, architecture_changes)
        
        # 2. Walk the DAG
        current_node = self._get_node(self.current_node_id)
        next_node = self._select_next(current_node, fix_signature)
        
        # 3. Update state
        self.history.append({
            "from": self.current_node_id,
            "to": next_node["id"],
            "fix_signature": fix_signature
        })
        self.current_node_id = next_node["id"]
        
        return {
            "previous_issue": self.history[-1]["from"],
            "fix_accepted": True,
            "new_issue": self.get_current_issue(),
            "chain_depth": len(self.history),
            "is_terminal": self._is_terminal()
        }
    
    def _analyze_fix(self, code_diff: str, arch_changes: list) -> list:
        """Detect what the user changed based on code and architecture."""
        signatures = []
        
        # Code-level detection
        if re.search(r'Redis|redis|\.get\(|\.setex\(', code_diff):
            signatures.append('redis')
        if re.search(r'Sentinel|sentinel|replica|failover', code_diff):
            signatures.append('sentinel')
        if re.search(r'INCR|incr|Lua|lua|script|atomic', code_diff):
            signatures.append('atomic')
        if re.search(r'bloom|BloomFilter|probabilistic', code_diff):
            signatures.append('probabilistic')
        if re.search(r'TTL|ttl|expire|EXPIRE', code_diff):
            signatures.append('ttl')
        if re.search(r'circuit|CircuitBreaker|fallback', code_diff):
            signatures.append('circuit')
        
        # Architecture-level detection
        for change in arch_changes:
            if change['type'] == 'add_component':
                signatures.append(change['component'])
        
        return signatures
    
    def _select_next(self, node: dict, fix_sig: list) -> dict:
        """Walk transitions and pick the next node based on fix signature."""
        valid = []
        for t in node.get("transitions", []):
            if self._evaluate_condition(t["condition"], fix_sig):
                valid.append(t)
        
        if not valid:
            valid = node.get("transitions", [{"to": "terminal_fail", "weight": 1.0}])
        
        # Weighted random selection
        weights = [t.get("weight", 1.0) for t in valid]
        chosen = random.choices(valid, weights=weights, k=1)[0]
        
        return self._get_node(chosen["to"])
    
    def _evaluate_condition(self, condition: str, fix_sig: list) -> bool:
        """Evaluate simple condition expressions."""
        # AND logic
        if "AND" in condition:
            parts = condition.split("AND")
            return all(self._eval_single(p.strip(), fix_sig) for p in parts)
        # OR logic
        elif "OR" in condition:
            parts = condition.split("OR")
            return any(self._eval_single(p.strip(), fix_sig) for p in parts)
        else:
            return self._eval_single(condition, fix_sig)
    
    def _eval_single(self, cond: str, fix_sig: list) -> bool:
        cond = cond.strip()
        if cond.startswith("fix_contains("):
            key = cond.split("'")[1]
            return key in fix_sig
        elif cond == "fix_empty()":
            return len(fix_sig) == 0
        elif cond.startswith("NOT fix_contains("):
            key = cond.split("'")[1]
            return key not in fix_sig
        return False
```

### Step 3.2: DAG Validation

```python
# scripts/validate-dags.py
import yaml, sys

def validate_dag(path: str):
    with open(path) as f:
        dag = yaml.safe_load(f)
    
    node_ids = {n["id"] for n in dag["nodes"]}
    errors = []
    
    for node in dag["nodes"]:
        if node["type"] == "starting_state" and not node.get("transitions"):
            errors.append(f"Starting state '{node['id']}' has no transitions")
        
        for t in node.get("transitions", []):
            if t["to"] not in node_ids:
                errors.append(f"Transition to '{t['to']}' from '{node['id']}' references non-existent node")
            if "condition" not in t:
                errors.append(f"Transition from '{node['id']}' missing condition")
    
    terminals = [n["id"] for n in dag["nodes"] if n["type"] == "terminal"]
    if not terminals:
        errors.append("DAG has no terminal nodes")
    
    if errors:
        for e in errors:
            print(f"  ❌ {e}")
        return False
    
    print(f"  ✅ DAG valid: {len(node_ids)} nodes, {len(terminals)} terminals")
    return True

if __name__ == "__main__":
    import glob
    all_valid = all(validate_dag(p) for p in glob.glob("content/dags/*.yaml"))
    sys.exit(0 if all_valid else 1)
```

### Step 3.3: Cascade Session API

```python
# services/cascade-engine/app.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from engine import CascadeEngine

app = FastAPI()
sessions = {}  # In-memory for MVP; Redis in production

class SubmitFixRequest(BaseModel):
    session_id: str
    code_diff: str
    architecture_changes: list

@app.post("/cascade/start/{archetype}")
def start_session(archetype: str, user_id: str):
    engine = CascadeEngine(archetype)
    session_id = str(uuid.uuid4())
    sessions[session_id] = engine
    return {
        "session_id": session_id,
        "issue": engine.get_current_issue()
    }

@app.post("/cascade/submit")
def submit_fix(req: SubmitFixRequest):
    engine = sessions.get(req.session_id)
    if not engine:
        raise HTTPException(404, "Session not found")
    return engine.submit_fix(req.code_diff, req.architecture_changes)

@app.get("/cascade/{session_id}/hints")
def get_hints(session_id: str):
    engine = sessions.get(session_id)
    return {"hints": engine.get_current_issue().get("hints", [])}
```

### Step 3.4: Commit

```bash
git add -A && git commit -m "feat: Cascade Engine MVP — DAG walker, fix analyzer, weighted transitions"
```

**Phase 3 Deliverables:**
- [x] Cascade Engine (Python) — DAG walker with fix analysis
- [x] Condition evaluation (AND/OR/NOT/fix_contains/fix_empty)
- [x] Weighted random transitions (roguelike variety)
- [x] DAG validation script
- [x] Session management API
- [x] 3-level hint system

---

## Phase 4: Blind Refactor MVP (Weeks 12-14)

**Goal:** Users can explore, diagnose, and refactor a spaghetti codebase with dependency visualization.

### Step 4.1: Dependency Mapper

```python
# services/refactor-engine/dep_mapper.py
import ast, os
from collections import defaultdict

class DependencyMapper:
    def map_codebase(self, root_path: str) -> dict:
        """Analyze a Python codebase and return dependency graph."""
        graph = {
            "files": {},
            "imports": [],
            "functions": [],
            "global_state": [],
            "metrics": {}
        }
        
        for dirpath, _, filenames in os.walk(root_path):
            for fn in filenames:
                if not fn.endswith('.py'):
                    continue
                filepath = os.path.join(dirpath, fn)
                with open(filepath) as f:
                    tree = ast.parse(f.read())
                
                file_info = {
                    "path": filepath,
                    "functions": [],
                    "imports": [],
                    "global_vars": [],
                    "lines": len(f.read().splitlines())
                }
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        file_info["functions"].append(node.name)
                        # Check function complexity
                        stmt_count = len(node.body)
                        if stmt_count > 50:
                            graph["metrics"].setdefault("god_functions", []).append(node.name)
                    
                    elif isinstance(node, ast.Import):
                        for alias in node.names:
                            file_info["imports"].append(alias.name)
                            graph["imports"].append((filepath, alias.name))
                    
                    elif isinstance(node, ast.Assign):
                        if isinstance(node.targets[0], ast.Name) and \
                           isinstance(node.targets[0].ctx, ast.Store):
                            if isinstance(node.parent, ast.Module):
                                file_info["global_vars"].append(node.targets[0].id)
                                graph["global_state"].append({
                                    "file": filepath,
                                    "var": node.targets[0].id
                                })
                
                graph["files"][filepath] = file_info
        
        # Compute coupling metrics
        graph["metrics"]["total_files"] = len(graph["files"])
        graph["metrics"]["total_functions"] = sum(
            len(f["functions"]) for f in graph["files"].values()
        )
        graph["metrics"]["total_global_state"] = len(graph["global_state"])
        graph["metrics"]["god_functions"] = list(set(
            graph["metrics"].get("god_functions", [])
        ))
        
        return graph
```

### Step 4.2: Frontend — Codebase Explorer

```tsx
// frontend/src/components/refactor/CodebaseExplorer.tsx
import { useState, useEffect } from 'react';
import { ForceGraph2D } from 'react-force-graph';
import MonacoEditor from '@monaco-editor/react';

export function CodebaseExplorer({ sessionId }: { sessionId: string }) {
  const [depGraph, setDepGraph] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');

  useEffect(() => {
    fetch(`/api/refactor/${sessionId}/deps`)
      .then(r => r.json())
      .then(setDepGraph);
  }, [sessionId]);

  const handleFileSelect = async (path: string) => {
    setSelectedFile(path);
    const res = await fetch(`/api/refactor/${sessionId}/file?path=${path}`);
    const data = await res.json();
    setFileContent(data.content);
  };

  if (!depGraph) return <div>Analyzing codebase...</div>;

  return (
    <div className="grid grid-cols-3 gap-4 h-screen">
      {/* File tree */}
      <div className="overflow-auto border-r">
        {Object.keys(depGraph.files).map(path => (
          <div
            key={path}
            onClick={() => handleFileSelect(path)}
            className={`p-2 cursor-pointer hover:bg-gray-100 ${
              selectedFile === path ? 'bg-blue-100' : ''
            }`}
          >
            📄 {path.split('/').pop()}
            <span className="text-xs text-gray-500 ml-2">
              {depGraph.files[path].functions.length} fn
            </span>
          </div>
        ))}
      </div>

      {/* Dependency graph visualization */}
      <div className="border-r">
        <ForceGraph2D
          graphData={depGraph}
          nodeLabel="id"
          nodeColor={n => n.high_coupling ? '#ef4444' : '#22c55e'}
          width={400}
          height={600}
        />
      </div>

      {/* Code editor */}
      <div>
        <MonacoEditor
          language="python"
          value={fileContent}
          onChange={(v) => setFileContent(v || '')}
          options={{ minimap: false }}
        />
      </div>
    </div>
  );
}
```

### Step 4.3: Spaghetti Codebase Template

```python
# content/codebases/payment-monolith/main.py
# 🚩 CONCERN #186: No authentication on internal APIs
# 🚩 CONCERN #191: SQL injection via raw queries
# 🚩 CONCERN #143: Database credentials hardcoded
# 🚩 CONCERN #44: N+1 queries in payment processing
# 🚩 CONCERN #41: New database connection per request
# 🚩 CONCERN #60: No soft deletes — hard delete on cancel

import sqlite3
from flask import Flask, request
from datetime import datetime

app = Flask(__name__)

# 🚩 #143: Hardcoded credentials
DB_PATH = "/data/payments.db"

def get_db():
    # 🚩 #41: New connection every time — no pooling
    conn = sqlite3.connect(DB_PATH)
    return conn

@app.route('/api/charge', methods=['POST'])
def charge():
    user_id = request.json['user_id']
    amount = request.json['amount']
    
    # 🚩 #191: SQL injection via f-string
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"SELECT balance FROM users WHERE id = '{user_id}'")
    user = cursor.fetchone()
    
    if user and user[0] >= amount:
        # 🚩 #44: Two separate queries instead of one
        cursor.execute(f"UPDATE users SET balance = {user[0] - amount} WHERE id = '{user_id}'")
        cursor.execute(f"INSERT INTO transactions (user_id, amount) VALUES ('{user_id}', {amount})")
        conn.commit()
        return {"status": "success", "new_balance": user[0] - amount}
    else:
        return {"status": "error", "message": "Insufficient funds"}, 402

@app.route('/api/user/<user_id>', methods=['GET'])
def get_user(user_id):
    # 🚩 #191: SQL injection again
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM users WHERE id = '{user_id}'")
    user = cursor.fetchone()
    
    # 🚩 #48: SELECT * — returns all columns including password_hash
    return {
        "id": user[0],
        "email": user[1],
        "name": user[2],
        "balance": user[3]
        # 🚩 #11: Accidentally exposing password_hash would be here
    }

@app.route('/api/user/<user_id>/cancel', methods=['POST'])
def cancel_user(user_id):
    # 🚩 #60: Hard delete — can't recover
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"DELETE FROM users WHERE id = '{user_id}'")
    conn.commit()
    return {"status": "deleted"}

@app.route('/api/refund/<transaction_id>', methods=['POST'])
def refund(transaction_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM transactions WHERE id = '{transaction_id}'")
    txn = cursor.fetchone()
    
    if txn:
        # 🚩 #9: No idempotency key — refunding twice refunds twice
        cursor.execute(f"UPDATE users SET balance = balance + {txn[2]} WHERE id = '{txn[1]}'")
        cursor.execute(f"DELETE FROM transactions WHERE id = '{transaction_id}'")
        conn.commit()
        return {"status": "refunded"}
    return {"status": "not_found"}, 404

# 🚩 #217: Everything runs inline — no job queue for async tasks
@app.route('/api/batch-payout', methods=['POST'])
def batch_payout():
    """Processes payouts for all merchants. Blocks the HTTP request for up to 5 minutes."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, balance FROM users WHERE role = 'merchant'")
    merchants = cursor.fetchall()
    
    for merchant_id, balance in merchants:
        # 🚩 #44: N+1 — one query per merchant
        cursor.execute(f"UPDATE users SET balance = 0 WHERE id = '{merchant_id}'")
        cursor.execute(f"INSERT INTO transactions (user_id, amount) VALUES ('{merchant_id}', {balance})")
    
    conn.commit()
    return {"status": "processed", "count": len(merchants)}

if __name__ == '__main__':
    # 🚩 #126: No graceful shutdown — SIGTERM kills in-flight requests
    app.run(port=5000, debug=True)
```

### Step 4.4: New Requirement Injector

```python
# services/refactor-engine/requirements.py
import random

class RequirementInjector:
    def __init__(self, scenario_id: str):
        self.requirements = {
            "payment-monolith": {
                "title": "Add Fraud Detection",
                "description": "The business needs real-time fraud detection before processing payments. " \
                    "This involves checking transaction velocity, geographic anomalies, and device fingerprinting. " \
                    "If flagged, the transaction enters manual review queue instead of processing.",
                "accommodation_easy": [
                    "Extracted a separate FraudDetectionService",
                    "Communicates asynchronously via queue",
                    "Added <50 lines to accommodate"
                ],
                "accommodation_hard": [
                    "Still in the monolith — all logic in charge()",
                    "Adds 200+ lines of nested if-statements",
                    "Makes the god function even worse"
                ]
            },
            "ecommerce-spaghetti": {
                "title": "Add Real-Time Inventory Tracking",
                "description": "Inventory must update in real-time across all surfaces (cart, PDP, search). " \
                    "When an item is low-stock, a badge must appear within 2 seconds.",
            },
            "chat-app-legacy": {
                "title": "Add Message Search",
                "description": "Users need full-text search across their message history. " \
                    "Must support partial matches, date filters, and sort by relevance."
            }
        }
    
    def get_requirement(self, scenario_id: str) -> dict:
        return self.requirements.get(scenario_id, {
            "title": "Add a New Feature",
            "description": "The PM just dropped a new requirement. Good luck."
        })
    
    def evaluate_accommodation(self, codebase_after_refactor: dict) -> dict:
        """Score how well the refactored architecture handles the new requirement."""
        # Simple heuristic: count modules, coupling score, lines per module
        modules = codebase_after_refactor.get("modules", [])
        coupling = codebase_after_refactor.get("coupling_score", 100)
        lines_per_module = codebase_after_refactor.get("avg_lines_per_module", 500)
        
        if len(modules) >= 5 and coupling < 30 and lines_per_module < 200:
            return {"score": 90, "verdict": "Easily accommodated — clean architecture"}
        elif len(modules) >= 3 and coupling < 50:
            return {"score": 60, "verdict": "Partially accommodated — some rewiring needed"}
        else:
            return {"score": 20, "verdict": "Poorly accommodated — still spaghetti"}
```

### Step 4.5: Commit

```bash
git add -A && git commit -m "feat: Blind Refactor MVP — dependency mapper, codebase explorer, new requirement injector"
```

**Phase 4 Deliverables:**
- [x] Dependency Mapper (Python/AST) — file graph, coupling metrics, god object detection
- [x] Codebase Explorer UI — file tree + force-directed graph + code editor
- [x] Payment Monolith spaghetti codebase (7+ concerns baked in)
- [x] New Requirement Injector — drops surprise feature mid-refactor
- [x] Accommodation scoring — evaluates how well architecture handles new feature

---

## Phase 5: Arena MVP (Weeks 15-17)

**Goal:** Two users can match, duel, and get scored on their system designs.

### Step 5.1: WebSocket Duel State Machine (Go)

```go
// services/arena-engine/duel.go
package main

import (
    "sync"
    "time"
    "github.com/gorilla/websocket"
)

type DuelPhase int
const (
    PhaseMatchmaking DuelPhase = iota
    PhasePrompt
    PhaseDesign
    PhaseCode
    PhaseSimulation
    PhaseScoring
    PhaseComplete
)

type Duel struct {
    ID        string
    Archetype string
    DuelType  string // "speed", "standard", "siege", "battle_royale"
    Phase     DuelPhase
    Player1   *Player
    Player2   *Player
    StartTime time.Time
    mu        sync.Mutex
}

type Player struct {
    ID          string
    Conn        *websocket.Conn
    Code        string
    Architecture []Component
    Score       int
}

func (d *Duel) AdvancePhase() {
    d.mu.Lock()
    defer d.mu.Unlock()
    
    switch d.Phase {
    case PhasePrompt:
        d.Phase = PhaseDesign
        d.broadcast(Message{Type: "phase_change", Data: "design"})
        go d.startTimer(10 * time.Minute, PhaseCode)
        
    case PhaseDesign:
        d.Phase = PhaseCode
        d.broadcast(Message{Type: "phase_change", Data: "code"})
        go d.startTimer(25 * time.Minute, PhaseSimulation)
        
    case PhaseCode:
        d.Phase = PhaseSimulation
        d.broadcast(Message{Type: "simulation_start"})
        go d.runSimulation()
        
    case PhaseSimulation:
        d.Phase = PhaseScoring
        scores := d.calculateScores()
        d.broadcast(Message{Type: "scores", Data: scores})
        
    case PhaseScoring:
        d.Phase = PhaseComplete
        d.broadcast(Message{Type: "duel_complete"})
    }
}

func (d *Duel) calculateScores() map[string]int {
    // Multi-dimensional scoring
    scores := map[string]int{}
    for _, p := range []*Player{d.Player1, d.Player2} {
        score := 0
        score += p.SimulationResult.SurvivalTime * 3   // weight 3
        score += (1000 - p.SimulationResult.P50Latency) * 2 // weight 2
        score += (1000 - p.SimulationResult.P99Latency) * 2 // weight 2
        score += p.SimulationResult.Throughput          // weight 1
        score += (5000 - p.SimulationResult.CostMonthly) // weight 1
        scores[p.ID] = score
    }
    return scores
}
```

### Step 5.2: Matchmaking

```go
// services/arena-engine/matchmaking.go
package main

import (
    "math"
    "github.com/redis/go-redis/v9"
)

type Matchmaker struct {
    redis *redis.Client
}

func (m *Matchmaker) JoinQueue(userID string, elo int) {
    m.redis.ZAdd(ctx, "arena:queue", redis.Z{
        Score:  float64(elo),
        Member: userID,
    })
}

func (m *Matchmaker) FindMatch(userID string, elo int) *string {
    // Find closest ELO match within ±200
    candidates, _ := m.redis.ZRangeByScore(ctx, "arena:queue", &redis.ZRangeBy{
        Min: fmt.Sprintf("%d", elo-200),
        Max: fmt.Sprintf("%d", elo+200),
    }).Result()
    
    var bestMatch *string
    bestDiff := 999
    
    for _, c := range candidates {
        if c == userID { continue }
        cElo, _ := m.redis.ZScore(ctx, "arena:queue", c).Result()
        diff := math.Abs(cElo - float64(elo))
        if diff < float64(bestDiff) {
            bestDiff = int(diff)
            bestMatch = &c
        }
    }
    
    return bestMatch
}
```

### Step 5.3: Arena Frontend

```tsx
// frontend/src/components/arena/ArenaDuel.tsx
import { useEffect, useState, useRef } from 'react';
import useWebSocket from 'react-use-websocket';

export function ArenaDuel({ duelId, playerId }: { duelId: string, playerId: string }) {
  const [phase, setPhase] = useState('matchmaking');
  const [timeLeft, setTimeLeft] = useState(0);
  const [code, setCode] = useState('');
  const [opponentProgress, setOpponentProgress] = useState('');
  const [scores, setScores] = useState(null);
  const [metrics, setMetrics] = useState(null);
  
  const ws = useWebSocket(`wss://api.cascade.dev/arena/${duelId}`, {
    onMessage: (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'phase_change':
          setPhase(msg.data);
          break;
        case 'timer':
          setTimeLeft(msg.seconds);
          break;
        case 'opponent_progress':
          setOpponentProgress(msg.data);
          break;
        case 'simulation_tick':
          setMetrics(msg.data);
          break;
        case 'scores':
          setScores(msg.data);
          break;
      }
    }
  });

  const submitCode = () => {
    ws.sendMessage(JSON.stringify({ type: 'code_update', code }));
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-screen">
      {/* Player's side */}
      <div>
        <div className="flex justify-between p-2 bg-gray-100">
          <span>Phase: {phase}</span>
          <span>Time: {Math.floor(timeLeft / 60)}:{timeLeft % 60}</span>
        </div>
        <MonacoEditor value={code} onChange={setCode} />
        <button onClick={submitCode}>Submit</button>
      </div>

      {/* Opponent's side — live metrics */}
      <div>
        <div className="p-2 bg-gray-100">
          Opponent: {opponentProgress === 'submitted' ? '✅ Submitted' : '⏳ Coding...'}
        </div>
        {metrics && (
          <div>
            <p>p50: {metrics.p50}ms</p>
            <p>p99: {metrics.p99}ms</p>
            <p>Throughput: {metrics.rps} req/s</p>
          </div>
        )}
        {scores && (
          <div className="p-4 bg-green-100">
            <h2>🎉 Results</h2>
            <p>Your score: {scores[playerId]}</p>
            <p>Opponent: {scores[playerId === 'p1' ? 'p2' : 'p1']}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 5.4: Commit

```bash
git add -A && git commit -m "feat: Arena MVP — WebSocket duel state machine, ELO matchmaking, multi-dimensional scoring"
```

**Phase 5 Deliverables:**
- [x] WebSocket duel state machine (Go) — 6 phases
- [x] ELO-based matchmaking via Redis sorted sets
- [x] Multi-dimensional scoring (survival ×3, latency ×2, throughput ×1, cost ×1)
- [x] Arena frontend — split-screen with opponent progress
- [x] Real-time simulation metrics during battle

---

## Phase 6: League System (Weeks 18-19)

**Goal:** Weekly themed contests with divisions, promotion/relegation.

### Step 6.1: League Engine (Go)

```go
// services/arena-engine/league.go
package main

import (
    "time"
    "github.com/redis/go-redis/v9"
)

type LeagueEngine struct {
    redis *redis.Client
}

func (l *LeagueEngine) CreateSeason(name string, weeks int) Season {
    season := Season{
        ID:        generateID(),
        Name:      name,
        StartDate: time.Now(),
        EndDate:   time.Now().AddDate(0, 0, weeks * 7),
        WeekCount: weeks,
    }
    // Store in PostgreSQL
    return season
}

func (l *LeagueEngine) GetStandings(seasonID string, division string) []Standing {
    key := fmt.Sprintf("league:%s:%s", seasonID, division)
    results, _ := l.redis.ZRevRangeWithScores(ctx, key, 0, 99).Result()
    
    standings := []Standing{}
    for i, r := range results {
        standings = append(standings, Standing{
            Rank:   i + 1,
            UserID: r.Member.(string),
            Points: int(r.Score),
        })
    }
    return standings
}

func (l *LeagueEngine) ProcessPromotionRelegation(seasonID string) {
    for _, div := range []string{"bronze", "silver", "gold"} {
        standings := l.GetStandings(seasonID, div)
        
        // Top 10 advance
        for _, s := range standings[:10] {
            l.PromoteUser(s.UserID, div)
        }
        // Bottom 10 relegate
        for _, s := range standings[len(standings)-10:] {
            l.RelegateUser(s.UserID, div)
        }
    }
}
```

### Step 6.2: Commit

```bash
git add -A && git commit -m "feat: League System — seasons, divisions, standings, promotion/relegation"
```

---

## Phase 7: Auth, Database Migrations, & CI/CD (Weeks 20-21)

**Goal:** Production-hardening — auth, real persistence, CI/CD pipelines.

### Step 7.1: Auth Service

```go
// services/auth/main.go
package main

import (
    "github.com/golang-jwt/jwt/v5"
    "golang.org/x/crypto/bcrypt"
)

func register(email, password string) error {
    hash, _ := bcrypt.GenerateFromPassword([]byte(password), 12)
    _, err := db.Exec("INSERT INTO users (email, password_hash) VALUES ($1, $2)", email, hash)
    return err
}

func login(email, password string) (string, error) {
    var hash string
    db.QueryRow("SELECT password_hash FROM users WHERE email = $1", email).Scan(&hash)
    
    if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
        return "", ErrInvalidCredentials
    }
    
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "sub": email,
        "exp": time.Now().Add(24 * time.Hour).Unix(),
    })
    return token.SignedString([]byte(os.Getenv("JWT_SECRET")))
}
```

### Step 7.2: Database Migrations

```bash
# scripts/migrations/
# 001_create_users.sql
# 002_create_lessons.sql
# 003_create_cascade_sessions.sql
# 004_create_arena_duels.sql
# 005_create_league_seasons.sql

# Migration runner
cat > scripts/run-migrations.sh << 'EOF'
#!/bin/bash
for f in scripts/migrations/*.sql; do
    echo "Running $f..."
    psql $DATABASE_URL -f "$f"
done
EOF
```

### Step 7.3: GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test-go:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: {POSTGRES_PASSWORD: test}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v4
        with: {go-version: '1.22'}
      - run: cd services/auth && go test ./...

  test-python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: '3.12'}
      - run: pip install poetry && cd services/cascade-engine && poetry install && poetry run pytest

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: {node-version: '20'}
      - run: cd frontend && npm install && npm run test

  deploy:
    needs: [test-go, test-python, test-frontend]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Production
        run: |
          echo "Deploying to production..."
          # kubectl apply, terraform apply, etc.
```

### Step 7.4: Commit

```bash
git add -A && git commit -m "feat: auth, migrations, CI/CD pipeline"
```

---

## Phase 8: Production Deployment (Weeks 22-24)

**Goal:** Live on cloud infrastructure with monitoring, scaling, and backup.

### Step 8.1: Infrastructure as Code (Terraform)

```hcl
# terraform/main.tf
provider "aws" {
  region = "us-east-1"
}

resource "aws_ecs_cluster" "cascade" {
  name = "cascade-production"
}

resource "aws_ecs_service" "api" {
  name            = "api-gateway"
  cluster         = aws_ecs_cluster.cascade.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2
  
  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.api.id]
  }
}

resource "aws_rds_cluster" "cascade" {
  engine           = "aurora-postgresql"
  engine_version   = "16.1"
  database_name    = "cascade"
  master_username  = "cascade_admin"
  master_password  = var.db_password
  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 16
  }
}

resource "aws_elasticache_replication_group" "cascade" {
  replication_group_id = "cascade-redis"
  engine               = "redis"
  node_type            = "cache.r6g.large"
  num_cache_clusters   = 3  # Multi-AZ
}
```

### Step 8.2: Kubernetes Manifests (Alternative)

```yaml
# k8s/cascade-engine/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cascade-engine
spec:
  replicas: 4
  selector:
    matchLabels:
      app: cascade-engine
  template:
    metadata:
      labels:
        app: cascade-engine
    spec:
      containers:
        - name: engine
          image: cascade/cascade-engine:latest
          ports:
            - containerPort: 8090
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: cascade-secrets
                  key: database-url
            - name: REDIS_URL
              value: "redis://cascade-redis:6379"
          resources:
            requests: {cpu: "500m", memory: "512Mi"}
            limits: {cpu: "2", memory: "2Gi"}
```

### Step 8.3: Monitoring Stack

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
    ports: ["9090:9090"]
    volumes: [./prometheus.yml:/etc/prometheus/prometheus.yml]

  grafana:
    image: grafana/grafana
    ports: ["3001:3000"]
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin

  loki:
    image: grafana/loki
    ports: ["3100:3100"]

  sentry:
    image: sentry:latest
    ports: ["9000:9000"]
```

### Step 8.4: Pre-Launch Checklist

```markdown
# Pre-Launch Checklist

## Security
- [ ] All secrets in Vault/Secrets Manager (not in code)
- [ ] TLS 1.3 enforced for all external endpoints
- [ ] gVisor sandbox configured for code execution
- [ ] SQL injection prevention validated
- [ ] Rate limiting on all public APIs (100 req/min/user)

## Infrastructure
- [ ] Auto-scaling configured for simulation workers
- [ ] Database backups configured (daily, 30-day retention)
- [ ] Multi-AZ deployment for PostgreSQL and Redis
- [ ] CDN configured (CloudFront)
- [ ] DNS with failover (Route53)

## Monitoring
- [ ] Alerts configured for: p99 > 500ms, error rate > 1%, 503 rate > 0.1%
- [ ] On-call rotation established
- [ ] Runbooks written for: server recovery, database failover, Redis rebuild
- [ ] Dashboard created with: active users, session count, error rates, latency

## Load Testing
- [ ] 100 concurrent users on Cascade mode — passes
- [ ] 50 concurrent Arena duels — passes
- [ ] 10 concurrent simulations — passes
- [ ] Database handles 500 queries/second — passes

## Backup
- [ ] PostgreSQL: automated daily backups, tested restoration
- [ ] Redis: RDB snapshots every hour
- [ ] S3: versioning enabled for codebases and solutions
```

### Step 8.5: Commit & Tag

```bash
git add -A && git commit -m "feat: production deployment — Terraform, K8s, monitoring, pre-launch checklist"
git tag v1.0.0
git push origin main --tags
```

---

## Phase 9: Content Expansion & Polish (Weeks 25-28)

**Goal:** More topics, polish existing features, community building.

### Content Pipeline

```yaml
# Build at least 3 complete system archetypes
archetypes_to_build:
  rate_limiter:
    lessons: [caching-redis, token-bucket, distributed-counters]
    constraints: [level_1, level_2, level_3]
    refactor: rate-limiter-mess.yaml
    dag: rate-limiter.yaml
  
  url_shortener:
    lessons: [hashing, consistent-hashing, caching-redis, database-sharding]
    constraints: [level_1, level_2, level_3, level_4]
    refactor: url-shortener-spaghetti.yaml
    dag: url-shortener.yaml
  
  notification_system:
    lessons: [message-queues, circuit-breaker, retry-backoff, dead-letter-queues]
    constraints: [level_1, level_2, level_3, level_4, level_5]
    refactor: notification-monolith.yaml
    dag: notification-system.yaml
```

### Polish Pass

- [ ] Error messages are helpful, not cryptic
- [ ] Loading states for all async operations
- [ ] Empty states when no data
- [ ] Onboarding flow for new users
- [ ] Keyboard shortcuts for power users
- [ ] Dark mode
- [ ] Mobile responsive (at least Learn mode)
- [ ] SEO for landing pages
- [ ] Performance: <2s initial load, <100ms API responses

### Community Launch

- [ ] Public GitHub repository
- [ ] Documentation site (docs.cascade.dev)
- [ ] Discord server
- [ ] Twitter/X account
- [ ] Launch on Product Hunt
- [ ] Blog post: "We Built a System Design Platform Where Your Code Actually Breaks"
- [ ] First League Season announcement

---

## Summary: Phase Timeline

```
Phase 0: Foundation              Weeks 1-2     ✅ Empty dir to running dev env
Phase 1: Learn Mode MVP          Weeks 3-5     ✅ Lessons, snippets, toolkit
Phase 2: Constraint Unlock MVP   Weeks 6-8     ✅ Monolith scaling, real-time metrics
Phase 3: Cascade Engine MVP      Weeks 9-11    ✅ DAG walker, fix analyzer, chain reactions
Phase 4: Blind Refactor MVP      Weeks 12-14   ✅ Spaghetti codebases, dep graphs, new reqs
Phase 5: Arena MVP               Weeks 15-17   ✅ WebSocket duels, matchmaking, scoring
Phase 6: League System           Weeks 18-19   ✅ Seasons, divisions, promotion/relegation
Phase 7: Auth & CI/CD            Weeks 20-21   ✅ Auth, migrations, GitHub Actions
Phase 8: Production Deploy       Weeks 22-24   ✅ Terraform, K8s, monitoring, checklist
Phase 9: Content & Polish        Weeks 25-28   ✅ 3 archetypes, onboarding, community launch

Total: 28 weeks (single engineer) or 14 weeks (team of 3)
```

---

## Key Files Reference

| File | Purpose | Created In |
|:---|---|:---:|
| `docker-compose.yml` | Local dev infrastructure | Phase 0 |
| `frontend/package.json` | Next.js + dependencies | Phase 0 |
| `services/auth/main.go` | User authentication | Phase 7 |
| `services/learn-engine/app.py` | Lesson player + snippet runner | Phase 1 |
| `services/constraint-engine/main.go` | Scaling challenge simulation | Phase 2 |
| `services/cascade-engine/engine.py` | DAG walker + fix analyzer | Phase 3 |
| `services/refactor-engine/dep_mapper.py` | Codebase dependency analysis | Phase 4 |
| `services/arena-engine/duel.go` | WebSocket duel state machine | Phase 5 |
| `services/arena-engine/league.go` | Season management | Phase 6 |
| `scripts/validate-dags.py` | DAG integrity checker | Phase 3 |
| `content/dags/rate-limiter.yaml` | Rate Limiter failure DAG | Phase 3 |
| `content/codebases/payment-monolith/main.py` | Spaghetti codebase | Phase 4 |
| `terraform/main.tf` | AWS infrastructure | Phase 8 |
| `.github/workflows/ci.yml` | CI/CD pipeline | Phase 7 |

---

*From `git init` to `kubectl apply` — every file, every command, every phase.*