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
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

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
from .tenant import TenantAnswers, TorontoPack, quote_tenant

load_dotenv()

BACKTEST_PATH = Path(__file__).resolve().parents[3] / "eval" / "backtest.json"


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
        rows = [r for r in rows if r["status"] in OPEN_STATUSES or r["status"] == "referred"]
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
    from .maps import book
    if res not in (3, 5, 7):
        raise HTTPException(status_code=400, detail="res must be 3, 5 or 7")
    return book(_world, res, peril)


# ---------- ask (T9) ----------------------------------------------------------------------------

class AskRequest(BaseModel):
    question: str


@app.post("/ask")
async def ask_route(req: AskRequest) -> dict[str, Any]:
    from .ask import ask
    return await ask(req.question.strip(), get_store())


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


# ---------- Linq: digest out, commands in (T12) ---------------------------------------------------

_HUMAN_KIND = {"accept_with_subjectivity": "approve", "refer_with_subjectivity": "refer", "decline": "decline"}


class DigestRequest(BaseModel):
    n: int = 3


@app.post("/actions/digest")
def actions_digest(req: DigestRequest) -> dict[str, Any]:
    from .linq import send_digest
    return send_digest(get_store(), req.n)


def apply_command(case_id: str, command: str) -> str:
    """Write the underwriter's phone reply onto the case. Returns the text to reply with."""
    from .actions import append_after_run
    from .events import DecisionP

    store = get_store()
    data = store.get_case(case_id)
    if data is None:
        return f"No case {case_id} on the desk."
    if command == "why":
        return f"{case_id}: {data['case']['explanation']}"
    verdict, kind = command, _HUMAN_KIND[command]
    run = store.latest_run(case_id) or "human"
    append_after_run(store, case_id, run, "human", DecisionP(
        text=f"Underwriter replied by iMessage: {kind}", verdict=verdict,
        explanation=f"{kind} by the underwriter over Linq, on the desk's {data['case']['decision']['kind']} assessment.",
        verified=True))
    decision = {"kind": kind, "because": ["underwriter reply over Linq"], "by": "human"}
    data["case"]["decision"] = decision
    data["queue"]["decision"] = decision
    store.put_case(case_id, data)
    publish("decision", {"caseId": case_id, "decision": decision})
    return f"{kind.capitalize()}d {case_id}. Written to the case with the audit trail." if kind != "refer" \
        else f"Referred {case_id}. Written to the case with the audit trail."


@app.post("/webhooks/linq")
async def linq_webhook(request: Request) -> dict[str, Any]:
    """Always 200: log the raw payload first, then parse tolerantly (T12)."""
    from .linq import DIGEST_KEY, extract_text, log_raw, parse_command, send_text, verify

    raw = await request.body()
    headers = dict(request.headers)
    logged = log_raw(raw, headers)
    signature = verify(raw, headers)
    try:
        payload = json.loads(raw or b"{}")
    except json.JSONDecodeError:
        payload = {}
    text = extract_text(payload)
    parsed = parse_command(text)
    reply = None
    if parsed and signature is not False:
        command, index = parsed
        case_ids = get_store().cache_get(DIGEST_KEY) or []
        reply = (apply_command(case_ids[index - 1], command) if 1 <= index <= len(case_ids)
                 else f"I only sent {len(case_ids)} cases; reply with a number up to {len(case_ids)}.")
        if os.environ.get("ATLAS_ACTIONS") == "live":
            try:
                send_text(get_store(), reply)
            except Exception as exc:   # a failed reply must not fail the webhook
                reply += f" (reply send failed: {type(exc).__name__})"
    return {"ok": True, "logged": logged.name, "signatureValid": signature, "text": text,
            "command": parsed, "reply": reply}
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
