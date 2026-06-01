import urllib.request
import json
import time
import subprocess
import os

BASE = "http://localhost:8097/auth"

def post(p, d):
    req = urllib.request.Request(BASE+p, data=json.dumps(d).encode(), headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r: 
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        return e.code, json.load(e)

print("--- Starting Auth MVP Smoke Test ---")

print("1. Registering user...")
status, res = post("/register", {"email": "test@example.com", "password": "password123"})
assert status == 200
print("User registered successfully:", res)

print("2. Attempting duplicate registration...")
status, res = post("/register", {"email": "test@example.com", "password": "password123"})
assert status == 200 and "error" in res # We return 200 with an error object due to standard Go logic above
print("Duplicate registration caught:", res)

print("3. Logging in with correct credentials...")
status, res = post("/login", {"email": "test@example.com", "password": "password123"})
assert status == 200 and "token" in res
print("Login successful, JWT Token received:", res["token"][:20] + "...")

print("4. Logging in with WRONG credentials...")
status, res = post("/login", {"email": "test@example.com", "password": "wrong"})
assert status == 401
print("Bad credentials caught:", res)

print("\nAUTH SMOKE: PASS ✅")
