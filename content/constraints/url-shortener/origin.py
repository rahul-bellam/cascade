# content/constraints/url-shortener/origin.py
# A working URL shortener that handles ~10 req/min on a single server.
# It works. It's simple. It's wrong for production.

from flask import Flask, request, redirect
import string, random

app = Flask(__name__)
urls = {}  # 🚩 Concern #21: No cache — in-memory only, lost on restart

@app.route('/shorten', methods=['POST'])
def shorten():
    long_url = request.json['url']
    short = ''.join(random.choices(string.ascii_letters + string.digits, k=6))
    urls[short] = long_url  # 🚩 Concern #24: No TTL — keys grow forever
    return {'short': short, 'long': long_url}

@app.route('/<short>')
def redirect_url(short):
    long_url = urls.get(short)
    if long_url:
        return redirect(long_url, 302)
    return {'error': 'not found'}, 404

if __name__ == '__main__':
    app.run(port=5000)
