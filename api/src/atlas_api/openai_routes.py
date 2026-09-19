"""The A1 lane's router: what the OpenAI runtime is configured to do, and what memory holds.

Three read/act surfaces the web can show a judge without reading a log:

  GET  /openai/runtime            per-role model, reasoning effort and verbosity, the guardrail,
                                  the trace workflow name, and whether tracing is on.
  GET  /cases/{id}/memory         what the desk recalled for this case: the per-underwriter
                                  SQLiteSession lines, Backboard's assistant memory, the guideline
                                  paragraph it cited, and the boundary that keeps all of it advisory.
  POST /cases/{id}/triage-message Backboard System One typed judgements over an inbound broker
                                  message. Labelled a model judgement everywhere: the probability
                                  and confidence route work, they never touch a price or a score.

Its own `APIRouter`, included once from app.py, so lanes editing app.py do not collide.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from . import memory
from .case import Missing, World
from .case_store import CaseStore
from .desk import ModelConfig
from .events import DeskEvent, JudgementP, RecallP
from .openai_runtime import ROLE_SETTINGS, SESSION_DB, recall as session_recall, session, settings_table, \
    tracing_off, underwriter

router = APIRouter()

_world: World | None = None
_store: CaseStore | None = None


def init(world: World, store: CaseStore) -> None:
    global _world, _store
    _world, _store = world, store


def _case_or_404(case_id: str):
    assert _world is not None, "openai_routes.init() not called"
    cid = case_id.removeprefix("SUB-")
    try:
        return cid, _world.case(f"SUB-{cid}")
    except (KeyError, ValueError):
        raise HTTPException(status_code=404, detail=f"no case {case_id}")


@router.get("/openai/runtime")
def runtime() -> dict[str, Any]:
    """Everything the desk tells the OpenAI SDK, in one payload the UI can render as a table."""
    models = ModelConfig.from_env()
    return {
        "models": {"lead": models.lead, "specialist": models.specialist},
        "roles": settings_table(models.lead, models.specialist),
        "guardrail": {
            "name": "verify_numbers",
            "type": "output_guardrail",
            "attachedTo": "every agent (Agent(output_guardrails=[...]))",
            "onTripwire": ("a guardrail event in the case ledger, an error-level Sentry event, and the "
                           "deterministic template in place of the ungrounded sentence"),
        },
        "tracing": {
            "enabled": not tracing_off(),
            "workflowName": "pixie-case-{case_id}",
            "groupId": "the run id, so all six agents of one run group together",
            "dashboard": "https://platform.openai.com/traces",
        },
        "session": {"store": "agents.memory.SQLiteSession", "db": str(SESSION_DB),
                    "sessionId": f"underwriter:{underwriter()}",
                    "scope": "one row per closed case, advisory input to the planning turn only"},
        "roleCount": len(ROLE_SETTINGS),
    }


@router.get("/cases/{case_id}/memory")
async def case_memory(case_id: str, live: bool = False) -> dict[str, Any]:
    """What the desk remembered for this case. Ledger first (that is what the run actually saw);
    `live=true` asks Backboard again, which is cached to disk and so still works offline."""
    cid, case = _case_or_404(case_id)
    assert _store is not None
    events: list[DeskEvent] = _store.tail(cid) if _store.latest_run(cid) else []
    recalled = [e.payload.model_dump(mode="json", exclude={"kind"})
                for e in events if isinstance(e.payload, RecallP)]
    judgements = [e.payload.model_dump(mode="json", exclude={"kind"})
                  for e in events if isinstance(e.payload, JudgementP)]
    out: dict[str, Any] = {
        "caseId": cid,
        "fromLedger": recalled,
        "judgements": judgements,
        "backboardEnabled": memory.enabled(),
        "boundary": memory.BOUNDARY,
        "judgementBoundary": memory.JUDGEMENT_BOUNDARY,
    }
    out["session"] = await session_recall(session(), limit=8, skip_case=cid)
    if live:
        memo = memory.memo_for(_world, cid, case)
        rec = await memory.recall(memo, cite_guideline=True)
        out["live"] = rec.wire() | {"query": memo.query()}
    return out


class TriageIn(BaseModel):
    message: str
    channel: str = "email"


@router.post("/cases/{case_id}/triage-message")
async def triage_message(case_id: str, body: TriageIn) -> dict[str, Any]:
    """Classify an inbound broker message with Backboard's System One typed questions.

    The answers route work: what the broker wants, whether this smells like a duplicate, and which
    of the facts *code* already marked missing to chase first. Every number here is the model's own
    judgement and is labelled as one; none of it may become a price, a score or a decision tier.
    """
    cid, case = _case_or_404(case_id)
    missing = [name for name in ("premium", "year_built", "construction_share", "loss_5yr", "tiv")
               if isinstance(case.fact(name), Missing)]
    state = {"case_id": cid, "channel": body.channel, "message": body.message[:4000],
             "facts_the_desk_is_missing": missing}
    judgements, detail = await memory.judge(state, memory.broker_questions(missing))
    answers = [j.wire() for j in judgements]
    if answers and _store is not None and _store.latest_run(cid):
        run_id = _store.latest_run(cid)
        first = _store.tail(cid, run_id=run_id)[:1]
        t0 = first[0].ts - first[0].t_ms / 1000 if first else 0.0
        _store.append(DeskEvent.make(cid, run_id or "triage", "system", JudgementP(
            text=f"System One judged the inbound {body.channel}: "
                 + ", ".join(f"{a['question']}={a['answer']}" for a in answers),
            source=f"backboard/system-one:{memory.SYSTEM_ONE_MODEL}", answers=answers,
            about=f"inbound broker {body.channel}"), t0=t0))
    return {"caseId": cid, "answers": answers, "source": detail, "missingFacts": missing,
            "boundary": memory.JUDGEMENT_BOUNDARY}
