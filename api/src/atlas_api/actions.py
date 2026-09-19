"""T11: the outbox and the broker information request (Composio Gmail).

The outbox is the idempotency boundary: one row per (case, action, facts), so pressing the button twice
sends one email. `ATLAS_ACTIONS=dry` (the default) writes the row and the events but calls nothing;
`live` calls Composio's GMAIL_SEND_EMAIL with an explicit connected account id, because Composio
silently falls back to the default account when it is left out.

The email body is built from the case's own computed facts: only the flippers, each with the guideline
band it has to clear. No model writes it.
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from typing import Any

import httpx

from .case import Case, Estimated, Known, Missing
from .case_store import CaseStore
from .engine import Assessment, Open, RulesFile
from .events import ActionP, ActionResultP, DeskEvent

COMPOSIO_URL = "https://backend.composio.dev/api/v3.1/tools/execute/{tool}"
BROKER_INBOX = os.environ.get("ATLAS_BROKER_INBOX", "benz16107+broker@gmail.com")


def _band_text(rules: RulesFile, fact: str) -> str:
    rule = next((r for r in rules.rules if r.fact == fact), None)
    if rule is None:
        return ""
    parts = []
    for band, pred in rule.bands.items():
        if band == "not_acceptable" or "else" in pred:
            continue
        if "between" in pred:
            lo, hi = pred["between"]
            parts.append(f"{band} {lo:,}-{hi:,}")
        elif "in" in pred:
            parts.append(f"{band} {', '.join(map(str, pred['in']))}")
        elif "lte" in pred:
            parts.append(f"{band} up to {pred['lte']:,}")
        elif "lt" in pred:
            parts.append(f"{band} under {pred['lt']:,}")
        elif "gt" in pred:
            parts.append(f"{band} after {pred['gt']}")
        elif "eq" in pred:
            parts.append(f"{band} {pred['eq']}")
    return "; ".join(parts)


def _value_text(case: Case, fact: str) -> str:
    v = case.fact(fact)
    if isinstance(v, Known):
        return f"we have {v.v} ({v.source})"
    if isinstance(v, Estimated):
        return f"we can only estimate {v.lo:,.0f}-{v.hi:,.0f} ({v.method})"
    return f"we have nothing on file ({v.reason})"


def compose_request(case: Case, a: Assessment, rules: RulesFile, insured: str, facts: list[str]) -> dict[str, str]:
    """Subject, body and recipient for the broker information request. Every number is from the case."""
    contact_name = case.contact.v.split(" <")[0] if isinstance(case.contact, Known) else "there"
    case_no = case.id.removeprefix("SUB-")
    lines = [f"Hi {contact_name},", "",
             f"On submission {case_no} for {insured}, our desk scored the risk at "
             f"{a.score.lo:.0f}-{a.score.hi:.0f} out of 100. It stays open only because of the following, and "
             f"each one changes the outcome:", ""]
    for fact in facts:
        band = _band_text(rules, fact)
        lines.append(f"- {fact.replace('_', ' ')}: {_value_text(case, fact)}."
                     + (f" The 2025 guideline bands are {band}." if band else ""))
    lines += ["", "Anything else can wait; these are the fields that decide it.", "",
              "Thanks,", "Atlas underwriting desk"]
    return {"to": BROKER_INBOX, "subject": f"Submission {case_no} ({insured}): the facts that decide it",
            "body": "\n".join(lines)}


def append_after_run(store: CaseStore, case_id: str, run_id: str, actor, payload) -> DeskEvent:
    """Append to the end of a case's lane: t_ms continues after the recorded run instead of restarting at 0."""
    tail = store.tail(case_id)
    t0 = time.time() - ((tail[-1].t_ms if tail else 0) + 2000) / 1000
    e = DeskEvent.make(case_id, run_id, actor, payload, t0=t0)
    store.append(e)
    return e


def outbox_key(case_id: str, action: str, facts: list[str]) -> str:
    return hashlib.sha256(f"{case_id}|{action}|{','.join(sorted(facts))}".encode()).hexdigest()[:16]


def send_gmail(message: dict[str, str]) -> dict[str, Any]:
    """Composio GMAIL_SEND_EMAIL on an explicit connected account. Raises on a transport error."""
    api_key, account = os.environ["COMPOSIO_API_KEY"], os.environ["COMPOSIO_GMAIL_ACCOUNT"]
    user_id = os.environ.get("COMPOSIO_USER_ID")
    with httpx.Client(timeout=60) as http:
        if not user_id:
            acct = http.get(f"https://backend.composio.dev/api/v3/connected_accounts/{account}",
                            headers={"x-api-key": api_key})
            acct.raise_for_status()
            user_id = acct.json().get("user_id")
        resp = http.post(COMPOSIO_URL.format(tool="GMAIL_SEND_EMAIL"), headers={"x-api-key": api_key},
                         json={"connected_account_id": account, "user_id": user_id,
                               "arguments": {"recipient_email": message["to"], "subject": message["subject"],
                                             "body": message["body"], "is_html": False}})
    resp.raise_for_status()
    return resp.json()


def request_broker_info(store: CaseStore, case: Case, a: Assessment, rules: RulesFile, insured: str,
                        facts: list[str] | None = None, run_id: str | None = None) -> dict[str, Any]:
    """Idempotent: a second call with the same facts returns the existing row and sends nothing."""
    case_id = case.id.removeprefix("SUB-")
    if not facts:
        facts = [f.fact for f in a.decision.flippers] if isinstance(a.decision, Open) else []
        facts = facts or [f.fact for f in a.factors if f.provenance in ("missing", "estimated")] or ["premium"]
    key = outbox_key(case_id, "request_broker_info", facts)
    existing = next((o for o in store.outbox_for(case_id) if o["id"] == key), None)
    if existing and existing["status"] in ("sent", "dry"):
        return existing | {"deduped": True}

    message = compose_request(case, a, rules, insured, facts)
    mode = os.environ.get("ATLAS_ACTIONS", "dry")
    run_id = run_id or store.latest_run(case_id) or "actions"
    t0 = time.time()
    append_after_run(store, case_id, run_id, "lead", ActionP(
        text=f"Broker email to {message['to']}: {', '.join(facts)}", action="request_broker_info",
        status="proposed", facts=facts))

    status, detail = "dry", "ATLAS_ACTIONS=dry: composed, not sent"
    if mode == "live":
        try:
            res = send_gmail(message)
            ok = bool(res.get("successful", True))
            status = "sent" if ok else "failed"
            detail = json.dumps(res.get("data", res))[:300] if ok else json.dumps(res)[:300]
        except Exception as exc:
            status, detail = "failed", f"{type(exc).__name__}: {exc}"[:300]
    record = {"id": key, "channel": "gmail", "status": status, "at": t0, **message, "facts": facts,
              "detail": detail}
    store.post_outbox(key, case_id, "gmail", status, {k: v for k, v in record.items()
                                                      if k not in ("id", "channel", "status")})
    append_after_run(store, case_id, run_id, "system", ActionResultP(
        text=f"Broker email {status}: {detail[:80]}", ok=status in ("sent", "dry"), detail=detail))
    return record
