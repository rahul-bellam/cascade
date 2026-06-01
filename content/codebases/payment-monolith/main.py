# 🚩 CONCERN #186: No authentication on internal APIs
# 🚩 CONCERN #191: SQL injection via raw queries
# 🚩 CONCERN #143: Database credentials hardcoded
# 🚩 CONCERN #44: N+1 queries in payment processing
# 🚩 CONCERN #41: New database connection per request
# 🚩 CONCERN #60: No soft deletes — hard delete on cancel

import sqlite3
from flask import Flask, request
from datetime import datetime

app = Flask(__name__)

# 🚩 #143: Hardcoded credentials
DB_PATH = "/data/payments.db"

def get_db():
    # 🚩 #41: New connection every time — no pooling
    conn = sqlite3.connect(DB_PATH)
    return conn

@app.route('/api/charge', methods=['POST'])
def charge():
    user_id = request.json['user_id']
    amount = request.json['amount']
    
    # 🚩 #191: SQL injection via f-string
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"SELECT balance FROM users WHERE id = '{user_id}'")
    user = cursor.fetchone()
    
    if user and user[0] >= amount:
        # 🚩 #44: Two separate queries instead of one
        cursor.execute(f"UPDATE users SET balance = {user[0] - amount} WHERE id = '{user_id}'")
        cursor.execute(f"INSERT INTO transactions (user_id, amount) VALUES ('{user_id}', {amount})")
        conn.commit()
        return {"status": "success", "new_balance": user[0] - amount}
    else:
        return {"status": "error", "message": "Insufficient funds"}, 402

@app.route('/api/user/<user_id>', methods=['GET'])
def get_user(user_id):
    # 🚩 #191: SQL injection again
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM users WHERE id = '{user_id}'")
    user = cursor.fetchone()
    
    # 🚩 #48: SELECT * — returns all columns including password_hash
    return {
        "id": user[0],
        "email": user[1],
        "name": user[2],
        "balance": user[3]
        # 🚩 #11: Accidentally exposing password_hash would be here
    }

@app.route('/api/user/<user_id>/cancel', methods=['POST'])
def cancel_user(user_id):
    # 🚩 #60: Hard delete — can't recover
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"DELETE FROM users WHERE id = '{user_id}'")
    conn.commit()
    return {"status": "deleted"}

@app.route('/api/refund/<transaction_id>', methods=['POST'])
def refund(transaction_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM transactions WHERE id = '{transaction_id}'")
    txn = cursor.fetchone()
    
    if txn:
        # 🚩 #9: No idempotency key — refunding twice refunds twice
        cursor.execute(f"UPDATE users SET balance = balance + {txn[2]} WHERE id = '{txn[1]}'")
        cursor.execute(f"DELETE FROM transactions WHERE id = '{transaction_id}'")
        conn.commit()
        return {"status": "refunded"}
    return {"status": "not_found"}, 404

# 🚩 #217: Everything runs inline — no job queue for async tasks
@app.route('/api/batch-payout', methods=['POST'])
def batch_payout():
    """Processes payouts for all merchants. Blocks the HTTP request for up to 5 minutes."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, balance FROM users WHERE role = 'merchant'")
    merchants = cursor.fetchall()
    
    for merchant_id, balance in merchants:
        # 🚩 #44: N+1 — one query per merchant
        cursor.execute(f"UPDATE users SET balance = 0 WHERE id = '{merchant_id}'")
        cursor.execute(f"INSERT INTO transactions (user_id, amount) VALUES ('{merchant_id}', {balance})")
    
    conn.commit()
