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
from functools import lru_cache
from typing import Any, AsyncIterator, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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


def get_store() -> CaseStore:
    assert _store is not None, "app not started"
    return _store


@asynccontextmanager
async def _lifespan(_app: FastAPI) -> AsyncIterator[None]:
    global _store
    _store = CaseStore.open()
    world = World.load()
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
