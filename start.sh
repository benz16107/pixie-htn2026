#!/usr/bin/env bash
# Bring Pixie up. Run it from anywhere: ~/Code/hackathons/htn-2026/atlas/start.sh
# Starts what is down, leaves what is already up alone, prints the URLs and stops on a failure.
set -u
cd "$(dirname "$0")"
ROOT="$PWD"
set -a; . ./.env 2>/dev/null; set +a

up() { lsof -ti tcp:"$1" >/dev/null 2>&1; }

# Everything runs here on macserver; Ben demos from his laptop and phone over Tailscale. The
# Funnel gives the API one permanent public HTTPS address, so nothing needs rewriting when the
# venue's network changes. Only check that the pieces are still reachable.
TS_IP=$(tailscale ip -4 2>/dev/null | head -1)
[ -n "${TS_IP:-}" ] && echo "tailnet $TS_IP (macserver)"

if up 8000; then
  echo "api   already up"
else
  echo "api   starting..."
  (cd api && nohup uv run uvicorn atlas_api.app:app --host 0.0.0.0 --port 8000 > /tmp/pixie-api.log 2>&1 &)
  for _ in $(seq 1 40); do sleep 1; curl -fsS localhost:8000/health >/dev/null 2>&1 && break; done
fi
curl -fsS localhost:8000/health >/dev/null 2>&1 || { echo "api FAILED, see /tmp/pixie-api.log"; tail -5 /tmp/pixie-api.log; exit 1; }

if up 3100; then
  echo "web   already up"
else
  echo "web   building..."
  (cd web && npm run build > /tmp/pixie-build.log 2>&1) || { echo "web build FAILED, see /tmp/pixie-build.log"; tail -15 /tmp/pixie-build.log; exit 1; }
  (cd web && nohup npm run start -- --port 3100 > /tmp/pixie-web.log 2>&1 &)
  for _ in $(seq 1 30); do sleep 1; curl -fsS localhost:3100/queue >/dev/null 2>&1 && break; done
fi
curl -fsS localhost:3100/queue >/dev/null 2>&1 || { echo "web FAILED, see /tmp/pixie-web.log"; exit 1; }

if up 8081; then
  echo "phone already up"
else
  echo "phone starting..."
  (cd app && nohup npx expo start --lan --port 8081 > /tmp/pixie-expo.log 2>&1 &)
fi

# The public tunnel carries Linq's inbound webhooks and the Sentry uptime check.
# Some networks refuse to resolve trycloudflare.com even when the tunnel is healthy for everyone
# else, so ask Cloudflare's own resolver before declaring it down.
tunnel_answers() {
  local url="${1:-}" host ip
  [ -n "$url" ] || return 1
  curl -fsS -m 10 "$url/health" >/dev/null 2>&1 && return 0
  host=${url#*//}; host=${host%%/*}
  ip=$(dig +short "$host" @1.1.1.1 2>/dev/null | head -1)
  [ -n "$ip" ] || return 1
  [ "$(curl -s -m 20 -o /dev/null -w '%{http_code}' --resolve "$host:443:$ip" "$url/health")" = "200" ]
}

if pgrep -f "cloudflared tunnel" >/dev/null 2>&1; then
  if tunnel_answers "${PUBLIC_URL:-}"; then
    echo "tunnel up: ${PUBLIC_URL}"
  else
    echo "tunnel STALE: ${PUBLIC_URL:-unset} does not answer. Run: python3 scripts/retunnel.py"
  fi
else
  echo "tunnel DOWN. iMessage replies will not arrive. Run: python3 scripts/retunnel.py"
fi

# macserver sleeps on battery, which takes the whole demo down. Keep it awake and plugged in.
if ! pgrep -qf "caffeinate -disu"; then
  nohup caffeinate -disu > /dev/null 2>&1 &
  echo "awake   caffeinate running (kill it with: pkill caffeinate)"
fi
pmset -g batt 2>/dev/null | grep -q "AC Power" || echo "POWER   on battery. Plug macserver in."

cat <<EOF

  Open these on the laptop, with Tailscale on:

  Desk        http://macserver:3100/live      <- press "Run the demo"
  A case      http://macserver:3100/cases/138
  Queue       http://macserver:3100/queue
  Backtest    http://macserver:3100/backtest
  Ask         http://macserver:3100/ask
  Map         http://macserver:3100/map

  If the name does not resolve, use http://${TS_IP:-100.95.223.110}:3100 instead.

  Phone       Tailscale on, then Expo Go: exp://${TS_IP:-100.95.223.110}:8081
  API, public https://macserver.tailb51682.ts.net  (Linq webhooks, no VPN needed)

  Reset the demo:  curl -X POST localhost:8000/demo/reset
  Runbook:         $ROOT/docs/RUNBOOK.md
EOF
