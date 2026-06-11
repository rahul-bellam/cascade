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
consent: dict[str, dict] = {}

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

# ── Consent & Trust Boundary ─────────────────────────────────────────────

class ConsentRequest(BaseModel):
    share_with_assess: bool = False
    share_calibration_data: bool = False
    data_retention_days: int = 365

class ConsentResponse(BaseModel):
    user_id: str
    share_with_assess: bool
    share_calibration_data: bool
    data_retention_days: int
    updated_at: str

class DataExportResponse(BaseModel):
    user_id: str
    profile: dict | None
    progress: list
    consent: dict | None

@app.get("/api/v1/user/consent")
def get_consent(request: Request) -> ConsentResponse:
    user = get_current_user(request)
    uid = user["id"]
    c = consent.get(uid, {
        "share_with_assess": False,
        "share_calibration_data": False,
        "data_retention_days": 365,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return ConsentResponse(user_id=uid, **c)

@app.put("/api/v1/user/consent")
def update_consent(req: ConsentRequest, request: Request) -> ConsentResponse:
    user = get_current_user(request)
    uid = user["id"]
    consent[uid] = {
        "share_with_assess": req.share_with_assess,
        "share_calibration_data": req.share_calibration_data,
        "data_retention_days": req.data_retention_days,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    return ConsentResponse(user_id=uid, **consent[uid])

@app.post("/api/v1/user/data/export")
def export_data(request: Request) -> dict:
    user = get_current_user(request)
    uid = user["id"]
    export_id = str(uuid.uuid4())
    return {
        "export_id": export_id,
        "user_id": uid,
        "profile": profiles.get(uid),
        "progress": progress.get(uid, []),
        "consent": consent.get(uid),
    }

@app.delete("/api/v1/user/data")
def delete_data(request: Request):
    user = get_current_user(request)
    uid = user["id"]
    profiles.pop(uid, None)
    progress.pop(uid, None)
    consent.pop(uid, None)
    return {"status": "deleted", "user_id": uid}
