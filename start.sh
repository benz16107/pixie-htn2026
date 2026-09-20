#!/usr/bin/env bash
# Bring Pixie up. Run it from anywhere: ~/Code/hackathons/htn-2026/atlas/start.sh
# Starts what is down, leaves what is already up alone, prints the URLs and stops on a failure.
set -u
cd "$(dirname "$0")"
ROOT="$PWD"
set -a; . ./.env 2>/dev/null; set +a

up() { lsof -ti tcp:"$1" >/dev/null 2>&1; }

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
if pgrep -f "cloudflared tunnel" >/dev/null 2>&1; then
  echo "tunnel already up: ${PUBLIC_URL:-unset}"
  curl -fsS "${PUBLIC_URL:-http://127.0.0.1:0}/health" >/dev/null 2>&1 \
    || echo "      WARNING: PUBLIC_URL does not answer. Run: python3 scripts/retunnel.py"
else
  echo "tunnel DOWN. iMessage replies will not arrive. Run: python3 scripts/retunnel.py"
fi

cat <<EOF

  Desk        http://localhost:3100/live      <- press "Run the demo"
  A case      http://localhost:3100/cases/138
  Queue       http://localhost:3100/queue
  Backtest    http://localhost:3100/backtest
  Ask         http://localhost:3100/ask
  Map         http://localhost:3100/map
  Phone       Expo Go on this Wi-Fi, port 8081

  Reset the demo:  curl -X POST localhost:8000/demo/reset
  Runbook:         $ROOT/docs/RUNBOOK.md
EOF
