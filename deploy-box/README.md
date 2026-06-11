# Cascade — Single-Box Deployment (TLS reverse proxy)

The bootstrap-phase front door for the backend running via `docker-compose.prod.yml`.
Choose **one** of the two configs (Caddy is recommended).

## Why subdomain-per-engine

The frontend (Vercel) calls each engine through its own `*_ENGINE_URL`, and the Arena
WebSocket connects browser-direct. Because `cascade-engine` and `constraint-engine` both
serve `/archetypes` and every service serves `/health`, path-based routing on a single host
collides. So each engine gets a subdomain.

| Subdomain | → port | Service |
|---|---|---|
| `cascade.api.example.com`    | 8090 | cascade-engine (also serves `/predict`) |
| `constraint.api.example.com` | 8094 | constraint-engine |
| `learn.api.example.com`      | 8093 | learn-engine |
| `refactor.api.example.com`   | 8095 | refactor-engine |
| `auth.api.example.com`       | 8081 | auth |
| `arena.api.example.com`      | 8096 | arena-engine (HTTP + `wss://.../arena/queue`) |

## Option A — Caddy (recommended: automatic HTTPS)

```bash
# 1. Point DNS A/AAAA records for the 6 subdomains at this box.
# 2. Open ports 80 + 443. Edit deploy-box/Caddyfile (your domain + ACME email).
# 3. Run Caddy as a host-network container:
docker run -d --name caddy --restart unless-stopped --network host \
  -v "$PWD/deploy-box/Caddyfile:/etc/caddy/Caddyfile" \
  -v caddy_data:/data -v caddy_config:/config caddy:2
```

Caddy obtains and renews Let's Encrypt certs automatically. Validate before running:
`caddy validate --config deploy-box/Caddyfile --adapter caddyfile`.

## Option B — Nginx (bring your own certs)

```bash
sudo certbot --nginx -d cascade.api.example.com -d constraint.api.example.com \
  -d learn.api.example.com -d refactor.api.example.com \
  -d auth.api.example.com -d arena.api.example.com
sudo cp deploy-box/nginx.conf /etc/nginx/conf.d/cascade.conf   # edit domain first
sudo nginx -t && sudo systemctl reload nginx
```

## Then, on Vercel (frontend env vars)

```
CASCADE_ENGINE_URL       = https://cascade.api.example.com
CONSTRAINT_ENGINE_URL    = https://constraint.api.example.com
LEARN_ENGINE_URL         = https://learn.api.example.com
REFACTOR_ENGINE_URL      = https://refactor.api.example.com
ARENA_ENGINE_URL         = https://arena.api.example.com
AUTH_SERVICE_URL         = https://auth.api.example.com
NEXT_PUBLIC_ARENA_WS_URL = wss://arena.api.example.com/arena/queue
```

(`predict` is served by cascade-engine, so it reuses `CASCADE_ENGINE_URL`.)

## Smoke test after setup

```bash
curl https://cascade.api.example.com/health
curl https://learn.api.example.com/lessons | head
# WebSocket: open the Arena page on the deployed frontend and start a duel.
```
