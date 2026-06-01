from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import uuid
import time
from dep_mapper import DependencyMapper

app = FastAPI(title="Refactor Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

CODEBASES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "content", "codebases"))

# In-memory session state
sessions = {}
mapper = DependencyMapper()

class StartReq(BaseModel):
    codebase: str
    user_id: str = "demo-user"

@app.get("/health")
def health():
    return {"status": "operational", "service": "refactor-engine"}

@app.post("/refactor/start")
def start(req: StartReq):
    codebase_path = os.path.join(CODEBASES_DIR, req.codebase)
    if not os.path.isdir(codebase_path):
        raise HTTPException(status_code=404, detail="Codebase not found")
    
    sid = str(uuid.uuid4())
    sessions[sid] = {
        "id": sid,
        "user_id": req.user_id,
        "codebase": req.codebase,
        "path": codebase_path,
        "started_at": time.time()
    }
    
    return {
        "session_id": sid,
        "codebase": req.codebase
    }

@app.get("/refactor/{sid}/deps")
def get_deps(sid: str):
    if sid not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    s = sessions[sid]
    # We will build a ForceGraph2D friendly format on the client or here.
    # The requirement says "returns depGraph" which has "files", "imports", etc.
    graph = mapper.map_codebase(s["path"])
    
    # Also inject node format for force-graph if we want it strictly here, 
    # but the frontend codebase explorer expects `depGraph.files[path]` 
    # and ForceGraph2D takes `graphData={depGraph}` assuming nodes/links structure.
    # Let's add nodes and links to the graph object.
    
    nodes = []
    links = []
    
    for fpath, info in graph["files"].items():
        high_coupling = len(info["imports"]) > 5 or len(info["global_vars"]) > 0
        nodes.append({
            "id": fpath,
            "name": os.path.basename(fpath),
            "high_coupling": high_coupling,
            "val": info["lines"] / 10 # node size heuristic
        })
        
    for imp in graph["imports"]:
        source_file = imp[0]
        # imp[1] is an alias/module name, we need to try mapping it to a file.
        # Simple heuristic: if imp[1] matches a file base name without .py
        target_file = None
        for fpath in graph["files"].keys():
            if imp[1] in fpath:
                target_file = fpath
                break
        if target_file and target_file != source_file:
            links.append({
                "source": source_file,
                "target": target_file
            })
            
    graph["nodes"] = nodes
    graph["links"] = links
    
    return graph

@app.get("/refactor/{sid}/file")
def get_file(sid: str, path: str = Query(...)):
    if sid not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    s = sessions[sid]
    content = mapper.get_file_content(s["path"], path)
    return {"path": path, "content": content}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8095"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
