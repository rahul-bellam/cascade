import os
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Cascade User", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
_start_time = time.time()


class Profile(BaseModel):
    user_id: str
    display_name: str = ""
    bio: str = ""


@app.get("/health")
def health():
    return {
        "service": "cascade-user",
        "status": "operational",
        "version": "0.1.0",
        "uptime": f"{int(time.time() - _start_time)}s",
    }


@app.get("/api/v1/user/profile")
def get_profile(user_id: str = "demo-user"):
    return {"user_id": user_id, "display_name": "", "bio": ""}


@app.put("/api/v1/user/profile")
def update_profile(profile: Profile):
    return {"user_id": profile.user_id, "display_name": profile.display_name, "bio": profile.bio}


@app.get("/api/v1/user/progress")
def get_progress(user_id: str = "demo-user"):
    return {"user_id": user_id, "lessons_completed": 0, "constraints_solved": 0, "score": 0}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8082"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
