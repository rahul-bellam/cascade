import os
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from jose import JWTError, jwt
from pydantic import BaseModel

SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-change-in-prod")
ALGORITHM = "HS256"

app = FastAPI(title="user-service", version="1.0.0")

profiles: dict[str, dict] = {}
progress: dict[str, list] = {}

class ProfileRequest(BaseModel):
    display_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None

class ProfileResponse(BaseModel):
    id: str
    username: str
    email: str
    display_name: str | None
    avatar_url: str | None
    bio: str | None

class ProgressEntry(BaseModel):
    topic: str
    score: float
    completed: bool = False

class ProgressResponse(BaseModel):
    user_id: str
    entries: list[ProgressEntry]

def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing token")
    token = auth.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"id": payload["sub"], "email": payload["email"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="invalid token")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/v1/user/profile")
def get_profile(request: Request) -> ProfileResponse:
    user = get_current_user(request)
    uid = user["id"]
    p = profiles.get(uid)
    if not p:
        raise HTTPException(status_code=404, detail="profile not found")
    return ProfileResponse(**p)

@app.put("/api/v1/user/profile")
def update_profile(req: ProfileRequest, request: Request) -> ProfileResponse:
    user = get_current_user(request)
    uid = user["id"]
    if uid not in profiles:
        profiles[uid] = {
            "id": uid,
            "username": user["email"].split("@")[0],
            "email": user["email"],
            "display_name": None,
            "avatar_url": None,
            "bio": None,
        }
    p = profiles[uid]
    if req.display_name is not None:
        p["display_name"] = req.display_name
    if req.avatar_url is not None:
        p["avatar_url"] = req.avatar_url
    if req.bio is not None:
        p["bio"] = req.bio
    return ProfileResponse(**p)

@app.get("/api/v1/user/progress")
def get_progress(request: Request) -> ProgressResponse:
    user = get_current_user(request)
    uid = user["id"]
    entries = progress.get(uid, [])
    return ProgressResponse(user_id=uid, entries=[ProgressEntry(**e) for e in entries])

@app.post("/api/v1/user/progress")
def add_progress(entry: ProgressEntry, request: Request) -> ProgressResponse:
    user = get_current_user(request)
    uid = user["id"]
    if uid not in progress:
        progress[uid] = []
    progress[uid].append(entry.model_dump())
    return ProgressResponse(
        user_id=uid,
        entries=[ProgressEntry(**e) for e in progress[uid]],
    )
