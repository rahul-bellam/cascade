import urllib.request
import urllib.error
import json

BASE = "http://localhost:8081/api/v1/auth"

def post(p, d):
    req = urllib.request.Request(BASE + p, data=json.dumps(d).encode(), headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        return e.code, json.load(e)

print("--- Starting Auth MVP Smoke Test ---")

print("1. Registering user...")
status, res = post("/register", {"username": "testuser", "email": "test@example.com", "password": "password123"})
assert status == 201, f"Expected 201, got {status}: {res}"
uid = res["id"]
print(f"  User registered: {uid}")

print("2. Attempting duplicate registration...")
status, res = post("/register", {"username": "testuser", "email": "test@example.com", "password": "password123"})
assert status == 409, f"Expected 409, got {status}: {res}"
print(f"  Duplicate caught: {res['detail']}")

print("3. Logging in with correct credentials...")
status, res = post("/login", {"email": "test@example.com", "password": "password123"})
assert status == 200 and "access_token" in res, f"Expected 200+token, got {status}: {res}"
token = res["access_token"]
print(f"  Login OK, token: {token[:20]}...")

print("4. Logging in with WRONG credentials...")
status, res = post("/login", {"email": "test@example.com", "password": "wrong"})
assert status == 401, f"Expected 401, got {status}: {res}"
print(f"  Bad credentials caught: {res['detail']}")

print("\nAUTH SMOKE: PASS ✅")
