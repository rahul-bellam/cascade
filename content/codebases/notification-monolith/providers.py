# Provider config — but main.py hardcodes its own copy anyway. 🚩 #48 / #232 config drift
EMAIL_HOST = "smtp.provider.com"   # 🚩 #143 duplicated hardcoded credentials/host
SMS_HOST = "sms.provider.com"

def email_endpoint():
    return EMAIL_HOST
