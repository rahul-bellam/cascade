# Notification System — starting monolith.
# Sends notifications INLINE during the HTTP request. Works for a few users;
# falls apart the moment the provider is slow or traffic spikes.

import smtplib

def send_notification(user, message):
    # synchronous: blocks the request until the provider responds
    server = smtplib.SMTP("email-provider.example.com")  # 🚩 inline network call
    server.sendmail("noreply@app.com", user["email"], message)
    server.quit()

def handle_request(user, message):
    # the user's HTTP request does not return until the email is sent 🚩
    send_notification(user, message)
    return {"status": "sent"}
