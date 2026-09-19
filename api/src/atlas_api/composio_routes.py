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

from .actions import check_broker_reply, connected

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
