"""FastAPI shell. `uv run uvicorn atlas_api.app:app --port 8000`.

At startup, every submission is assessed once against the property_2025 guideline and the
resulting QueueRow/CaseView JSON is written to the SQLite CaseStore (case_store.py); /queue and
/cases/{id} are then plain store reads, well under the 500 ms accept bar. Field names follow
docs/sketch/contract.ts (QueueRow, DecisionView, CaseView) so the web lane's fixture-shaped
components render real data unchanged.
"""

from __future__ import annotations

import asyncio
import json
import os
from contextlib import asynccontextmanager
from functools import lru_cache
from pathlib import Path
from typing import Any, AsyncIterator, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from . import composio_routes
from .case import Case, Estimated, Known, Missing, OPEN_STATUSES, Value, World
from .case_store import CaseStore
from . import insights_routes
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
from .gemini_routes import router as gemini_router
from .linq_routes import router as linq_router
from .portfolio import ExposureIndex, open_index
from .tenant import TenantAnswers, TorontoPack, quote_tenant

load_dotenv()

BACKTEST_PATH = Path(__file__).resolve().parents[3] / "eval" / "backtest.json"


def _init_sentry() -> None:
    """AI Agent Monitoring + Tracing + Logs, one init (docs/research/sentry.md item 1). PII (full
    LLM prompts/completions, tool args) only ships when ATLAS_SENTRY_PII=1 -- off by default since
    fixtures could someday carry real broker text; span/log data (timings, tokens, cost, case ids)
    flows either way."""
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
    sentry_sdk.init(dsn=dsn, traces_sample_rate=1.0, enable_logs=True, integrations=integrations,
                    send_default_pii=os.environ.get("ATLAS_SENTRY_PII") == "1",
                    environment=os.environ.get("ATLAS_ENV", "hackathon"), release="pixie-api@1.0.0")


_init_sentry()

_store: CaseStore | None = None
_world: World | None = None
_index: ExposureIndex | None = None
_tasks: set[asyncio.Task] = set()


def get_store() -> CaseStore:
    assert _store is not None, "app not started"
    return _store


@asynccontextmanager
async def _lifespan(_app: FastAPI) -> AsyncIterator[None]:
    global _store, _world, _index
    _store = CaseStore.open()
    world = _world = World.load()
    _index = open_index(world)
    from .precedent import open_precedent_index
    insights_routes.init(world, open_precedent_index(world))
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


app = FastAPI(title="Pixie API", lifespan=_lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3100"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(insights_routes.router)
app.include_router(composio_routes.router)  # A7: Composio actions beyond the one email
app.include_router(linq_router)  # A5: tapbacks, typing, receipt images, in-thread quotes
app.include_router(gemini_router)  # A6: photo inventory, Maps grounding, TTS, code-execution check


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
    return {"kind": "routed", "to": d.to, "because": d.because, "reason": d.because}


def _factor_view(f: FactorResult) -> dict[str, Any]:
    return {
        "fact": f.fact,
        "possible": sorted(f.possible, key=lambda b: _BAND_ORDER[b]),
        "valueText": f.value_text,
        "provenance": f.provenance,
    }


def _interval(a: Assessment) -> dict[str, int] | None:
    """Routed cases have no interval: no guideline scored them, so 0-0 would read as a bad score."""
    if isinstance(a.decision, Routed):
        return None
    return {"lo": round(a.score.lo), "hi": round(a.score.hi)}


def queue_row(sub_id: int, status: str, case: Case, a: Assessment, insured_name: str) -> dict[str, Any]:
    return {
        "caseId": str(sub_id),
        "insured": insured_name,
        "line": case.line.v if isinstance(case.line, Known) else "?",
        "state": case.primary_admin.v if isinstance(case.primary_admin, Known) else "?",
        "status": status,
        "valueAtStake": _value_at_stake(case),
        "score": _interval(a),
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
        "score": _interval(a),
        "scoreWithoutEnrichment": (None if isinstance(a.decision, Routed) else
                                    {"lo": round(a.without_enrichment.lo), "hi": round(a.without_enrichment.hi)}),
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
def queue(view: Literal["open", "all", "consumer"] = "open") -> list[dict[str, Any]]:
    """Commercial submissions, plus the consumer referrals the desk is asked to review.

    A tenant quote is a different product scored on its own scale, so it joins the underwriter's queue
    only when it was referred; approved quotes live in `view=consumer`. Referrals sort last and carry
    region="toronto" and a label, so the web can group them under "Consumer referrals".
    """
    all_rows = [c["queue"] for c in get_store().list_cases()]
    tenant = [r for r in all_rows if r.get("region") == "toronto" or r.get("line") == "tenant"]
    commercial = [r for r in all_rows if r not in tenant]
    for r in commercial:
        r.setdefault("region", "us")
    for r in tenant:
        r.setdefault("region", "toronto")
        r.setdefault("label", "Consumer referral")
    if view == "consumer":
        return sorted(tenant, key=lambda r: r["caseId"])
    rows = commercial if view == "all" else [r for r in commercial if r["status"] in OPEN_STATUSES]
    # routed rows have no interval; they rank below every scored case, by value at stake
    rows.sort(key=lambda r: (0 if r["score"] else 1,
                              -((r["score"]["lo"] + r["score"]["hi"]) / 2 if r["score"] else 0),
                              -r["valueAtStake"]))
    referrals = [r for r in tenant if r["decision"]["kind"] == "refer"]
    return rows + sorted(referrals, key=lambda r: -r["valueAtStake"])


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
    from .events import ActionP, CaseFile, ChallengeP, DecisionP, FindingP, ResponseP

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
    view["scoreWithoutEnrichment"] = (None if isinstance(bare.decision, Routed) else
                                       {"lo": round(bare.score.lo), "hi": round(bare.score.hi)})
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
    challenge = next((e.payload for e in reversed(events) if isinstance(e.payload, ChallengeP)), None)
    response = next((e.payload for e in reversed(events) if isinstance(e.payload, ResponseP)), None)
    view["challenge"] = (None if challenge is None else {
        "argument": challenge.argument, "source": challenge.source, "verified": challenge.verified,
        "risks": [risk.model_dump() for risk in challenge.risks],
        "changeMyMind": challenge.change_my_mind,
        "responses": (response.responses if response else []),
        "verdictChanged": bool(response.verdict_changed) if response else False})
    # The engine's `decision` is the guideline's; `deskVerdict` is what the Lead settled on after the
    # conflicts and the Challenger, which can differ (a decline the desk refers with subjectivities).
    view["deskVerdict"] = f.decision.verdict
    view["explanation"] = f.decision.explanation
    view["explanationVerified"] = True
    view["actions"] = [{"key": e.payload.action, "channel": "email", "status": e.payload.status,
                        "at": str(e.ts)} for e in events if isinstance(e.payload, ActionP)]
    row = data["queue"]
    row.update(score=view["score"], decision=view["decision"], deskVerdict=f.decision.verdict,
               challengeRisks=len((view.get("challenge") or {}).get("risks") or []),
               deepDived=any(e.actor not in ("system", "lead") for e in events),
               enrichmentDelta=0 if view["score"] is None else round(a.score.mid - bare.score.mid))
    store.put_case(case_id, {"queue": row, "case": view})


class _FixedImpact:
    """The portfolio penalty the desk recorded, replayed into assess() without re-querying the index."""

    def __init__(self, points: float | None, finding: Any | None = None) -> None:
        self.points = points or 0.0
        self.near_tiv = float(getattr(finding, "value", 0.0) or 0.0)
        self.cell = ((finding.cells[0] if finding.cells else "") if finding else "")
        self.near_cells = tuple((finding.cells[1:] if finding and finding.cells else ()))
        self.backend = "recorded"

    def impact(self, _case: Case) -> "_FixedImpact":
        return self


class RunRequest(BaseModel):
    caseIds: list[str]
    mode: Literal["live", "replay"] = "replay"


MAX_CONCURRENT_RUNS = 2
_running: set[str] = set()


@app.post("/desk/run")
async def desk_run(req: RunRequest) -> dict[str, Any]:
    store, ids = get_store(), [c.removeprefix("SUB-") for c in req.caseIds]
    if req.mode == "replay" or os.environ.get("ATLAS_OFFLINE") == "1":
        return {"mode": "replay", "runs": {c: store.latest_run(c) for c in ids}}
    from .desk import Desk

    busy = sorted(set(ids) & _running)
    if busy:
        raise HTTPException(status_code=409, detail=f"already running: {', '.join(busy)}")
    if len(_running) + len(ids) > MAX_CONCURRENT_RUNS * 4:
        raise HTTPException(status_code=429, detail="too many desk runs in flight")

    async def go() -> None:
        try:
            await Desk(_world, store).run(ids, run_id=run_id)
            for c in ids:
                apply_desk_run(store, _world, c)
        finally:
            _running.difference_update(ids)

    import time
    run_id = f"r{int(time.time())}"
    _running.update(ids)
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
    if res not in (3, 5, 7):
        raise HTTPException(status_code=400, detail="res must be 3, 5 or 7")
    return _index.book(res, peril)


# ---------- ask (T9) ----------------------------------------------------------------------------

class AskRequest(BaseModel):
    question: str


@app.post("/ask")
async def ask_route(req: AskRequest) -> dict[str, Any]:
    from .ask import ask
    return await ask(req.question.strip(), get_store())


@app.post("/ops/ask")
async def ops_ask_route(req: AskRequest) -> dict[str, Any]:
    """"What broke in the last hour?" -- Pixie's own agent queries Sentry via MCP (item 13). Gated
    behind ATLAS_SENTRY_MCP so it never spins up npx by accident."""
    from .ops import ask_ops, enabled
    if not enabled():
        raise HTTPException(status_code=503, detail="ATLAS_SENTRY_MCP is not set; the Sentry ops tool is disabled")
    return {"question": req.question, "answer": await ask_ops(req.question.strip())}


# ---------- actions (T11) and the queue event bus (T13) -------------------------------------------

_bus: set[asyncio.Queue] = set()


def publish(kind: str, data: dict[str, Any]) -> None:
    """Fan a human decision or an action status out to every open /events/queue stream."""
    for q in list(_bus):
        q.put_nowait({"kind": kind, **data})


def _case_and_assessment(case_id: str):
    from .events import CaseFile
    store = get_store()
    case = _world.case(f"SUB-{case_id}")
    run = store.latest_run(case_id)
    if run:
        for name, value in CaseFile.fold(store.tail(case_id, run_id=run)).facts.items():
            case = case.with_fact(name, value, by="desk")
    rules = RulesFile.load(DEFAULT_RULES_DIR / "property_2025.yaml")
    return case, assess(case, rules), rules


@app.post("/cases/{case_id}/actions/request_info")
@app.post("/actions/{case_id}/request-info")
def action_request_info(case_id: str) -> dict[str, Any]:
    from .actions import request_broker_info
    from .events import ActionP

    store, case_id = get_store(), case_id.removeprefix("SUB-")
    if store.get_case(case_id) is None:
        raise HTTPException(status_code=404, detail=f"no case {case_id}")
    case, a, rules = _case_and_assessment(case_id)
    run = store.latest_run(case_id)
    facts = next((e.payload.facts for e in reversed(store.tail(case_id, run_id=run) if run else [])
                  if isinstance(e.payload, ActionP) and e.payload.action == "request_broker_info"), None)
    out = request_broker_info(store, case, a, rules, store.get_case(case_id)["case"]["title"], facts)
    apply_desk_run(store, _world, case_id) if run else None
    publish("action", {"caseId": case_id, "status": out["status"], "channel": "gmail", "key": out["id"]})
    from .telemetry import log
    log("action.send", case_id=case_id, action="request_broker_info", channel="gmail", status=out["status"])
    return out


@app.get("/outbox/{case_id}")
def outbox(case_id: str) -> list[dict[str, Any]]:
    return get_store().outbox_for(case_id.removeprefix("SUB-"))


@app.get("/events/queue", response_model=None)
async def queue_events(request: Request):
    """SSE of human decisions and action status, for live queue rows (T13)."""
    async def gen():
        q: asyncio.Queue = asyncio.Queue()
        _bus.add(q)
        try:
            yield "event: hello\ndata: {}\n\n"
            while not await request.is_disconnected():
                try:
                    item = await asyncio.wait_for(q.get(), timeout=15)
                    yield f"event: queue\ndata: {json.dumps(item)}\n\n"
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            _bus.discard(q)
    return StreamingResponse(gen(), media_type="text/event-stream")


# ---------- Linq (T12, deepened in A5) ------------------------------------------------------------
# All routes (/actions/digest, /webhooks/linq, /linq/quote, /linq/digest/status, /linq/group,
# /media/{filename}) live in linq_routes.py's own APIRouter; see the include_router call above.

# ---------- consumer quote ----------------------------------------------------------------------

class TenantAnswersRequest(BaseModel):
    contents_value: int = Field(alias="contentsValue", ge=10_000, le=250_000, multiple_of=1000)
    unit_level: Literal["basement", "ground", "upper"] = Field(alias="unitLevel")
    claims_3yr: int = Field(default=0, alias="claims3yr", ge=0)
    claims_5yr: int | None = Field(default=None, alias="claims5yr", ge=0)
    deductible: Literal[500, 1000, 2500] = 1000
    liability: Literal[1_000_000, 2_000_000] = 1_000_000
    sewer_backup: bool = Field(default=False, alias="sewerBackup")
    bundle_auto: bool = Field(default=False, alias="bundleAuto")


class TenantQuoteRequest(BaseModel):
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    answers: TenantAnswersRequest


@lru_cache(maxsize=1)
def _tenant_pack() -> TorontoPack:
    return TorontoPack()


@app.post("/quote/tenant")
def tenant_quote(req: TenantQuoteRequest) -> dict[str, Any]:
    if (req.lat is None) != (req.lng is None):
        raise HTTPException(status_code=422, detail="lat and lng must be supplied together")
    a = req.answers
    try:
        return quote_tenant(
            address=req.address, lat=req.lat, lng=req.lng,
            answers=TenantAnswers(
                contents_value=a.contents_value, unit_level=a.unit_level,
                claims_5yr=a.claims_5yr if a.claims_5yr is not None else a.claims_3yr,
                deductible=a.deductible, liability=a.liability,
                sewer_backup=a.sewer_backup, bundle_auto=a.bundle_auto,
            ),
            store=get_store(), pack=_tenant_pack(),
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.get("/map/toronto")
def map_toronto(lat: float, lng: float, k: int = 3) -> list[dict[str, Any]]:
    if not 0 <= k <= 6:
        raise HTTPException(status_code=422, detail="k must be between 0 and 6")
    return _tenant_pack().map_hexes(lat, lng, k)


@app.get("/backtest")
def backtest_report() -> dict[str, Any]:
    if not BACKTEST_PATH.exists():
        raise HTTPException(status_code=503, detail="backtest has not been generated")
    return json.loads(BACKTEST_PATH.read_text())


# ---------- one screen: combined stream, run totals, demo reset -----------------------------------

@app.get("/events/stream", response_model=None)
async def events_stream(request: Request, cases: str = "", replay: int = 0, speed: float = 1.0, after: int = 0):
    """Several cases on one SSE stream, in time order, each event carrying its caseId (the /live screen)."""
    store = get_store()
    ids = [c.strip().removeprefix("SUB-") for c in cases.split(",") if c.strip()] or \
        [c["queue"]["caseId"] for c in store.list_cases() if store.latest_run(c["queue"]["caseId"])]

    async def gen():
        if replay:
            events = sorted((e for cid in ids for e in store.tail(cid, run_id=store.latest_run(cid) or "")),
                            key=lambda e: e.t_ms)
            last = None
            for e in events:
                if last is not None and speed > 0:
                    await asyncio.sleep(max(0, e.t_ms - last) / 1000 / speed)
                last = e.t_ms
                yield _sse(e)
            return
        cursors = {cid: after for cid in ids}
        idle = 0.0
        while idle < 180 and not await request.is_disconnected():
            batch = []
            for cid in ids:
                for e in store.tail(cid, after_seq=cursors[cid]):
                    cursors[cid] = e.seq
                    batch.append(e)
            for e in sorted(batch, key=lambda e: (e.ts, e.seq)):
                yield _sse(e)
            idle = 0.0 if batch else idle + 0.25
            await asyncio.sleep(0.25)

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.get("/runs/{run_id}")
def run_totals(run_id: str) -> dict[str, Any]:
    """Cheap poll: per-case and total model calls, cost and elapsed seconds for one desk run."""
    from .events import DecisionP, NoteP, RunStatsP

    events = get_store().run_events(run_id)
    if not events:
        raise HTTPException(status_code=404, detail=f"no run {run_id}")
    cases: dict[str, dict[str, Any]] = {}
    for e in events:
        c = cases.setdefault(e.case_id, {"caseId": e.case_id, "events": 0, "calls": 0, "tokensIn": 0,
                                          "tokensOut": 0, "costUsd": 0.0, "elapsedS": 0.0, "verdict": None,
                                          "done": False})
        c["events"] += 1
        if isinstance(e.payload, (RunStatsP, NoteP)) and e.payload.calls is not None:
            stats = e.payload
            c["calls"] = stats.calls
            c["tokensIn"] = stats.tokens_in or c["tokensIn"]
            c["tokensOut"] = stats.tokens_out or c["tokensOut"]
            c["costUsd"] = stats.cost_usd or c["costUsd"]
            c["elapsedS"] = getattr(stats, "elapsed_s", None) or round((stats.ms or 0) / 1000, 1)
            c["done"] = c["done"] or isinstance(e.payload, NoteP)
        if isinstance(e.payload, DecisionP):
            c["verdict"] = e.payload.verdict
    rows = list(cases.values())
    return {"runId": run_id, "cases": rows, "running": run_id in {r for r in _running},
            "totals": {"cases": len(rows), "events": sum(r["events"] for r in rows),
                       "calls": sum(r["calls"] for r in rows), "costUsd": round(sum(r["costUsd"] for r in rows), 4),
                       "elapsedS": max((r["elapsedS"] for r in rows), default=0.0),
                       "done": all(r["done"] for r in rows)}}


def demo_reset(case_ids: list[str] | None = None) -> dict[str, Any]:
    """T14: drop the action events, outbox rows and human decisions, keep the recorded desk run and
    restore the stored view from it. Running it twice leaves the same state."""
    store = get_store()
    ids = case_ids or [c["queue"]["caseId"] for c in store.list_cases() if store.latest_run(c["queue"]["caseId"])]
    cleared = {}
    for cid in ids:
        events = store.delete_events(cid, {"action", "action_result"})
        events += store.delete_actor(cid, "human")
        outbox = store.delete_outbox(cid)
        apply_desk_run(store, _world, cid)
        if events or outbox:
            cleared[cid] = {"events": events, "outbox": outbox}
    store.cache_set("linq:last_digest", [])
    return {"reset": cleared, "cases": ids}


@app.post("/demo/reset")
def demo_reset_route() -> dict[str, Any]:
    return demo_reset()


# ---------- explainability (AUDIT 3.1): waterfall, what-if, sensitivity, precedent -----------------

TORONTO_SCORES = Path(__file__).resolve().parents[3] / "packs" / "toronto" / "hex_scores.json"


def _enriched(case_id: str):
    """(case, assessment, hazard multipliers, portfolio impact, events, rules) as the desk left it."""
    from . import layers
    from .events import CaseFile, FindingP

    store = get_store()
    run = store.latest_run(case_id)
    events = store.tail(case_id, run_id=run) if run else []
    case = _world.case(f"SUB-{case_id}")
    folded = CaseFile.fold(events)
    for name, value in folded.facts.items():
        case = case.with_fact(name, value, by="desk")
    port = next((e.payload for e in events if isinstance(e.payload, FindingP)
                 and e.payload.fact == "portfolio.concentration"), None)
    rules = RulesFile.load(DEFAULT_RULES_DIR / "property_2025.yaml")
    pack = layers.LayersPack(folded.hazard_multipliers) if folded.hazard_multipliers else None
    impact = _FixedImpact(port.score_delta, port) if port else None
    return case, assess(case, rules, pack, impact), folded.hazard_multipliers, impact, events, rules


def _tenant_view(case_id: str) -> dict[str, Any] | None:
    data = get_store().get_case(case_id)
    view = (data or {}).get("case")
    return view if view and view.get("kind") == "tenant" else None


@app.get("/cases/{case_id}/explain")
def case_explain(case_id: str) -> dict[str, Any]:
    """The contribution waterfall: 0 to the final interval, one step per factor, layer, penalty and cap."""
    from .explain import explain_payload, tenant_waterfall, toronto_percentiles

    case_id = case_id.removeprefix("SUB-")
    tenant = _tenant_view(case_id)
    if tenant is not None:
        cell = next((f["display"] for f in tenant["facts"] if f["id"] == "hex"), "")
        scores = json.loads(TORONTO_SCORES.read_text()) if TORONTO_SCORES.exists() else {}
        return tenant_waterfall(tenant, toronto_percentiles(cell, scores))
    if get_store().get_case(case_id) is None:
        raise HTTPException(status_code=404, detail=f"no case {case_id}")
    case, a, _hz, _impact, events, rules = _enriched(case_id)
    return explain_payload(case, a, rules, events)


class WhatIfRequest(BaseModel):
    overrides: dict[str, Any] = {}


@app.post("/cases/{case_id}/whatif")
def case_whatif(case_id: str, req: WhatIfRequest) -> dict[str, Any]:
    """Pure recompute: no model, no store write. Returns the new interval, decision, band diff and
    which single override decided it."""
    from .explain import whatif

    case_id = case_id.removeprefix("SUB-")
    if _tenant_view(case_id) is not None:
        raise HTTPException(status_code=400, detail="what-if runs on commercial cases; tenant quotes re-quote")
    if get_store().get_case(case_id) is None:
        raise HTTPException(status_code=404, detail=f"no case {case_id}")
    case, _a, hazard, impact, _events, rules = _enriched(case_id)
    return whatif(case, rules, req.overrides, hazard, impact)


@app.get("/cases/{case_id}/sensitivity")
def case_sensitivity(case_id: str) -> dict[str, Any]:
    """Per unresolved fact: the decision at each end of its range and the value where it flips."""
    from .explain import sensitivity

    case_id = case_id.removeprefix("SUB-")
    if get_store().get_case(case_id) is None or _tenant_view(case_id) is not None:
        raise HTTPException(status_code=404, detail=f"no scored commercial case {case_id}")
    case, _a, hazard, impact, _events, rules = _enriched(case_id)
    return sensitivity(case, rules, hazard, impact)


# `/cases/{id}/precedent` lives in insights_routes.py (Elastic hybrid + reranker over
# pixie-precedent); it accepts both `size` and `k`.


# ---------- the spoken briefing (ElevenLabs), with timing the screen can follow ---------------

@app.get("/cases/{case_id}/briefing")
def case_briefing(case_id: str) -> dict[str, Any]:
    """The case read aloud, plus one timed mark per sentence so the waterfall can follow along."""
    from . import briefing

    case_id = case_id.removeprefix("SUB-")
    data = get_store().get_case(case_id)
    if data is None:
        raise HTTPException(status_code=404, detail=f"no case {case_id}")
    sens = None
    if _tenant_view(case_id) is None:
        from .explain import sensitivity

        case, _a, hazard, impact, _events, rules = _enriched(case_id)
        sens = sensitivity(case, rules, hazard, impact)
    try:
        out = briefing.build(case_id, data["case"], sens)
    except RuntimeError as exc:                       # no key configured: the page stays silent
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {**out, "audioUrl": f"/briefings/{out['audio']}"}


@app.get("/briefings/{filename}")
def briefing_audio(filename: str) -> FileResponse:
    from . import briefing

    if "/" in filename or ".." in filename:
        raise HTTPException(status_code=404, detail="not found")
    path = briefing.AUDIO_DIR / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="not found")
    return FileResponse(path, media_type="audio/mpeg")
