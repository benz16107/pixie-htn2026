#!/usr/bin/env python3
"""One-off Sentry dashboard setup: the verify_numbers alert rule (docs/research/sentry.md item 5),
and best-effort uptime/cron monitors (item 6). Idempotent by name -- a rule/monitor that already
exists is left alone, not duplicated.

    cd api && uv run python ../scripts/sentry_setup.py

Needs SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT_API (project slug for the FastAPI project;
pass --project or set the env var) with scopes org:read, project:read, project:write, alerts:write.
The org auth token already in .env (sntrys_...) only carries project:releases -- every call below
will print a clear 403 and this script exits 0 regardless, so it is safe to leave in CI/setup docs.
See docs/SENTRY.md for exactly what did and did not run and why.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _load_env() -> dict[str, str]:
    env = dict(os.environ)
    dotenv = ROOT / ".env"
    if dotenv.exists():
        for line in dotenv.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env.setdefault(k, v.strip().strip("'").strip('"'))
    return env


def _call(host: str, path: str, token: str, method: str = "GET", body: dict | None = None) -> tuple[int, dict]:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{host}{path}", data=data, method=method,
                                 headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except json.JSONDecodeError:
            return e.code, {"detail": "non-JSON error body"}


def verify_numbers_alert_rule(host: str, org: str, project: str, token: str) -> None:
    """POST .../projects/{org}/{project}/rules/: fire when an issue is tagged pixie.alert=verify_numbers
    (set in telemetry.verify_numbers_alert), notify the team that owns it."""
    status, existing = _call(host, f"/api/0/projects/{org}/{project}/rules/", token)
    if status == 200 and any(r.get("name") == "Pixie: verify_numbers rejected a model sentence" for r in existing):
        print("alert rule: already exists, left alone")
        return
    payload = {
        "name": "Pixie: verify_numbers rejected a model sentence",
        "actionMatch": "all", "filterMatch": "all", "frequency": 5,
        "conditions": [{"id": "sentry.rules.conditions.tagged_event.TaggedEventCondition",
                        "key": "pixie.alert", "match": "eq", "value": "verify_numbers"}],
        "filters": [],
        "actions": [{"id": "sentry.mail.actions.NotifyEmailAction", "targetType": "IssueOwners"}],
    }
    status, out = _call(host, f"/api/0/projects/{org}/{project}/rules/", token, "POST", payload)
    print(f"alert rule: {'created ' + str(out.get('id')) if status in (200, 201) else f'FAILED {status}: {out}'}")


def uptime_monitor(host: str, org: str, project: str, token: str, url: str) -> None:
    payload = {"projectSlug": project, "name": "Pixie API /health", "url": url, "intervalSeconds": 300}
    status, out = _call(host, f"/api/0/organizations/{org}/uptime-detectors/", token, "POST", payload)
    print(f"uptime monitor: {'created' if status in (200, 201) else f'FAILED {status}: {out}'}")


def main() -> None:
    env = _load_env()
    token = env.get("SENTRY_AUTH_TOKEN")
    org = env.get("SENTRY_ORG")
    project = env.get("SENTRY_PROJECT_API", "atlas-api")
    health_url = env.get("ATLAS_PUBLIC_URL", "").rstrip("/") + "/health"
    host = "https://us.sentry.io"
    if not token or not org:
        print("SENTRY_AUTH_TOKEN / SENTRY_ORG not set; nothing to do.", file=sys.stderr)
        return
    verify_numbers_alert_rule(host, org, project, token)
    if health_url.startswith("http"):
        uptime_monitor(host, org, project, token, health_url)
    else:
        print("uptime monitor: skipped, ATLAS_PUBLIC_URL not set (no deployed /health to point at)")
    print("Cron monitor: created by running the job itself -- eval/backtest.py's "
         "_write_backtest_monitored() wraps it in @sentry_sdk.crons.monitor(monitor_slug='pixie-backtest'); "
         "Sentry auto-creates the monitor on its first check-in, no separate API call needed.")


if __name__ == "__main__":
    main()
