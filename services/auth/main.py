import os
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Cascade Auth", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
_start_time = time.time()


class RegisterReq(BaseModel):
    email: str
    password: str


class LoginReq(BaseModel):
    email: str
    password: str


@app.get("/health")
def health():
    return {
        "service": "cascade-auth",
        "status": "operational",
        "version": "0.1.0",
        "uptime": f"{int(time.time() - _start_time)}s",
    }


@app.post("/api/v1/auth/register")
def register(req: RegisterReq):
    return {"message": "user registered"}


@app.post("/api/v1/auth/login")
def login(req: LoginReq):
    return {
        "access_token": "jwt-placeholder",
        "token_type": "bearer",
        "user": {"email": req.email},
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8081"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
