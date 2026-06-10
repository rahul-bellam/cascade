# Storage helpers — but main.py mostly ignores these and inlines raw SQL anyway. 🚩 #48
import sqlite3

DB_PATH = "/data/urls.db"   # 🚩 #143: duplicated hardcoded path (drift risk)

def connect():
    return sqlite3.connect(DB_PATH)

def save(code, url):
    conn = connect(); cur = conn.cursor()
    cur.execute("INSERT INTO urls (code, url) VALUES (?, ?)", (code, url))
    conn.commit()
