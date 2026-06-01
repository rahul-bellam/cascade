import os
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-change-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

app = FastAPI(title="auth-service", version="1.0.0")
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

users: dict[str, dict] = {}

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    username: str
    email: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/api/v1/auth/register", status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest) -> UserResponse:
    if any(u["username"] == req.username for u in users.values()):
        raise HTTPException(status_code=409, detail="username already exists")
    if any(u["email"] == req.email for u in users.values()):
        raise HTTPException(status_code=409, detail="email already registered")
    uid = str(uuid.uuid4())
    users[uid] = {
        "id": uid,
        "username": req.username,
        "email": req.email,
        "password_hash": pwd_ctx.hash(req.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return UserResponse(id=uid, username=req.username, email=req.email)

@app.post("/api/v1/auth/login")
def login(req: LoginRequest) -> TokenResponse:
    user = next(
        (u for u in users.values() if u["email"] == req.email), None
    )
    if not user or not pwd_ctx.verify(req.password, user["password_hash"]):
        raise HTTPException(
            status_code=401, detail="invalid email or password"
        )
    expiry = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = jwt.encode(
        {"sub": user["id"], "email": user["email"], "exp": expiry},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    return TokenResponse(access_token=token)

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="invalid token")
