"""T11 + A7: the outbox, the broker information request, and the Composio actions built on it
(broker-reply watch, referral calendar hold, decision audit trail, data-quality tickets, and a
small tool-calling agent).

The outbox is the idempotency boundary: one row per (case, action, facts-or-message-id), so pressing
the button twice, or polling twice, does the thing once. `ATLAS_ACTIONS=dry` (the default) writes the
row and the events but calls nothing; `live` calls Composio with an explicit connected account id on
every toolkit, because Composio silently falls back to the default account when it is left out (the
multi-account gotcha docs/research/composio.md section 4 confirms is still undocumented behaviour).

The email body, the calendar description, the sheet row and the ticket body are all built from the
case's own computed facts and events. The one place a model reads free text (a broker's reply email)
is `extract_broker_facts`, and even there it may only report a value it can quote verbatim from the
email -- `apply_broker_reply` then re-verifies the quote before treating it as a fact. No number is
invented; every number is either code-computed or copied out of a document with its source recorded.
"""

from __future__ import annotations

import hashlib
import json
import os
import time
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

from .case import Case, DataIssue, Estimated, Known, Missing
from .case_store import CaseStore
from .engine import Assessment, Open, RulesFile, assess, explain
from .events import ActionP, ActionResultP, AssessmentP, DeskEvent, FindingP, ScoreP

COMPOSIO_URL = "https://backend.composio.dev/api/v3.1/tools/execute/{tool}"
BROKER_INBOX = os.environ.get("ATLAS_BROKER_INBOX", "benz16107+broker@gmail.com")


def _money_fact(fact: str) -> bool:
    return fact in ("tiv", "premium", "loss_5yr")


def _band_text(rules: RulesFile, fact: str) -> str:
    rule = next((r for r in rules.rules if r.fact == fact), None)
    if rule is None:
        return ""
    parts = []
    for band, pred in rule.bands.items():
        if band == "not_acceptable" or "else" in pred:
            continue
        money = _money_fact(fact)
        if "between" in pred:
            lo, hi = pred["between"]
            parts.append(f"{band} {'$' if money else ''}{lo:,}-{'$' if money else ''}{hi:,}")
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
    money = _money_fact(fact)

    def fmt(x: Any) -> str:
        return f"${x:,.0f}" if money and isinstance(x, (int, float)) else str(x)

    if isinstance(v, Known):
        return f"we have {fmt(v.v)} ({v.source})"
    if isinstance(v, Estimated):
        return f"we can only estimate {fmt(v.lo)}-{fmt(v.hi)} ({v.method})"
    return f"we have nothing on file ({v.reason})"


def compose_request(case: Case, a: Assessment, rules: RulesFile, insured: str, facts: list[str]) -> dict[str, str]:
    """Subject, body and recipient for the broker information request. Every number is from the case."""
    contact_name = case.contact.v.split(" <")[0] if isinstance(case.contact, Known) else "there"
    case_no = case.id.removeprefix("SUB-")
    named = ", ".join(f.replace("_", " ") for f in facts)
    one = len(facts) == 1
    lines = [f"Hi {contact_name},", "",
             f"We are working submission {case_no} for {insured}. It scores {a.score.lo:.0f}-{a.score.hi:.0f} "
             f"against our 2025 property guideline, and {'one item' if one else f'{len(facts)} items'} still "
             f"{'decides' if one else 'decide'} whether we can quote:", ""]
    for fact in facts:
        band = _band_text(rules, fact)
        lines.append(f"- {fact.replace('_', ' ')}: {_value_text(case, fact)}."
                     + (f" The guideline bands are {band}." if band else ""))
    lines += ["", f"Send {'that' if one else 'those'} and we will re-rate the same day. Nothing else is "
                  "holding it up.", "",
              "Thanks,", "Pixie underwriting desk"]
    return {"to": BROKER_INBOX, "subject": f"Pixie: submission {case_no} ({insured}), {named} needed",
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


# ================================================================================================
# A7: Composio, beyond the one email.
#
# Every toolkit below is called the same way `send_gmail` already does it: an explicit
# `connected_account_id` from an env var named `COMPOSIO_<TOOLKIT>_ACCOUNT`, never left to Composio's
# default-account routing. `composio_execute` is that pattern factored out so new toolkits don't
# repeat the user-id lookup.
# ================================================================================================

_user_id_cache: dict[str, str] = {}


def _resolve_user_id(api_key: str, account: str) -> str:
    if account not in _user_id_cache:
        with httpx.Client(timeout=30) as http:
            resp = http.get(f"https://backend.composio.dev/api/v3/connected_accounts/{account}",
                            headers={"x-api-key": api_key})
            resp.raise_for_status()
            _user_id_cache[account] = resp.json().get("user_id", "")
    return _user_id_cache[account]


def _account_env(toolkit: str) -> str:
    return f"COMPOSIO_{toolkit.upper()}_ACCOUNT"


def connected(toolkit: str) -> bool:
    """Whether Ben has connected this toolkit -- an env var naming the connected account id."""
    return bool(os.environ.get(_account_env(toolkit)))


def composio_execute(tool: str, toolkit: str, arguments: dict[str, Any]) -> dict[str, Any]:
    """A Composio tool call on the toolkit's explicit connected account. Raises if not connected or
    on a transport error; callers decide dry/live and not_connected handling."""
    api_key = os.environ["COMPOSIO_API_KEY"]
    account = os.environ[_account_env(toolkit)]
    user_id = os.environ.get("COMPOSIO_USER_ID") or _resolve_user_id(api_key, account)
    with httpx.Client(timeout=60) as http:
        resp = http.post(COMPOSIO_URL.format(tool=tool), headers={"x-api-key": api_key},
                         json={"connected_account_id": account, "user_id": user_id, "arguments": arguments})
    resp.raise_for_status()
    return resp.json()


FINAL_VERDICTS = {"accept_with_subjectivity", "decline", "refer_with_subjectivity"}


def _money_or_numeric_fact(fact: str) -> bool:
    return fact in ("tiv", "premium", "loss_5yr", "year_built")


def _parse_fact_value(fact: str, raw: str) -> Any:
    """Numeric facts are parsed with the same $/K/M-aware number reader the desk uses to verify a
    Lead's prose (desk._numbers) -- reused, not reimplemented. Non-numeric facts stay a trimmed string."""
    if not raw or not raw.strip():
        return None
    if _money_or_numeric_fact(fact):
        from .desk import _numbers
        nums = _numbers(raw)
        return nums[0][1] if nums else None
    return raw.strip()


# ---- 1. Close the loop: the broker's reply becomes a fact, live -------------------------------

def _broker_reply_query(case_no: str) -> str:
    return f'from:{BROKER_INBOX} subject:"submission {case_no}"'


def search_broker_replies(case_no: str, max_results: int = 5) -> list[dict[str, Any]]:
    """GMAIL_FETCH_EMAILS scoped to the broker inbox and this case's subject line -- the same subject
    `compose_request` used to send it, so a "Re: ..." reply still matches (Gmail's subject: operator
    is a substring match, not exact)."""
    res = composio_execute("GMAIL_FETCH_EMAILS", "gmail",
                           {"query": _broker_reply_query(case_no), "max_results": max_results})
    return (res.get("data") or {}).get("messages", []) or []


async def extract_broker_facts(message_text: str, facts: list[str]) -> list[dict[str, Any]]:
    """Strict structured-output read of the broker's reply: only the facts asked for, only a value the
    model can quote verbatim from the email. `apply_broker_reply` re-checks the quote before trusting
    it -- this is a document read, not a number the model computed (AGENTS.md invariant 1)."""
    from agents import Agent, Runner
    from pydantic import BaseModel

    from .desk import ModelConfig

    class _Finding(BaseModel):
        fact: str
        value: str | None
        quote: str

    class _Extraction(BaseModel):
        findings: list[_Finding]

    models = ModelConfig.from_env()
    agent = Agent(name="broker_reply", model=models.specialist, output_type=_Extraction, instructions=(
        "Read a broker's reply email and report ONLY the facts the underwriter asked for: "
        f"{', '.join(facts)}. For each one, return value=null unless the email states it explicitly. "
        "`quote` must be the exact substring of the email that states the value, verbatim -- it is "
        "checked against the email afterwards, so do not paraphrase or compute anything. If the email "
        "doesn't answer a fact, leave its value null rather than guessing."))
    out = (await Runner.run(agent, json.dumps({"requested_facts": facts, "email": message_text}),
                            max_turns=1)).final_output
    return [f.model_dump() for f in out.findings]


def apply_broker_reply(store: CaseStore, case: Case, a: Assessment, rules: RulesFile,
                       run_id: str | None, message_id: str, values: dict[str, str]) -> dict[str, Any]:
    """Fold verified broker-reply values into the case as Known facts (provenance: "broker email,
    <message_id>"), re-assess, and post the interval narrowing as an event. Idempotent per
    (case, message_id): a second poll that finds the same email is a no-op.

    `values` must already be extracted and quote-verified by the caller (`check_broker_reply` does
    both) -- this function trusts them and does the deterministic part: parse, fold, re-score, log.
    """
    case_id = case.id.removeprefix("SUB-")
    key = outbox_key(case_id, "broker_reply", [message_id])
    existing = next((o for o in store.outbox_for(case_id) if o["id"] == key), None)
    if existing:
        return existing | {"deduped": True}

    run_id = run_id or store.latest_run(case_id) or "actions"
    parsed = {fact: _parse_fact_value(fact, raw) for fact, raw in values.items()}
    parsed = {fact: v for fact, v in parsed.items() if v is not None}
    if not parsed:
        record = {"id": key, "channel": "gmail_poll", "status": "no_new_facts", "messageId": message_id, "facts": {}}
        store.post_outbox(key, case_id, "gmail_poll", "no_new_facts",
                          {k: v for k, v in record.items() if k not in ("id", "channel", "status")})
        return record

    before = a.score
    updated = case
    for fact, value in parsed.items():
        source = f"broker email, message {message_id}"
        updated = updated.with_fact(fact, Known(value, source=source), by="broker")
        append_after_run(store, case_id, run_id, "system", FindingP(
            text=f"Broker reply: {fact.replace('_', ' ')} = {value}", fact=fact, value=value,
            provenance="known", source=source))
    after = assess(updated, rules)
    from .desk import _decision_kind
    flippers = [f.fact for f in after.decision.flippers] if isinstance(after.decision, Open) else []
    append_after_run(store, case_id, run_id, "system", AssessmentP(
        text=(f"Broker reply narrowed the interval: {before.lo:.0f}-{before.hi:.0f} -> "
              f"{after.score.lo:.0f}-{after.score.hi:.0f} ({_decision_kind(after)})"),
        score=ScoreP(lo=round(after.score.lo), hi=round(after.score.hi)),
        decision=_decision_kind(after), flippers=flippers))

    record = {"id": key, "channel": "gmail_poll", "status": "applied", "messageId": message_id,
              "facts": parsed, "before": {"lo": before.lo, "hi": before.hi},
              "after": {"lo": after.score.lo, "hi": after.score.hi}}
    store.post_outbox(key, case_id, "gmail_poll", "applied",
                      {k: v for k, v in record.items() if k not in ("id", "channel", "status")})
    return record


async def check_broker_reply(store: CaseStore, case: Case, a: Assessment, rules: RulesFile,
                             run_id: str | None = None) -> dict[str, Any]:
    """The orchestrator: figure out what was asked, poll the broker inbox (live only), extract and
    verify, apply. `ATLAS_ACTIONS=dry` composes the search query and calls nothing, same as every
    other action here."""
    import asyncio

    case_id = case.id.removeprefix("SUB-")
    req = next((o for o in reversed(store.outbox_for(case_id))
               if o.get("channel") == "gmail" and o.get("facts")), None)
    facts = req["facts"] if req else (
        [f.fact for f in a.decision.flippers] if isinstance(a.decision, Open) else ["premium"])
    mode = os.environ.get("ATLAS_ACTIONS", "dry")
    if mode != "live":
        return {"status": "dry", "detail": f"ATLAS_ACTIONS=dry: would search {_broker_reply_query(case_id)!r}",
                "facts": facts}
    if not connected("gmail"):
        return {"status": "not_connected", "detail": "gmail toolkit not connected", "facts": facts}
    try:
        messages = await asyncio.to_thread(search_broker_replies, case_id)
    except Exception as exc:
        return {"status": "failed", "detail": f"{type(exc).__name__}: {exc}"[:300], "facts": facts}
    if not messages:
        return {"status": "no_reply", "detail": "no matching message in the broker inbox yet", "facts": facts}

    message = messages[0]  # newest first
    message_id, text = message.get("messageId", ""), message.get("messageText") or ""
    findings = await extract_broker_facts(text, facts)
    values = {f["fact"]: f["value"] for f in findings
             if f.get("value") and f.get("quote") and f["quote"] in text and f["fact"] in facts}
    return apply_broker_reply(store, case, a, rules, run_id, message_id, values) | {"searched": len(messages)}


# ---- 2. Book a 15-minute underwriter review when a case is referred ---------------------------

def _next_business_hour(days_ahead: int = 1, hour: int = 10) -> str:
    """Naive local datetime GOOGLECALENDAR_CREATE_EVENT wants: the next weekday at `hour`:00."""
    d = datetime.now() + timedelta(days=days_ahead)
    while d.weekday() >= 5:  # Sat/Sun
        d += timedelta(days=1)
    return d.replace(hour=hour, minute=0, second=0, microsecond=0).strftime("%Y-%m-%dT%H:%M:%S")


def book_referral_review(store: CaseStore, case: Case, explanation: str, insured: str,
                         run_id: str | None = None, case_url: str | None = None) -> dict[str, Any]:
    """15-minute underwriter review on Google Calendar, with the case link in the description.
    Idempotent per case: a case referred twice (e.g. a replayed run) books one hold."""
    case_id = case.id.removeprefix("SUB-")
    key = outbox_key(case_id, "book_referral_review", [])
    existing = next((o for o in store.outbox_for(case_id) if o["id"] == key), None)
    if existing:
        return existing | {"deduped": True}

    run_id = run_id or store.latest_run(case_id) or "actions"
    link = case_url or f"{os.environ.get('ATLAS_WEB_URL', 'http://localhost:3000')}/cases/{case_id}"
    summary = f"Underwriter review: SUB-{case_id} ({insured})"
    description = f"{explanation}\n\nCase: {link}"
    append_after_run(store, case_id, run_id, "system", ActionP(
        text=f"Calendar hold proposed: {summary}", action="book_referral_review", status="proposed"))

    mode = os.environ.get("ATLAS_ACTIONS", "dry")
    status, detail, event_id = "dry", "ATLAS_ACTIONS=dry: composed, not booked", None
    if mode == "live":
        if not connected("googlecalendar"):
            status = "not_connected"
            detail = "googlecalendar toolkit not connected -- see docs/COMPOSIO.md for the one-click connect"
        else:
            try:
                arguments: dict[str, Any] = {
                    "summary": summary, "description": description, "start_datetime": _next_business_hour(),
                    "timezone": os.environ.get("ATLAS_TZ", "America/Toronto"),
                    "event_duration_minutes": 15, "calendar_id": "primary",
                }
                if os.environ.get("ATLAS_UNDERWRITER_EMAIL"):
                    arguments["attendees"] = [os.environ["ATLAS_UNDERWRITER_EMAIL"]]
                res = composio_execute("GOOGLECALENDAR_CREATE_EVENT", "googlecalendar", arguments)
                data = res.get("data", res)
                ok = bool(res.get("successful", True))
                event_id = data.get("id") or data.get("eventId")
                status, detail = ("sent" if ok else "failed"), json.dumps(data)[:300]
            except Exception as exc:
                status, detail = "failed", f"{type(exc).__name__}: {exc}"[:300]

    record = {"id": key, "channel": "googlecalendar", "status": status, "detail": detail,
              "eventId": event_id, "summary": summary}
    store.post_outbox(key, case_id, "googlecalendar", status,
                      {k: v for k, v in record.items() if k not in ("id", "channel", "status")})
    append_after_run(store, case_id, run_id, "system", ActionResultP(
        text=f"Calendar hold {status}" + (f", event {event_id}" if event_id else ""),
        ok=status in ("sent", "dry"), detail=detail))
    if event_id:
        data = store.get_case(case_id)
        if data is not None:
            data["case"]["referralReview"] = {"eventId": event_id, "status": status}
            store.put_case(case_id, data)
    return record


# ---- 3. Decision audit trail in Sheets ---------------------------------------------------------

SHEETS_CACHE_KEY = "composio:sheets_id"
SHEET_TITLE = "Pixie Decisions"
SHEET_HEADER = ["case_id", "insured", "decision", "score_lo", "score_hi", "flippers", "approved_by", "at"]


def _sheet_id(store: CaseStore) -> str | None:
    """Cached to disk (AGENTS.md invariant 4), not re-looked-up or re-created every call."""
    cached = store.cache_get(SHEETS_CACHE_KEY)
    if cached:
        return cached
    env = os.environ.get("COMPOSIO_SHEETS_ID")
    if env:
        store.cache_set(SHEETS_CACHE_KEY, env)
        return env
    return None


def _ensure_sheet(store: CaseStore) -> str:
    """Create the "Pixie Decisions" sheet if none is on file yet, write its header row once, and
    cache the id so every later call is a plain append."""
    sid = _sheet_id(store)
    if sid:
        return sid
    res = composio_execute("GOOGLESHEETS_CREATE_GOOGLE_SHEET1", "googlesheets", {"title": SHEET_TITLE})
    data = res.get("data", res)
    sid = data.get("spreadsheetId") or data.get("id")
    if not sid:
        raise RuntimeError(f"GOOGLESHEETS_CREATE_GOOGLE_SHEET1 returned no id: {json.dumps(res)[:200]}")
    store.cache_set(SHEETS_CACHE_KEY, sid)
    composio_execute("GOOGLESHEETS_SPREADSHEETS_VALUES_APPEND", "googlesheets", {
        "spreadsheetId": sid, "range": "Sheet1!A1", "valueInputOption": "RAW", "values": [SHEET_HEADER]})
    return sid


def log_decision_to_sheet(store: CaseStore, case: Case, dec_event: DeskEvent, insured: str,
                          score: tuple[float, float] | None, flippers: list[str] | None = None) -> dict[str, Any]:
    """Append one audit row for a finalized decision (accept/decline/refer): the case, the score
    interval, the flippers that decided it, who approved it, and when. Append-only, so it's a paper
    trail by construction -- no upsert logic needed. Idempotent per decision event id (already a
    content hash of the decision itself, per events.py)."""
    case_id = case.id.removeprefix("SUB-")
    key = outbox_key(case_id, "log_decision_to_sheet", [dec_event.id])
    existing = next((o for o in store.outbox_for(case_id) if o["id"] == key), None)
    if existing:
        return existing | {"deduped": True}

    run_id = store.latest_run(case_id) or "actions"
    dec = dec_event.payload
    lo, hi = (round(score[0]), round(score[1])) if score else ("", "")
    row = [case_id, insured, dec.verdict, lo, hi, "; ".join(flippers or []),
          dec_event.actor, datetime.fromtimestamp(dec_event.ts, tz=UTC).isoformat()]

    mode = os.environ.get("ATLAS_ACTIONS", "dry")
    status, detail = "dry", "ATLAS_ACTIONS=dry: composed, not logged"
    if mode == "live":
        if not connected("googlesheets"):
            status = "not_connected"
            detail = "googlesheets toolkit not connected -- see docs/COMPOSIO.md for the one-click connect"
        else:
            try:
                sid = _ensure_sheet(store)
                res = composio_execute("GOOGLESHEETS_SPREADSHEETS_VALUES_APPEND", "googlesheets", {
                    "spreadsheetId": sid, "range": "Sheet1!A1", "valueInputOption": "USER_ENTERED", "values": [row]})
                ok = bool(res.get("successful", True))
                status, detail = ("sent" if ok else "failed"), json.dumps(res.get("data", res))[:300]
            except Exception as exc:
                status, detail = "failed", f"{type(exc).__name__}: {exc}"[:300]

    record = {"id": key, "channel": "googlesheets", "status": status, "detail": detail, "row": row}
    store.post_outbox(key, case_id, "googlesheets", status,
                      {k: v for k, v in record.items() if k not in ("id", "channel", "status")})
    append_after_run(store, case_id, run_id, "system", ActionResultP(
        text=f"Decision logged to Sheets: {dec.verdict}", ok=status in ("sent", "dry"), detail=detail))
    return record


# ---- 4. Data-quality defect tickets ------------------------------------------------------------

def file_data_quality_ticket(store: CaseStore, case: Case, issue: DataIssue, insured: str,
                             run_id: str | None = None) -> dict[str, Any]:
    """One ticket per (case, issue kind): a real defect the engine already found in the carrier's own
    data (case.issues), not a broker gap. Linear if connected, else Notion, else composes the ticket
    and says exactly what to connect. Idempotent per (case, issue.kind)."""
    case_id = case.id.removeprefix("SUB-")
    key = outbox_key(case_id, "file_data_quality_ticket", [issue.kind])
    existing = next((o for o in store.outbox_for(case_id) if o["id"] == key), None)
    if existing:
        return existing | {"deduped": True}

    run_id = run_id or store.latest_run(case_id) or "actions"
    title = f"[Data quality] SUB-{case_id}: {issue.kind.replace('_', ' ')}"
    body = (f"{issue.text}\n\nCase: SUB-{case_id} ({insured})\n"
           f"Facts involved: {', '.join(issue.facts) or 'n/a'}\nSeverity: {issue.severity}")
    append_after_run(store, case_id, run_id, "system", ActionP(
        text=f"Data-quality ticket proposed: {issue.kind}", action="file_data_quality_ticket", status="proposed"))

    mode = os.environ.get("ATLAS_ACTIONS", "dry")
    status, detail, url, channel = "dry", "ATLAS_ACTIONS=dry: composed, not filed", None, "linear"
    if mode == "live":
        if connected("linear") and os.environ.get("COMPOSIO_LINEAR_TEAM_ID"):
            try:
                res = composio_execute("LINEAR_CREATE_LINEAR_ISSUE", "linear", {
                    "team_id": os.environ["COMPOSIO_LINEAR_TEAM_ID"], "title": title, "description": body})
                data = res.get("data", res)
                ok = bool(res.get("successful", True))
                status, detail = ("sent" if ok else "failed"), json.dumps(data)[:300]
                url = (data.get("issue") or {}).get("url") if isinstance(data.get("issue"), dict) else data.get("url")
            except Exception as exc:
                status, detail = "failed", f"{type(exc).__name__}: {exc}"[:300]
        elif connected("notion") and os.environ.get("COMPOSIO_NOTION_PARENT_ID"):
            channel = "notion"
            try:
                res = composio_execute("NOTION_CREATE_NOTION_PAGE", "notion", {
                    "parent_id": os.environ["COMPOSIO_NOTION_PARENT_ID"], "title": f"{title}\n\n{body}"})
                data = res.get("data", res)
                ok = bool(res.get("successful", True))
                status, detail = ("sent" if ok else "failed"), json.dumps(data)[:300]
                url = data.get("url")
            except Exception as exc:
                status, detail = "failed", f"{type(exc).__name__}: {exc}"[:300]
        else:
            status = "not_connected"
            detail = ("neither Linear nor Notion is connected -- see docs/COMPOSIO.md for the one-click "
                     "connect for either")

    record = {"id": key, "channel": channel, "status": status, "detail": detail, "title": title, "url": url}
    store.post_outbox(key, case_id, channel, status,
                      {k: v for k, v in record.items() if k not in ("id", "channel", "status")})
    append_after_run(store, case_id, run_id, "system", ActionResultP(
        text=f"Data-quality ticket {status}: {title}", ok=status in ("sent", "dry"), detail=detail))
    return record
