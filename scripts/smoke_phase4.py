import urllib.request
import json
import time

BASE = "http://localhost:8095"

def get(p):
    with urllib.request.urlopen(BASE+p) as r: return json.load(r)
def post(p, d):
    req = urllib.request.Request(BASE+p, data=json.dumps(d).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r: return json.load(r)

print("health:", get("/health")["status"])

# 1. Start Refactor Session
print("\n--- Starting Refactor Session ---")
start_res = post("/refactor/start", {"codebase": "payment-monolith"})
sid = start_res["session_id"]
print(f"Session ID: {sid}")

# 2. Get Dependencies Graph
print("\n--- Fetching Dependencies Graph ---")
deps = get(f"/refactor/{sid}/deps")
print(f"Total files: {deps['metrics']['total_files']}")
print(f"God functions: {deps['metrics'].get('god_functions', [])}")
print(f"Nodes in graph: {len(deps['nodes'])}")
print(f"Links in graph: {len(deps['links'])}")

# 3. Fetch specific file content
print("\n--- Fetching file content ---")
file_res = get(f"/refactor/{sid}/file?path=main.py")
content = file_res["content"]
print(f"File fetched: {file_res['path']}")
print(f"Content lines: {len(content.splitlines())}")

print("\nREFACTOR SMOKE: PASS ✅")
