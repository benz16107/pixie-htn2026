"""FastAPI shell. `uv run uvicorn atlas_api.app:app --port 8000`.

At startup, every submission is assessed once against the property_2025 guideline and the
resulting QueueRow/CaseView JSON is written to the SQLite CaseStore (case_store.py); /queue and
/cases/{id} are then plain store reads, well under the 500 ms accept bar. Field names follow
docs/sketch/contract.ts (QueueRow, DecisionView, CaseView) so the web lane's fixture-shaped
components render real data unchanged.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Literal

import asyncio
import json

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from .case import Case, Estimated, Known, Missing, OPEN_STATUSES, Value, World
from .case_store import CaseStore
from .engine import (
    DEFAULT_RULES_DIR,
    Assessment,
    Decided,
    FactorResult,
    Open,
    Routed,
    RulesFile,
    assess,
    explain,
    verify_numbers,
)

load_dotenv()


def _init_sentry() -> None:
    dsn = os.environ.get("SENTRY_DSN_API")
    if not dsn:
        return
    import sentry_sdk

    integrations = []
    try:
        from sentry_sdk.integrations.openai_agents import OpenAIAgentsIntegration
        integrations.append(OpenAIAgentsIntegration())
    except (ImportError, sentry_sdk.integrations.DidNotEnable):
        pass  # openai-agents isn't installed until T7; the integration slots in without a code change
    sentry_sdk.init(dsn=dsn, traces_sample_rate=1.0, enable_logs=True, integrations=integrations)


_init_sentry()

_store: CaseStore | None = None
_world: World | None = None
_tasks: set[asyncio.Task] = set()


def get_store() -> CaseStore:
    assert _store is not None, "app not started"
    return _store


@asynccontextmanager
async def _lifespan(_app: FastAPI) -> AsyncIterator[None]:
    global _store, _world
    _store = CaseStore.open()
    world = _world = World.load()
    rules = RulesFile.load(DEFAULT_RULES_DIR / "property_2025.yaml")
    for sub in world.submissions.values():
        case = world.case(f"SUB-{sub['id']}")
        a = assess(case, rules)
        insured = world.insureds.get(sub["insured"], {})
        insured_name = insured.get("name", "?")
        _store.put_case(str(sub["id"]), {
            "queue": queue_row(sub["id"], sub["status"], case, a, insured_name),
            "case": case_view(sub["id"], case, a, insured_name),
        })
        if _store.latest_run(str(sub["id"])):
            apply_desk_run(_store, world, str(sub["id"]))
    yield


app = FastAPI(title="Atlas API", lifespan=_lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3100"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- view builders: domain (Case, Assessment) -> contract.ts shapes -------------------------

_BAND_ORDER = {"target": 0, "acceptable": 1, "not_acceptable": 2}
_MONEYLIKE = {"tiv", "premium", "loss_5yr"}


def _value_at_stake(case: Case) -> float:
    if isinstance(case.tiv, Known):
        return case.tiv.v
    if isinstance(case.tiv, Estimated):
        return case.tiv.hi
    return 0.0


def _display(fact_id: str, v: Value) -> str:
    def fmt_scalar(x: Any) -> str:
        if isinstance(x, dict):
            return ", ".join(f"{k} {p:.0%}" for k, p in sorted(x.items(), key=lambda kv: -kv[1]))
        if isinstance(x, float) and x == int(x):
            x = int(x)
        if isinstance(x, (int, float)) and fact_id in _MONEYLIKE:
            return f"${x:,.0f}"
        return str(x)

    if isinstance(v, Known):
        return fmt_scalar(v.v)
    if isinstance(v, Estimated):
        if v.lo == v.hi:
            return f"est. {fmt_scalar(v.lo)}"
        return f"est. {fmt_scalar(v.lo)}-{fmt_scalar(v.hi)}"
    return "missing"


def _fact_view(fact_id: str, label: str, v: Value) -> dict[str, Any]:
    out = {
        "id": fact_id,
        "label": label,
        "display": _display(fact_id, v),
        "provenance": "known" if isinstance(v, Known) else "estimated" if isinstance(v, Estimated) else "missing",
        "source": v.source if isinstance(v, Known) else v.method if isinstance(v, Estimated) else v.reason,
    }
    if isinstance(v, Missing):
        out["resolver"] = v.resolver
    return out


_FACT_LABELS = {
    "line": "Line of business", "business_type": "Business type", "primary_admin": "Primary state",
    "tiv": "TIV", "premium": "Premium", "year_built": "Year built",
    "construction_share": "Construction", "loss_5yr": "Loss history 5 yr",
}


def _decision_view(a: Assessment) -> dict[str, Any]:
    d = a.decision
    if isinstance(d, Decided):
        return {"kind": d.kind, "because": list(d.because), "by": "desk"}
    if isinstance(d, Open):
        return {"kind": "open", "straddles": d.straddles,
                "flippers": [{"fact": f.fact, "resolver": f.resolver} for f in d.flippers]}
    return {"kind": "routed", "to": d.to, "because": d.because}


def _factor_view(f: FactorResult) -> dict[str, Any]:
    return {
        "fact": f.fact,
        "possible": sorted(f.possible, key=lambda b: _BAND_ORDER[b]),
        "valueText": f.value_text,
        "provenance": f.provenance,
    }


def queue_row(sub_id: int, status: str, case: Case, a: Assessment, insured_name: str) -> dict[str, Any]:
    return {
        "caseId": str(sub_id),
        "insured": insured_name,
        "line": case.line.v if isinstance(case.line, Known) else "?",
        "state": case.primary_admin.v if isinstance(case.primary_admin, Known) else "?",
        "status": status,
        "valueAtStake": _value_at_stake(case),
        "score": {"lo": round(a.score.lo), "hi": round(a.score.hi)},
        "decision": _decision_view(a),
        "issues": [{"kind": i.kind, "severity": i.severity} for i in case.issues],
        "deepDived": False,       # no desk (T7) has run yet
        "enrichmentDelta": 0,     # no region pack (A3) enriches the score yet
    }


def case_view(sub_id: int, case: Case, a: Assessment, insured_name: str) -> dict[str, Any]:
    explanation = explain(a)
    return {
        "caseId": str(sub_id),
        "kind": case.kind,
        "title": insured_name,
        "facts": [_fact_view(fid, label, case.fact(fid)) for fid, label in _FACT_LABELS.items()],
        "factors": [_factor_view(f) for f in a.factors],
        "score": {"lo": round(a.score.lo), "hi": round(a.score.hi)},
        "scoreWithoutEnrichment": {"lo": round(a.without_enrichment.lo), "hi": round(a.without_enrichment.hi)},
        "decision": _decision_view(a),
        # no region pack yet (A3): an inert risk profile rather than a fabricated one
        "risk": {"factors": [], "total": 1.0, "totalCapped": False, "skipped": []},
        "portfolio": None,
        "contradictions": [{"good": list(c.good), "bad": list(c.bad), "resolve": list(c.what_would_resolve)}
                            for c in a.contradictions],
        "explanation": explanation,
        "explanationVerified": verify_numbers(explanation, a),
        "issues": [{"kind": i.kind, "severity": i.severity, "text": i.text} for i in case.issues],
        "actions": [],
        "site": {"lat": case.sites[0].lat, "lng": case.sites[0].lng} if case.sites else {"lat": 0.0, "lng": 0.0},
    }


# ---------- routes -----------------------------------------------------------------------------

@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True}


@app.get("/queue")
def queue(view: Literal["open", "all"] = "open") -> list[dict[str, Any]]:
    rows = [c["queue"] for c in get_store().list_cases()]
    if view == "open":
        rows = [r for r in rows if r["status"] in OPEN_STATUSES]
    rows.sort(key=lambda r: (-(r["score"]["lo"] + r["score"]["hi"]) / 2, -r["valueAtStake"]))
    return rows


@app.get("/cases/{case_id}")
def get_case(case_id: str) -> dict[str, Any]:
    data = get_store().get_case(case_id)
    if data is None:
        raise HTTPException(status_code=404, detail=f"no case {case_id}")
    return data["case"]


# ---------- desk (T7/T8) ----------------------------------------------------------------------------

def apply_desk_run(store: CaseStore, world: World, case_id: str) -> None:
    """Fold the latest desk run of a case into its stored QueueRow/CaseView: enriched interval, hazard
    factors, portfolio line, the verified explanation, proposed actions. Deterministic, no model."""
    from . import layers
    from .desk import Desk
    from .events import ActionP, CaseFile, DecisionP, FindingP

    events = store.tail(case_id, run_id=store.latest_run(case_id))
    f = CaseFile.fold(events)
    if f.decision is None:
        return
    rules = RulesFile.load(DEFAULT_RULES_DIR / "property_2025.yaml")
    case = world.case(f"SUB-{case_id}")
    for name, value in f.facts.items():
        case = case.with_fact(name, value, by="desk")
    port = next((e.payload for e in events if isinstance(e.payload, FindingP)
                 and e.payload.fact == "portfolio.concentration"), None)
    pack = layers.LayersPack(f.hazard_multipliers) if f.hazard_multipliers else None
    a = assess(case, rules, pack, _FixedImpact(port.score_delta) if port else None)
    bare = assess(case, rules)
    data = store.get_case(case_id)
    insured = world.insureds.get(world.submissions[int(case_id)]["insured"], {}).get("name", "?")
    view = case_view(int(case_id), case, a, insured)
    view["scoreWithoutEnrichment"] = {"lo": round(bare.score.lo), "hi": round(bare.score.hi)}
    hz = [e.payload for e in events if isinstance(e.payload, FindingP) and e.payload.multiplier is not None]
    view["risk"] = {
        "factors": [{"peril": p.text.split(":")[0], "line": p.text, "applied": p.multiplier, "capped": False,
                     "source": p.source, "citation": p.fact} for p in hz],
        "total": getattr(a.risk, "total", 1.0), "totalCapped": False,
        "skipped": [[p.skipped, p.text] for e in events if isinstance((p := e.payload), FindingP) and p.skipped],
    }
    if port:
        view["portfolio"] = {"line": port.text, "points": port.score_delta, "neighbourhoodTiv": port.value,
                             "threshold": 25_000_000}
    view["explanation"] = f.decision.explanation
    view["explanationVerified"] = True
    view["actions"] = [{"key": e.payload.action, "channel": "email", "status": e.payload.status,
                        "at": str(e.ts)} for e in events if isinstance(e.payload, ActionP)]
    row = data["queue"]
    row.update(score=view["score"], decision=view["decision"], deepDived=any(e.actor != "system" and e.actor != "lead" for e in events),
               enrichmentDelta=round((a.score.mid - bare.score.mid)))
    store.put_case(case_id, {"queue": row, "case": view})


class _FixedImpact:
    def __init__(self, points: float | None) -> None:
        self.points = points or 0.0

    def impact(self, _case: Case) -> "_FixedImpact":
        return self


class RunRequest(BaseModel):
    caseIds: list[str]
    mode: Literal["live", "replay"] = "replay"


@app.post("/desk/run")
async def desk_run(req: RunRequest) -> dict[str, Any]:
    store, ids = get_store(), [c.removeprefix("SUB-") for c in req.caseIds]
    if req.mode == "replay" or os.environ.get("ATLAS_OFFLINE") == "1":
        return {"mode": "replay", "runs": {c: store.latest_run(c) for c in ids}}
    from .desk import Desk

    async def go() -> None:
        await Desk(_world, store).run(ids, run_id=run_id)
        for c in ids:
            apply_desk_run(store, _world, c)

    import time
    run_id = f"r{int(time.time())}"
    task = asyncio.create_task(go())
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)
    return {"mode": "live", "runId": run_id, "caseIds": ids}


def _sse(e) -> str:
    return f"id: {e.seq}\nevent: desk\ndata: {json.dumps(e.wire())}\n\n"


@app.get("/cases/{case_id}/events", response_model=None)
async def case_events(case_id: str, request: Request, after: int = 0, replay: int = 0, speed: float = 1.0):
    """JSON list of the latest run by default (the web's fetch); SSE when replay=1 (recorded timing / speed)
    or when the client asks for text/event-stream (live tail until the run closes)."""
    from .desk import replay as replay_run
    from .events import NoteP

    store = get_store()
    case_id = case_id.removeprefix("SUB-")
    if replay:
        async def gen():
            async for e in replay_run(store, case_id, speed=speed, after=after):
                yield _sse(e)
        return StreamingResponse(gen(), media_type="text/event-stream")
    if "text/event-stream" in request.headers.get("accept", ""):
        async def tail():
            cursor, idle = after, 0.0
            while idle < 120 and not await request.is_disconnected():
                batch = store.tail(case_id, after_seq=cursor)
                for e in batch:
                    cursor = e.seq
                    yield _sse(e)
                    if isinstance(e.payload, NoteP) and e.payload.calls is not None:
                        return
                idle = 0.0 if batch else idle + 0.25
                await asyncio.sleep(0.25)
        return StreamingResponse(tail(), media_type="text/event-stream")
    run_id = store.latest_run(case_id)
    return [e.wire() for e in store.tail(case_id, after_seq=after, run_id=run_id)] if run_id else []


# ---------- maps --------------------------------------------------------------------------------

@app.get("/map/pins")
def map_pins() -> list[dict[str, Any]]:
    from .maps import pins
    return pins(_world, {c["queue"]["caseId"]: c["queue"]["decision"]["kind"] for c in get_store().list_cases()})


@app.get("/map/book")
def map_book(res: int = 5, peril: str = "") -> list[dict[str, Any]]:
    from .maps import book
    if res not in (3, 5, 7):
        raise HTTPException(status_code=400, detail="res must be 3, 5 or 7")
    return book(_world, res, peril)
