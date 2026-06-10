# URL Shortener — "it works, ship it" edition.
# 🚩 CONCERN #21: No cache — every redirect hits the DB
# 🚩 CONCERN #24: No TTL — short codes live forever, table grows unbounded
# 🚩 CONCERN #44: Collisions handled by retry loop, not a real ID scheme
# 🚩 CONCERN #191: SQL injection via f-strings
# 🚩 CONCERN #41: New DB connection per request
# 🚩 CONCERN #194: No rate limiting / abuse controls on shorten
# 🚩 CONCERN #48: analytics, shorten, redirect, admin all in one module/global state

import sqlite3, random, string, time
from flask import Flask, request, redirect

app = Flask(__name__)

# 🚩 #48: global mutable state shared across every concern (storage, cache, stats, config)
DB_PATH = "/data/urls.db"          # 🚩 #143: hardcoded
mem_cache = {}                      # half-baked cache nobody invalidates
click_counts = {}                  # analytics jammed into the same process
BANNED = set()                     # "abuse control"
CONFIG = {"code_len": 6, "domain": "sho.rt"}


def get_db():
    # 🚩 #41: fresh connection, no pool
    return sqlite3.connect(DB_PATH)


def gen_code():
    # 🚩 #44: random code + collision-by-retry; degrades badly at scale
    return ''.join(random.choices(string.ascii_letters + string.digits, k=CONFIG["code_len"]))


@app.route('/shorten', methods=['POST'])
def shorten():
    long_url = request.json['url']
    # 🚩 #194: anyone can shorten anything, unlimited
    if long_url in BANNED:
        return {"error": "banned"}, 403
    conn = get_db(); cur = conn.cursor()
    # 🚩 #44: retry until we randomly avoid a collision
    for _ in range(10):
        code = gen_code()
        cur.execute(f"SELECT 1 FROM urls WHERE code = '{code}'")  # 🚩 #191
        if not cur.fetchone():
            break
    cur.execute(f"INSERT INTO urls (code, url, created) VALUES ('{code}', '{long_url}', {int(time.time())})")
    conn.commit()
    mem_cache[code] = long_url      # 🚩 written but never expired (#24)
    return {"short": f"{CONFIG['domain']}/{code}"}


@app.route('/<code>')
def go(code):
    # 🚩 #21: cache that's never invalidated and isn't shared across processes
    if code in mem_cache:
        url = mem_cache[code]
    else:
        conn = get_db(); cur = conn.cursor()
        cur.execute(f"SELECT url FROM urls WHERE code = '{code}'")  # 🚩 #191
        row = cur.fetchone()
        if not row:
            return {"error": "not found"}, 404
        url = row[0]
        mem_cache[code] = url
    click_counts[code] = click_counts.get(code, 0) + 1   # 🚩 analytics inline on the hot path
    return redirect(url, 302)


# 🚩 #48 + god object: one endpoint that does analytics, cleanup, abuse-scan, and reporting
@app.route('/admin/run', methods=['POST'])
def admin_run():
    """Nightly maintenance — but it's synchronous, unpaginated, and does everything at once."""
    conn = get_db(); cur = conn.cursor()
    report = {}
    # 1. recompute every click count from scratch
    cur.execute("SELECT code FROM urls")
    all_codes = [r[0] for r in cur.fetchall()]
    recomputed = {}
    for code in all_codes:
        cur.execute(f"SELECT COUNT(*) FROM clicks WHERE code = '{code}'")
        recomputed[code] = cur.fetchone()[0]
    report["clicks"] = recomputed
    # 2. find and "ban" suspicious destinations (string match, no real scan)
    cur.execute("SELECT code, url FROM urls")
    flagged = []
    for code, url in cur.fetchall():
        bad = False
        for needle in ["malware", "phish", ".ru/login", "free-money", "verify-account"]:
            if needle in url:
                bad = True
        if bad:
            BANNED.add(url)
            cur.execute(f"DELETE FROM urls WHERE code = '{code}'")   # 🚩 hard delete, no audit
            flagged.append(code)
    report["flagged"] = flagged
    # 3. expire old links (manually, full table scan)
    cutoff = int(time.time()) - 60 * 60 * 24 * 365
    cur.execute("SELECT code, created FROM urls")
    expired = []
    for code, created in cur.fetchall():
        if created < cutoff:
            cur.execute(f"DELETE FROM urls WHERE code = '{code}'")
            if code in mem_cache:
                del mem_cache[code]
            expired.append(code)
    report["expired"] = expired
    # 4. rebuild the in-memory cache from the whole table (defeats the point)
    mem_cache.clear()
    cur.execute("SELECT code, url FROM urls")
    for code, url in cur.fetchall():
        mem_cache[code] = url
    # 5. naive top-N report
    top = sorted(click_counts.items(), key=lambda kv: kv[1], reverse=True)[:10]
    report["top"] = top
    # 6. dump config + counts (no auth on this admin route — 🚩 #186)
    report["config"] = CONFIG
    report["total_codes"] = len(all_codes)
    report["cache_size"] = len(mem_cache)
    conn.commit()
    return report


@app.route('/stats/<code>')
def stats(code):
    return {"code": code, "clicks": click_counts.get(code, 0)}


if __name__ == '__main__':
    app.run(port=5000)
