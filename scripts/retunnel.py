#!/usr/bin/env python3
"""The tunnel URL lives in four places. When cloudflared restarts, fix them all at once.

    python3 scripts/retunnel.py            # start a new quick tunnel and repoint everything
    python3 scripts/retunnel.py --url URL  # a tunnel you already have

Touches:
  1. `.env`            PUBLIC_URL             (the API's idea of its own public address)
  2. `app/.env`        EXPO_PUBLIC_API_URL    (the phone app; needs an Expo restart to take)
  3. Sentry            the uptime monitor's URL, through the API
  4. prints the one step nobody can automate: repointing the Linq webhook in their dashboard

Safe to run twice. Verifies the new tunnel answers /health before writing anything.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def env(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    out = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            out[k] = v.strip()
    return out


def set_key(path: Path, key: str, value: str) -> None:
    """Rewrite one key in place, appending it when the file does not have it yet."""
    text = path.read_text() if path.exists() else ""
    if re.search(rf"^{key}=.*$", text, flags=re.M):
        text = re.sub(rf"^{key}=.*$", f"{key}={value}", text, flags=re.M)
    else:
        text = text.rstrip("\n") + f"\n{key}={value}\n"
    path.write_text(text)
    print(f"  {path.relative_to(ROOT)}: {key}={value}")


def start_tunnel() -> str:
    """Run cloudflared and read the assigned hostname off its own log."""
    log = ROOT / "var" / "cloudflared.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    proc = subprocess.Popen(["cloudflared", "tunnel", "--url", "http://localhost:8000"],
                             stdout=log.open("w"), stderr=subprocess.STDOUT)
    print(f"cloudflared started (pid {proc.pid}), waiting for its hostname...")
    for _ in range(60):
        time.sleep(1)
        found = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", log.read_text())
        if found:
            return found.group(0)
    proc.terminate()
    sys.exit("cloudflared never printed a hostname; see var/cloudflared.log")


def health_ok(url: str) -> bool:
    try:
        with urllib.request.urlopen(f"{url}/health", timeout=20) as r:
            return r.status == 200
    except Exception as exc:
        print(f"  {url}/health did not answer: {exc}")
        return False


def update_sentry_uptime(cfg: dict[str, str], url: str) -> None:
    token, org = cfg.get("SENTRY_AUTH_TOKEN"), cfg.get("SENTRY_ORG")
    if not token or not org:
        print("  Sentry: no token or org, skipped")
        return

    def call(path: str, method: str = "GET", body: dict | None = None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(f"https://sentry.io/api/0/{path}", data=data, method=method,
                                     headers={"Authorization": f"Bearer {token}",
                                              "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                return r.status, json.loads(r.read() or b"{}")
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode()[:200]

    status, monitors = call(f"organizations/{org}/uptime/")
    if status != 200 or not isinstance(monitors, list):
        print(f"  Sentry: could not list uptime monitors ({status})")
        return
    for m in monitors:
        if m.get("name") == "Pixie API health":
            s, out = call(f"projects/{org}/{m['projectSlug']}/uptime/{m['id']}/", "PUT",
                          {"name": m["name"], "url": f"{url}/health",
                           "intervalSeconds": m["intervalSeconds"], "timeoutMs": m["timeoutMs"],
                           "environment": m.get("environment")})
            print(f"  Sentry uptime monitor {m['id']}: {'updated' if s in (200, 201) else f'FAILED {s} {out}'}")
            return
    print("  Sentry: no monitor named 'Pixie API health'; run scripts/sentry_setup.py")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", help="an existing tunnel URL; omit to start a new one")
    args = ap.parse_args()

    url = (args.url or start_tunnel()).rstrip("/")
    if not health_ok(url):
        sys.exit("that URL does not serve /health; is the API up on 8000?")
    print(f"tunnel is live: {url}")

    set_key(ROOT / ".env", "PUBLIC_URL", url)
    set_key(ROOT / "app" / ".env", "EXPO_PUBLIC_API_URL", url)
    update_sentry_uptime(env(ROOT / ".env"), url)

    print("\nStill to do by hand:")
    print(f"  1. Point the Linq webhook at {url}/webhooks/linq in the Linq dashboard.")
    print("  2. Restart the API so it reads the new PUBLIC_URL.")
    print("  3. Restart Expo (`npx expo start --lan --port 8081`); the app reads its URL at bundle time.")


if __name__ == "__main__":
    main()
