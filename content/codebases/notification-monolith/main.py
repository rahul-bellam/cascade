# Notification System — the "just send it in the request" monolith.
# 🚩 CONCERN #217: Notifications sent inline during the HTTP request (no job queue)
# 🚩 CONCERN #218: No durability — in-process; a crash loses everything in flight
# 🚩 CONCERN #219: No idempotency — retries send duplicates
# 🚩 CONCERN #220: Immediate lockstep retries -> retry storm on provider blips
# 🚩 CONCERN #115: Single provider, no circuit breaker / fallback
# 🚩 CONCERN #48: email, sms, push, templating, prefs, retries all in one module + globals

import time, smtplib
from flask import Flask, request

app = Flask(__name__)

# 🚩 #48: every concern shares the same global state
SENT_LOG = []                 # "durability" = a list in memory (#218)
USER_PREFS = {}               # preferences jammed in here too
TEMPLATES = {"welcome": "Hi {name}, welcome!", "alert": "Alert: {msg}"}
PROVIDERS = {"email": "smtp.provider.com", "sms": "sms.provider.com"}  # 🚩 #143 hardcoded, single each


def send_email(to, body):
    # 🚩 #217 inline network call blocks the request; 🚩 #115 only one provider
    server = smtplib.SMTP(PROVIDERS["email"])
    server.sendmail("noreply@app.com", to, body)
    server.quit()


def send_sms(to, body):
    # pretend HTTP call to the single SMS provider (#115)
    time.sleep(0.2)
    return True


@app.route('/notify', methods=['POST'])
def notify():
    data = request.json
    user = data['user']; channel = data['channel']; template = data['template']
    body = TEMPLATES.get(template, "{msg}").format(**data.get('vars', {}))
    # 🚩 #219 no idempotency key — same request twice = two messages
    # 🚩 #220 retry immediately, in lockstep, no backoff/jitter
    for attempt in range(5):
        try:
            if channel == 'email':
                send_email(user['email'], body)        # 🚩 #217 inline
            elif channel == 'sms':
                send_sms(user['phone'], body)
            SENT_LOG.append({"user": user['id'], "channel": channel, "t": time.time()})  # 🚩 #218
            return {"status": "sent"}
        except Exception:
            continue                                    # 🚩 #220 hammer the provider
    return {"status": "failed"}, 500


# 🚩 #48 + god object: one function fans out a whole campaign synchronously
@app.route('/campaign', methods=['POST'])
def campaign():
    """Send a campaign to every user — inline, unbatched, unthrottled, all channels."""
    data = request.json
    template = data['template']
    audience = data['audience']     # list of user dicts
    results = {"sent": 0, "failed": 0, "skipped": 0, "by_channel": {}, "errors": []}
    for user in audience:
        # build the message per-user (no caching of the rendered template)
        try:
            body = TEMPLATES[template].format(name=user.get("name", "there"),
                                              msg=data.get("msg", ""))
        except Exception as e:
            results["errors"].append(str(e)); results["failed"] += 1; continue
        # respect prefs (lookup per user, no bulk fetch)
        prefs = USER_PREFS.get(user["id"], {"email": True, "sms": False, "push": False})
        for channel in ("email", "sms", "push"):
            if not prefs.get(channel):
                results["skipped"] += 1
                continue
            # 🚩 #220 lockstep retry loop for EVERY message
            ok = False
            for attempt in range(3):
                try:
                    if channel == "email":
                        send_email(user["email"], body)
                    elif channel == "sms":
                        send_sms(user.get("phone", ""), body)
                    else:
                        time.sleep(0.05)   # "push"
                    ok = True
                    break
                except Exception:
                    continue               # no backoff
            if ok:
                results["sent"] += 1
                results["by_channel"][channel] = results["by_channel"].get(channel, 0) + 1
                SENT_LOG.append({"user": user["id"], "channel": channel, "t": time.time()})  # 🚩 #218
            else:
                results["failed"] += 1
    # naive dedupe report (after the fact, in memory)
    seen = set(); dupes = 0
    for entry in SENT_LOG:
        key = (entry["user"], entry["channel"])
        if key in seen:
            dupes += 1
        seen.add(key)
    results["possible_duplicates"] = dupes
    return results


@app.route('/prefs/<user_id>', methods=['POST'])
def set_prefs(user_id):
    USER_PREFS[user_id] = request.json
    return {"status": "ok"}


if __name__ == '__main__':
    app.run(port=5000)
