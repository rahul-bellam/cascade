def is_authenticated(request):
    token = request.headers.get("Authorization")
    if token == "Bearer super_secret_token_123":
        return True
    return False
