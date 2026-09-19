"""A7: HTTP surface for the Composio actions in actions.py.

Its own APIRouter, included in app.py with one line (`app.include_router(composio_routes.router)`) --
lane isolation per AGENTS.md: this module owns its routes, actions.py owns the Composio logic, and
neither touches app.py or desk.py beyond that one include line. Every handler below is a thin shim:
resolve the case + assessment (the same way app.py's own action route already does), call the
idempotent function in actions.py, and refresh the stored CaseView so the web queue sees the result.
"""

from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, HTTPException

from .actions import (
    FINAL_VERDICTS,
    book_referral_review,
    check_broker_reply,
    connected,
    file_data_quality_ticket,
    log_decision_to_sheet,
    run_actions_agent,
)
from .engine import explain
from .events import CaseFile, DecisionP

router = APIRouter(prefix="/composio", tags=["composio"])


def _resolve(case_id: str):
    """Case, Assessment, rules, insured name, store, world -- everything a handler needs, built the
    same way app.py's own `_case_and_assessment` + action route already do it (imported lazily so this
    module never triggers app.py's import at load time, matching the rest of the codebase's style of
    lazy cross-module imports inside functions, not at module scope)."""
    from .app import _case_and_assessment, _world, get_store

    store = get_store()
    case_id = case_id.removeprefix("SUB-")
    data = store.get_case(case_id)
    if data is None:
        raise HTTPException(status_code=404, detail=f"no case {case_id}")
    case, a, rules = _case_and_assessment(case_id)
    insured = data["case"]["title"]
    return store, _world, case, a, rules, insured, data


def _latest_decision(store, case_id: str):
    run = store.latest_run(case_id)
    if not run:
        return None, None
    events = store.tail(case_id, run_id=run)
    dec_event = next((e for e in reversed(events) if isinstance(e.payload, DecisionP)), None)
    return dec_event, CaseFile.fold(events)


@router.get("/status")
def status() -> dict[str, Any]:
    """What's live vs. what needs Ben to connect -- the booth/demo can hit this directly."""
    toolkits = ["gmail", "googlecalendar", "googlesheets", "linear", "notion"]
    return {"mode": os.environ.get("ATLAS_ACTIONS", "dry"),
            "toolkits": {t: connected(t) for t in toolkits}}


@router.post("/cases/{case_id}/broker-reply/check")
async def broker_reply_check(case_id: str) -> dict[str, Any]:
    """Poll the broker inbox for a reply to this case's information request; if a requested fact is
    found and verified, fold it in as Known, re-assess, and post the narrowing. Idempotent per
    (case, message id) -- safe to call on a timer or a button."""
    store, world, case, a, rules, insured, data = _resolve(case_id)
    out = await check_broker_reply(store, case, a, rules)
    if out.get("status") == "applied":
        from .app import apply_desk_run
        apply_desk_run(store, world, case.id.removeprefix("SUB-"))
    return out


@router.post("/cases/{case_id}/review/book")
def review_book(case_id: str) -> dict[str, Any]:
    """Book the 15-minute underwriter review. Only meaningful once the case has been referred, but the
    call itself is safe regardless -- the caller (the web app, or the actions agent) decides when to
    call it; this just books it and puts the event id on the case."""
    store, world, case, a, rules, insured = _resolve(case_id)[:6]
    dec_event, _fold = _latest_decision(store, case.id.removeprefix("SUB-"))
    explanation = dec_event.payload.explanation if dec_event else explain(a)
    out = book_referral_review(store, case, explanation, insured)
    if out.get("eventId") or out.get("status") == "dry":
        from .app import apply_desk_run
        apply_desk_run(store, world, case.id.removeprefix("SUB-"))
    return out


@router.post("/cases/{case_id}/decision/log")
def decision_log(case_id: str) -> dict[str, Any]:
    """Append the case's latest final decision (accept/decline/refer) to the Sheets audit trail."""
    store, _world, case, a, rules, insured = _resolve(case_id)[:6]
    dec_event, fold = _latest_decision(store, case.id.removeprefix("SUB-"))
    if dec_event is None or dec_event.payload.verdict not in FINAL_VERDICTS:
        raise HTTPException(status_code=409, detail="no final decision (accept/decline/refer) on this case yet")
    flippers = fold.last_assessment.flippers if fold and fold.last_assessment else []
    score = (a.score.lo, a.score.hi)
    return log_decision_to_sheet(store, case, dec_event, insured, score, flippers)


@router.post("/cases/{case_id}/defects/file")
def defects_file(case_id: str) -> dict[str, Any]:
    """File one ticket per real data-quality issue the engine already found on this case
    (case.issues) -- duplicate account, stale submission, limit far below TIV, etc."""
    store, _world, case, a, rules, insured = _resolve(case_id)[:6]
    if not case.issues:
        return {"filed": [], "detail": "no data-quality issues on this case"}
    return {"filed": [file_data_quality_ticket(store, case, issue, insured) for issue in case.issues]}


@router.post("/cases/{case_id}/agent")
async def agent_act(case_id: str) -> dict[str, Any]:
    """Let a small agent -- not this code -- choose whether to email, book, or file, from the three
    guarded Composio tools in actions.py. See actions.py section 5 for the allowlist."""
    store, world, case, a, rules, insured = _resolve(case_id)[:6]
    dec_event, _fold = _latest_decision(store, case.id.removeprefix("SUB-"))
    verdict = dec_event.payload.verdict if dec_event else None
    explanation = dec_event.payload.explanation if dec_event else explain(a)
    out = await run_actions_agent(store, case, a, rules, insured, verdict, explanation)
    from .app import apply_desk_run
    apply_desk_run(store, world, case.id.removeprefix("SUB-"))
    return out
