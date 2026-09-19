"""The multi-agent underwriting desk (T7): five OpenAI Agents SDK agents over one event log per case.

    desk = Desk(world, store)
    await desk.run(["138", "126", "143"])        # posts DeskEvents; returns {case_id: CaseResult}

Roster (each an `agents.Agent` with a pydantic output_type; model ids from .env):
  lead       flagship model. Plans deep dives from the code triage (interval, Decided/Open/Routed,
             flippers, value at stake), may raise the code's depth floor but never lower it, briefs
             specialists with addressed asks, resolves each code-computed conflict from its allowed set,
             writes the decision explanation (checked by verify_numbers, template fallback).
  intake     explains the hydration path, writes/lints/runs Federato queries (retry from the parsed
             FederatoError), runs estimate_premium.
  hazard     picks which cached layers to read per location; each finding carries the engine's score delta.
  portfolio  concentration of active property TIV near the case (H3 res 5 + 30 km, in memory).
  appetite   runs the deterministic engine on the enriched case and narrates contradictions.

Specialists address asks to each other through their structured output (`asks`); the scheduler posts
the ask event and runs the addressee's answer turn. Every tool the SDK calls is mirrored into a
`tool_call` event by `_Hooks`. No number comes from a model: tools compute, and every model sentence
that reaches the log passes verify_numbers against the strings tools returned, or is replaced.
"""

from __future__ import annotations

import asyncio
import json
import math
import os
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

import sentry_sdk
from agents import Agent, RunHooks, Runner, function_tool
from pydantic import BaseModel

from . import layers
from .case import Case, Estimated, Known, Missing, World
from .case_store import CaseStore
from .engine import (DEFAULT_RULES_DIR, Assessment, Decided, Open, Routed, RulesFile, assess,
                     estimate_premium, explain, risk_points)
from .events import (ActionP, Actor, AnswerP, AskP, AssessmentP, CaseFile, ConflictP, DecisionP, DeskEvent,
                     EstimateP, FindingP, GapP, NoteP, Option, Payload, PlanP, QueryP, QueryRetryP,
                     ResolutionP, RunStatsP, ScoreP, ToolCallP)
from .portfolio import RADIUS_KM, ExposureIndex, open_index
from .telemetry import log, verify_numbers_alert

API_DIR = Path(__file__).resolve().parents[2]
Depth = Literal["skim", "standard", "deep"]
_DEPTH_RANK = {"skim": 0, "standard": 1, "deep": 2}
Specialist = Literal["intake", "appetite", "hazard", "portfolio"]

# $ per 1M tokens (input, output), developers.openai.com/api/docs/pricing, 2026-09-19
PRICES = {"gpt-6-astra": (10.0, 50.0), "gpt-5.6-luna": (0.20, 1.20), "gpt-5.6-sol": (4.0, 20.0)}


# ---------- Federato: one client + schema graph per process ---------------------------------------

_FED: tuple | None = None


def federato_tools():
    """(FederatoClient, SchemaGraph, QueryBuilder) with caches pinned under api/ whatever the cwd."""
    global _FED
    if _FED is None:
        from .federato import FederatoClient, JsonFileCache, QueryBuilder, SchemaGraph
        c = FederatoClient.from_env()
        c.cache_dir, c.token_path = API_DIR / "cache", API_DIR / ".token"
        c.query_cache = JsonFileCache(API_DIR / "cache" / "federato" / "q")
        c._schema_cache_path = API_DIR / "cache" / "federato" / "schema.json"
        graph = SchemaGraph.from_schema(c.schema())
        _FED = (c, graph, QueryBuilder(graph))
    return _FED


# ---------- config ------------------------------------------------------------------------------

@dataclass(frozen=True)
class ModelConfig:
    lead: str
    specialist: str

    @staticmethod
    def from_env() -> "ModelConfig":
        return ModelConfig(os.environ.get("ATLAS_MODEL_LEAD", "gpt-6-astra"),
                           os.environ.get("ATLAS_MODEL_SPECIALIST", "gpt-5.6-luna"))


@dataclass(frozen=True)
class DeskPolicy:
    concurrency: int = 4                 # agent turns in flight across the whole run
    max_llm_calls_per_case: int = 20     # model requests (tool loops count each request)
    max_ask_rounds: int = 2              # specialist-to-specialist rounds
    max_turns: int = 8                   # per agent turn
    max_query_attempts: int = 3          # Intake's lint/run/retry loop per turn
    live_timeout_s: float = 85
    deep_tiv: float = 20_000_000


BLOCKING_ISSUES = {"duplicate_account", "stale_submission", "limit_vs_tiv"}


def depth_floor(a: Assessment, value_at_stake: float, policy: DeskPolicy,
                issues: tuple[Any, ...] = ()) -> tuple[Depth, str]:
    """Code's proposal. The Lead may raise it, never lower it.

    A blocking data issue raises the floor even when the appetite verdict looks fixed, because the
    issue changes what the verdict means: an underwriter would not decline a duplicate account
    without checking which broker owns it, would not decline a stale submission without confirming
    it is stale, and would not act on a requested limit that sits far below the insured value.
    """
    blocking = [i for i in issues if i.kind in BLOCKING_ISSUES]
    d = a.decision
    if isinstance(d, Open):
        flips = ", ".join(f"{f.fact} ({f.resolver})" for f in d.flippers) or "an estimated hard-fail factor"
        if value_at_stake >= policy.deep_tiv:
            return "deep", f"open, straddles {d.straddles:.0f}, ${value_at_stake:,.0f} at stake, flippers: {flips}"
        return "standard", f"open, straddles {d.straddles:.0f}, flippers: {flips}"
    if blocking:
        kinds = ", ".join(sorted({i.kind for i in blocking}))
        verdict = d.kind if isinstance(d, Decided) else f"route to {d.to}"
        return "standard", (f"{verdict} on the guideline, but a blocking data issue ({kinds}) changes what that "
                            f"verdict means: {blocking[0].text}")
    if isinstance(d, Decided):
        return "skim", f"decided {d.kind} on {', '.join(d.because) or 'score'}; no fact can flip it"
    return "skim", f"routed to {d.to}"


# ---------- verify_numbers ---------------------------------------------------------------------------

_NUM = re.compile(r"(?<![\w.])\$?(\d[\d,]*(?:\.\d+)?)\s?([kKmMbB](?![a-zA-Z]))?")


def _numbers(text: str) -> list[tuple[str, float, float]]:
    """(token, value, rounding tolerance) for every number in text; $2.1M -> 2,100,000 +/- 50,000."""
    out = []
    for m in _NUM.finditer(text):
        digits, suffix = m.group(1).rstrip(",").replace(",", ""), (m.group(2) or "").lower()
        if not digits or digits.endswith("."):
            digits = digits.rstrip(".")
        scale = {"k": 1e3, "m": 1e6, "b": 1e9}.get(suffix, 1.0)
        decimals = len(digits.split(".")[1]) if "." in digits else 0
        out.append((m.group(0).strip(), float(digits) * scale, 0.5 * 10 ** -decimals * scale if suffix else 1e-9))
    return out


def verify_numbers(text: str, facts: list[str] | dict[str, str]) -> list[str]:
    """Numbers in `text` that no computed fact string contains (after $/K/M normalisation). [] = pass."""
    corpus = facts.values() if isinstance(facts, dict) else facts
    allowed = [v for s in corpus for _t, v, _tol in _numbers(s)]
    return [tok for tok, v, tol in _numbers(text) if not any(abs(a - v) <= tol for a in allowed)]


# ---------- structured outputs ------------------------------------------------------------------------

class Brief(BaseModel):
    to: Specialist
    question: str


class CasePlan(BaseModel):
    case_id: str
    depth: Depth
    reason: str
    briefs: list[Brief]


class LeadPlan(BaseModel):
    plans: list[CasePlan]


class AddressedAsk(BaseModel):
    to: Specialist
    question: str


class SpecialistReport(BaseModel):
    answer: str                    # reply to the Lead's brief (or "" if none)
    summary: str
    asks: list[AddressedAsk]       # empty unless another specialist holds a fact you need


class AnswerOut(BaseModel):
    answer: str


class ResolutionOut(BaseModel):
    conflict_id: str
    option: Option
    reason: str


class LeadDecision(BaseModel):
    resolutions: list[ResolutionOut]
    verdict: Option
    explanation: str


_NUMBERS_RULE = ("Never compute or invent a number. Only repeat numbers exactly as they appear in tool results "
                 "or the case digest; a checker rejects any other number.")

PROMPTS: dict[str, str] = {
    "lead_plan": (
        "You are the Lead underwriter of a five-agent desk. For each case you get the code triage: score interval, "
        "decision (decided/open/routed), flippers (facts that could change the decision, with who can resolve them), "
        "value at stake, data issues and the code's depth floor. Choose a depth per case: skim (no deep dive), "
        "standard, or deep. You may raise the floor, never lower it; raise only with a concrete reason. For each case "
        "with depth standard or deep, write 1-3 briefs: short questions addressed to intake, hazard, portfolio or "
        "appetite, each tied to a flipper or data issue. A case whose floor cites a blocking data issue is "
        "already declined or routed on the guideline; the work there is to establish what the issue means "
        "(which broker owns a duplicate account, whether a stale submission is really stale, why a requested "
        "limit sits far below the insured value), not to re-argue appetite. " + _NUMBERS_RULE),
    "intake": (
        "You are Intake. Explain which hydration path produced the insured value (call hydration_paths), verify it "
        "with exactly one Federato query you write yourself (run_federato_query; it lints before running; if it "
        "returns a lint issue or an API error, fix the payload and retry once), and call estimate_premium when "
        "premium is missing. Query grammar: {\"resource\": \"<Resource>\", \"where\": {\"id\": 7}, \"expand\": {\"<ref field>\": {\"<nested ref>\": true}}, \"select\": [\"field\", \"ref.field\"]}; resource names are singular and capitalised (Submission, Insured, Location, Building, Policy...); a dot-path through an array field needs $elemMatch or unwind. Answer the Lead's brief in 1-2 sentences. Ask another specialist only if you need "
        "something only they can compute. " + _NUMBERS_RULE),
    "hazard": (
        "You are Hazard. Call site_layers, then for each location decide which cached layers are worth reading "
        "for this site (use_layer) and which to skip (skip_layer) with a one-line reason each, e.g. skip earthquake "
        "where the region is not seismic. Read at least flood. A missing layer is a gap, never a guess. Answer the "
        "Lead's brief in 1-2 sentences. " + _NUMBERS_RULE),
    "portfolio": (
        "You are Portfolio. Call concentration to get the active property TIV already held near this case. "
        "Concentration counts TIV regardless of peril, so address one ask to hazard: which perils drive the risk "
        "at this site, so the underwriter knows whether the neighbouring policies share it. Answer the Lead's brief "
        "in 1-2 sentences. " + _NUMBERS_RULE),
    "appetite": (
        "You are Appetite. Call assess_case: it runs the deterministic guideline engine on the case with every "
        "finding folded in. You cannot change a score or a band. Write `summary` as 2-3 plain sentences an "
        "underwriter would say out loud, in this order: (1) what moved the interval and why, naming the fact and "
        "the finding that moved it; (2) the contradiction, spelled out as 'X is in <band> but Y is not acceptable' "
        "or 'the decision hangs on an estimate of Z'; (3) which single fact would settle it and who can supply it "
        "(broker, intake, hazard, portfolio). Never write bare jargon like 'Open; interval 30-75'. You may ask "
        "intake one question if a fact it owns would settle the contradiction. " + _NUMBERS_RULE),
    "answer": "Answer the question from another agent on the desk in 1-2 sentences, using your tools if needed. "
              + _NUMBERS_RULE,
    "lead_decide": (
        "You are the Lead underwriter. Code has detected conflicts between specialists; resolve every one by picking "
        "an option from its `allowed` list only, with a one-sentence reason citing findings. Then pick the verdict "
        "from `verdict_allowed` and write a 2-3 sentence explanation for the underwriter. " + _NUMBERS_RULE),
}


# ---------- one case's run state ------------------------------------------------------------------------

@dataclass
class CaseResult:
    case: Case
    assessment: Assessment
    decision: DecisionP
    calls: int
    tokens_in: int
    tokens_out: int
    cost_usd: float
    seconds: float


@dataclass
class _CaseRun:
    desk: "Desk"
    case_id: str                   # "138": the web and store id
    case: Case
    triage: Assessment
    run_id: str
    t0: float
    facts: list[str] = field(default_factory=list)       # every string code computed: the verify whitelist
    calls: int = 0
    tokens_in: int = 0
    tokens_out: int = 0
    cost_usd: float = 0.0
    query_attempts: int = 0
    used_layers: set[str] = field(default_factory=set)

    def post(self, actor: Actor, payload: Payload, refs: list[str] | None = None) -> DeskEvent:
        e = DeskEvent.make(self.case_id, self.run_id, actor, payload, t0=self.t0, refs=refs)
        self.desk.store.append(e)
        return e

    def events(self) -> list[DeskEvent]:
        return self.desk.store.tail(self.case_id, run_id=self.run_id)

    def fact(self, s: str) -> str:
        self.facts.append(s)
        return s

    def checked(self, text: str, fallback: str, agent: str = "lead") -> tuple[str, bool]:
        bad = verify_numbers(text, self.facts)
        if bad:
            verify_numbers_alert(self.case_id, agent, text, bad, self.facts)
            return fallback, False
        return text, True

    def charge(self, model: str, usage: Any) -> None:
        pin, pout = PRICES.get(model, (0.0, 0.0))
        self.calls += usage.requests
        self.tokens_in += usage.input_tokens
        self.tokens_out += usage.output_tokens
        self.cost_usd += (usage.input_tokens * pin + usage.output_tokens * pout) / 1e6

    # the enriched case = base case + every fact the log added; hazard/portfolio feed the engine hooks
    def enriched(self) -> tuple[Case, Assessment]:
        f = CaseFile.fold(self.events())
        case = self.case
        for name, value in f.facts.items():
            case = case.with_fact(name, value, by="desk")
        pack = layers.LayersPack(f.hazard_multipliers) if f.hazard_multipliers else None
        portfolio = self.desk.portfolio if any(
            isinstance(e.payload, FindingP) and e.payload.fact == "portfolio.concentration" for e in self.events()) else None
        return case, assess(case, self.desk.rules, pack, _PortfolioHook(portfolio, self.desk.insured_of(self.case_id))
                            if portfolio else None)


@dataclass
class _PortfolioHook:
    index: ExposureIndex
    insured: int

    def impact(self, case: Case) -> Any:
        return self.index.impact(case, self.insured)


class _Hooks(RunHooks):
    """Mirror every SDK tool call into a tool_call event in the calling agent's lane."""

    def __init__(self, run: _CaseRun) -> None:
        self.run = run
        self.started: dict[str, float] = {}

    async def on_tool_start(self, context, agent, tool) -> None:
        self.started[getattr(context, "tool_call_id", tool.name)] = time.perf_counter()

    async def on_tool_end(self, context, agent, tool, result) -> None:
        t = self.started.pop(getattr(context, "tool_call_id", tool.name), time.perf_counter())
        try:
            args = json.loads(getattr(context, "tool_arguments", "") or "{}")
        except json.JSONDecodeError:
            args = {"raw": getattr(context, "tool_arguments", "")}
        summary = str(result)
        self.run.post(agent.name, ToolCallP(text=f"{tool.name}: {summary[:90]}", tool=tool.name, args=args,
                                            result=summary[:600], ms=int((time.perf_counter() - t) * 1000)))


def _fmt_money(x: float) -> str:
    return f"${x:,.0f}"


def _decision_kind(a: Assessment) -> str:
    d = a.decision
    return d.kind if isinstance(d, Decided) else "open" if isinstance(d, Open) else "routed"


def _assessment_payload(a: Assessment, text: str) -> AssessmentP:
    flips = [f.fact for f in a.decision.flippers] if isinstance(a.decision, Open) else []
    return AssessmentP(text=text, score=ScoreP(lo=round(a.score.lo), hi=round(a.score.hi)),
                       decision=_decision_kind(a), flippers=flips)


def allowed_options(a: Assessment) -> list[Option]:
    d = a.decision
    if isinstance(d, Routed):
        return ["route"]
    if isinstance(d, Decided):
        return ["decline", "refer_with_subjectivity"] if d.kind == "decline" else ["accept_with_subjectivity", "refer_with_subjectivity"]
    return ["request_info", "refer_with_subjectivity"]


def detect_conflicts(a: Assessment, rules: RulesFile, hazard_total: float | None,
                     portfolio_points: float | None) -> list[ConflictP]:
    """Stances come from typed outputs (engine factors, layer multipliers, portfolio points), not prose."""
    failing = [f.fact for f in a.factors if f.possible == frozenset({"not_acceptable"})]
    appetite = "against" if failing else "favour" if isinstance(a.decision, Decided) and a.decision.kind == "accept" else "neutral"
    hazard = None if hazard_total is None else "favour" if hazard_total < 1.0 else "against" if hazard_total > 1.1 else "neutral"
    portfolio = None if portfolio_points is None else "against" if portfolio_points <= -5 else "neutral"
    allowed = allowed_options(a)
    out: list[ConflictP] = []
    hard = {r.fact for r in rules.rules if r.hard_fail}
    for f in a.factors:
        if f.provenance == "estimated" and f.fact in hard and "not_acceptable" in f.possible:
            out.append(ConflictP(
                text=f"{f.fact} is estimated at {f.value_text}, which fails the guideline, but an estimate cannot hard-fail on its own",
                conflict_id=f"estimate_vs_threshold:{f.fact}", stances={"intake": "against", "appetite": "neutral"},
                about=[f.fact], allowed=[o for o in allowed if o != "decline"] or allowed))
    if appetite == "against" and hazard == "favour":
        out.append(ConflictP(
            text=f"Appetite fails {', '.join(failing)} while Hazard finds below-average risk (total x{hazard_total:.2f})",
            conflict_id="appetite_vs_hazard", stances={"appetite": "against", "hazard": "favour"},
            about=failing + ["hazard"], allowed=allowed))
    if portfolio == "against" and appetite != "against":
        out.append(ConflictP(
            text=f"Portfolio concentration costs {portfolio_points} points while appetite has no failing factor",
            conflict_id="portfolio_vs_appetite", stances={"portfolio": "against", "appetite": appetite},
            about=["portfolio.concentration"], allowed=allowed))
    return out


# ---------- the desk ---------------------------------------------------------------------------------------

class Desk:
    def __init__(self, world: World, store: CaseStore, models: ModelConfig | None = None,
                 policy: DeskPolicy | None = None) -> None:
        self.world = world
        self.store = store
        self.models = models or ModelConfig.from_env()
        self.policy = policy or DeskPolicy()
        self.rules = RulesFile.load(DEFAULT_RULES_DIR / "property_2025.yaml")
        self.portfolio = open_index(world, max_penalty=(self.rules.portfolio_points or {}).get("max_penalty", 10))
        self.sem = asyncio.Semaphore(self.policy.concurrency)
        self._fed = None

    def insured_of(self, case_id: str) -> int:
        return self.world.submissions[int(case_id)]["insured"]

    def federato(self):
        return federato_tools()

    # ---- model turns --------------------------------------------------------------------------

    async def _turn(self, run: _CaseRun, agent: Agent, prompt: str, reserve: int = 3) -> Any | None:
        """`reserve` keeps model calls back for the Lead's decision, which runs with reserve=0."""
        if run.calls >= self.policy.max_llm_calls_per_case - reserve:
            run.post("system", NoteP(text=f"Budget: skipped {agent.name} turn, {run.calls} model calls used"))
            return None
        async with self.sem:
            try:
                r = await Runner.run(agent, prompt, hooks=_Hooks(run), max_turns=self.policy.max_turns)
            except Exception as exc:  # a failed turn is a note in the lane, not a failed case
                run.post("system", NoteP(text=f"{agent.name} turn failed: {type(exc).__name__}"))
                return None
        run.charge(str(agent.model), r.context_wrapper.usage)
        run.post("system", RunStatsP(
            text=f"{run.calls} model calls, ${run.cost_usd:.3f}, {time.time() - run.t0:.0f} s",
            calls=run.calls, tokens_in=run.tokens_in, tokens_out=run.tokens_out,
            cost_usd=round(run.cost_usd, 4), elapsed_s=round(time.time() - run.t0, 1), phase=agent.name))
        return r.final_output

    def _digest(self, run: _CaseRun) -> str:
        c, a = run.case, run.triage
        facts = {n: (c.fact(n).v if isinstance(c.fact(n), Known) else
                     f"estimated {c.fact(n).point} ({c.fact(n).method})" if isinstance(c.fact(n), Estimated)
                     else f"missing, resolver {c.fact(n).resolver}")
                 for n in ("line", "business_type", "primary_admin", "tiv", "premium", "year_built",
                           "construction_share", "loss_5yr")}
        if isinstance(c.tiv, Known):
            facts["tiv"] = _fmt_money(c.tiv.v)
        d = {"case": run.case_id, "facts": facts,
             "sites": [{"location_id": s.id, "state": s.admin, "lat": s.lat, "lng": s.lng, "tags": list(s.tags),
                        "buildings": len(s.buildings)} for s in c.sites],
             "issues": [i.text for i in c.issues],
             "triage": {"score": f"{a.score.lo:.0f}-{a.score.hi:.0f}", "decision": _decision_kind(a),
                        "thresholds": self.rules.thresholds}}
        return run.fact(json.dumps(d, default=str))

    # ---- tools, closed over one case run and one actor --------------------------------------------

    def _intake_tools(self, run: _CaseRun) -> list:
        desk = self

        @function_tool
        def hydration_paths() -> str:
            """Where the insured value came from: the hydration plan used and the schema's alternatives."""
            c = run.case
            plan = "bound: Policy.exposure_units -> location -> buildings" if "Policy" in str(getattr(c.tiv, "source", "")) \
                else "open: Insured.hq -> buildings (open submissions have no policy or building link)"
            try:
                _c, graph, _qb = desk.federato()
                alts = [p.describe() for p in graph.paths("Submission", "Building.tiv")][:4]
                schema = [ln for ln in graph.summary().splitlines() if ln.split(":")[0] in ("Submission", "Insured", "Location", "Building")]
            except Exception as exc:
                alts, schema = [f"schema unavailable: {type(exc).__name__}"], []
            tiv = c.tiv
            text = (f"TIV {_fmt_money(tiv.v)} via {tiv.source}" if isinstance(tiv, Known) else f"TIV missing: {tiv}")
            run.post("intake", FindingP(text=text, fact="tiv", value=tiv.v if isinstance(tiv, Known) else None,
                                        provenance="known" if isinstance(tiv, Known) else "missing",
                                        source=getattr(tiv, "source", "")))
            return run.fact(json.dumps({"plan_used": plan, "result": text, "schema_paths": alts,
                                        "schema": schema, "insured_id": desk.insured_of(run.case_id),
                                        "submission_id": int(run.case_id)}))

        @function_tool
        async def run_federato_query(payload_json: str, why: str) -> str:
            """Run a Federato query payload (JSON: resource, where, expand, unwind, select, pagination). It is
            linted against the schema first; lint issues or an API error come back so you can fix and retry."""
            if run.query_attempts >= desk.policy.max_query_attempts:
                return "query budget for this turn is used up"
            run.query_attempts += 1
            try:
                payload = json.loads(payload_json)
            except json.JSONDecodeError as exc:
                return f"payload is not JSON: {exc}"
            client, _graph, qb = desk.federato()
            issues = [f"{i.kind} at {i.at}: {i.fix}" for i in qb.lint(payload)]
            log("ingest.query", case_id=run.case_id, resource=payload.get("resource"), why=why)
            if issues:
                run.post("intake", QueryP(text=f"Lint caught {len(issues)} issue(s) before the call", payload=payload,
                                          lint=issues, why=why))
                log("ingest.rejected", level="warning", case_id=run.case_id, reason="lint", issues="; ".join(issues))
                return run.fact("lint issues (not run): " + "; ".join(issues))
            from .federato import FederatoError, _payload_key
            if os.environ.get("ATLAS_OFFLINE") == "1" and client.query_cache.get(_payload_key(payload)) is None:
                return "offline: this query is not in the cache"
            try:
                res = await asyncio.to_thread(client.query, payload)
            except FederatoError as err:
                run.post("intake", QueryRetryP(text=f"Federato said {err}", error=str(err), payload=payload))
                log("ingest.rejected", level="warning", case_id=run.case_id, reason="federato_error", error=str(err))
                return run.fact(f"API error {err} details={json.dumps(err.details)[:400]}")
            run.post("intake", QueryP(text=f"{payload.get('resource')} query: {res.total} rows in {res.ms} ms",
                                      payload=payload, rows=res.total, ms=res.ms, why=why))
            return run.fact(json.dumps({"total": res.total, "rows": res.rows[:3]}, default=str)[:2500])

        @function_tool(name_override="estimate_premium")
        def estimate_premium_tool() -> str:
            """Estimate the missing premium from comparable bound property policies (p25-p75 of premium/TIV)."""
            c = run.case
            if not isinstance(c.premium, Missing):
                return run.fact(f"premium already {c.premium}")
            comps = desk.world.bound_comparables(c.line.v if isinstance(c.line, Known) else "property")
            v = estimate_premium(c, comps)
            if isinstance(v, Estimated):
                text = f"Premium est. {_fmt_money(v.lo)}-{_fmt_money(v.hi)} (median {_fmt_money(v.point)}) from {len(comps)} comps"
                run.post("intake", EstimateP(text=text, fact="premium", lo=v.lo, hi=v.hi, point=v.point,
                                             method=v.method, evidence=list(v.evidence)))
                return run.fact(text + f"; guideline acceptable band is $50,000-$175,000")
            run.post("intake", GapP(text=f"Premium stays missing: {v.reason}", fact="premium", reason=v.reason,
                                    resolver=v.resolver))
            return run.fact(f"premium stays missing: {v.reason}")

        return [hydration_paths, run_federato_query, estimate_premium_tool]

    def _hazard_tools(self, run: _CaseRun) -> list:
        @function_tool
        def site_layers() -> str:
            """Each location with its state, hazard tags and which cached layers exist for it."""
            return run.fact(json.dumps([{"location_id": s.id, "state": s.admin, "tags": list(s.tags),
                                         "lat": s.lat, "lng": s.lng, "layers": layers.available(s.id)}
                                        for s in run.case.sites]))

        @function_tool
        def use_layer(location_id: str, source: str, reason: str) -> str:
            """Read one cached layer for one location. source: fema_flood, usgs_earthquakes, usfs_wildfire,
            open_meteo or nominatim. Returns the observation, capped multiplier and engine score delta."""
            key = f"{location_id}:{source}"
            if source not in layers.SOURCES:
                return f"unknown source {source}"
            if key in run.used_layers:
                return "already read"
            run.used_layers.add(key)
            rec = layers.read(source, location_id)
            if rec is None:
                run.post("hazard", GapP(text=f"No cached {source} for location {location_id}", fact=f"hazard.{key}",
                                        reason="layer not in cache", resolver="hazard"))
                return run.fact(f"gap: no cached {source} for location {location_id}")
            f = layers.factor(source, rec)
            delta = round(risk_points(layers.Profile(f.multiplier), (run.desk.rules.risk_points or {}).get("max", 15)), 1)
            text = f"{f.peril}: {f.observation} (x{f.multiplier}, {delta:+.1f} pts)"
            site = next((s for s in run.case.sites if s.id == location_id), None)
            run.post("hazard", FindingP(text=text, fact=f"hazard.{key}", value=f.observation, provenance="external",
                                        multiplier=f.multiplier, score_delta=delta, source=f.url, layer=source,
                                        lat=site.lat if site else None, lng=site.lng if site else None))
            return run.fact(text)

        @function_tool
        def skip_layer(location_id: str, source: str, reason: str) -> str:
            """Record that a layer is not worth reading for this location, with the reason."""
            reason_text, ok = run.checked(reason, "not relevant for this site", agent="hazard")
            run.post("hazard", FindingP(text=f"Skipped {source}: {reason_text}", fact=f"skip.{location_id}:{source}",
                                        provenance="external", skipped=source))
            return "skipped"

        return [site_layers, use_layer, skip_layer]

    def _portfolio_tools(self, run: _CaseRun) -> list:
        @function_tool
        def concentration() -> str:
            """Active property TIV the carrier already holds within 30 km and in the same H3 res-5 cell."""
            imp = run.desk.portfolio.impact(run.case, run.desk.insured_of(run.case_id))
            if imp is None:
                run.post("portfolio", GapP(text="No site coordinates, concentration unknown",
                                           fact="portfolio.concentration", reason="no site", resolver="broker"))
                return "gap: no site"
            text = (f"[{imp.backend}] {imp.n_locations} active property locations hold {_fmt_money(imp.near_tiv)} "
                    f"within {RADIUS_KM:.0f} km ({_fmt_money(imp.cell_tiv)} in H3 cell {imp.cell}), "
                    f"{imp.points:+.1f} pts")
            run.post("portfolio", FindingP(text=text, fact="portfolio.concentration", value=imp.near_tiv,
                                           provenance="known", score_delta=imp.points,
                                           source=f"{imp.backend}: policies {', '.join(imp.policies)}",
                                           lat=run.case.sites[0].lat, lng=run.case.sites[0].lng,
                                           cells=[imp.cell, *imp.near_cells]))
            return run.fact(text + f"; policies {', '.join(imp.policies)}")

        return [concentration]

    def _appetite_tools(self, run: _CaseRun) -> list:
        @function_tool
        def assess_case() -> str:
            """Run the deterministic guideline engine on the case with every finding so far folded in."""
            _case, a = run.enriched()
            text = (f"Re-assessed: {a.score.lo:.0f}-{a.score.hi:.0f} (triage {run.triage.score.lo:.0f}-"
                    f"{run.triage.score.hi:.0f}), {_decision_kind(a)}")
            run.post("appetite", _assessment_payload(a, text))
            factors = [{"fact": f.fact, "bands": sorted(f.possible), "value": f.value_text} for f in a.factors]
            return run.fact(json.dumps({"summary": text, "factors": factors, "risk_total": getattr(a.risk, "total", None),
                                        "portfolio_points": getattr(a.portfolio, "points", None),
                                        "contradictions": [{"good": c.good, "bad": c.bad} for c in a.contradictions]}))

        return [assess_case]

    def _agent(self, run: _CaseRun, actor: Specialist, output_type: type, prompt_key: str | None = None) -> Agent:
        if prompt_key == "answer":   # answer turns reply from the lane so far; no side-effect tools
            return Agent(name=actor, instructions=PROMPTS["answer"], model=self.models.specialist, output_type=output_type)
        tools = {"intake": self._intake_tools, "hazard": self._hazard_tools, "portfolio": self._portfolio_tools,
                 "appetite": self._appetite_tools}[actor](run)
        return Agent(name=actor, instructions=PROMPTS[prompt_key or actor], model=self.models.specialist,
                     tools=tools, output_type=output_type)

    # ---- orchestration ------------------------------------------------------------------------------

    async def run(self, case_ids: list[str], run_id: str | None = None) -> dict[str, CaseResult]:
        run_id = run_id or f"r{int(time.time())}"
        t0 = time.time()
        runs: dict[str, _CaseRun] = {}
        for cid in case_ids:
            case = self.world.case(f"SUB-{cid}")
            runs[cid] = _CaseRun(self, cid, case, assess(case, self.rules), run_id, t0)

        floors = {cid: depth_floor(r.triage, r.case.tiv.v if isinstance(r.case.tiv, Known) else 0.0, self.policy,
                                   r.case.issues)
                  for cid, r in runs.items()}
        for cid, r in runs.items():
            r.post("system", _assessment_payload(r.triage, f"Triage {r.triage.score.lo:.0f}-{r.triage.score.hi:.0f}, "
                                                           f"{_decision_kind(r.triage)}"))
            r.fact(floors[cid][1])

        plans = await self._plan(runs, floors)

        async def one(cid: str) -> CaseResult:
            """One Sentry root span per underwriting decision (docs/research/sentry.md item 2): every
            agent turn and tool call the OpenAIAgentsIntegration auto-instruments below nests under
            this span, so a judge opens one trace and sees the whole decision. Attributes set after
            the case closes so they land on the span even on a timeout fallback."""
            r, plan = runs[cid], plans[cid]
            with sentry_sdk.start_span(op="pixie.underwrite_case", name=f"case {cid}") as span:
                span.set_data("pixie.case_id", cid)
                span.set_data("pixie.depth", plan.depth)
                span.set_data("pixie.model_lead", self.models.lead)
                span.set_data("pixie.model_specialist", self.models.specialist)
                try:
                    result = await asyncio.wait_for(self._case(r, plan), timeout=self.policy.live_timeout_s)
                except asyncio.TimeoutError:
                    r.post("system", NoteP(text=f"Timed out after {self.policy.live_timeout_s:.0f} s; deterministic verdict stands"))
                    result = self._template_decision(r)
                span.set_data("pixie.decision", result.decision.verdict)
                span.set_data("pixie.interval_lo", round(result.assessment.score.lo))
                span.set_data("pixie.interval_hi", round(result.assessment.score.hi))
                span.set_data("pixie.model_calls", result.calls)
                span.set_data("pixie.tokens_in", result.tokens_in)
                span.set_data("pixie.tokens_out", result.tokens_out)
                span.set_data("pixie.cost_usd", round(result.cost_usd, 4))
                if result.decision.fallback:
                    span.set_data("pixie.explanation_fallback", True)
                return result

        results = dict(zip(case_ids, await asyncio.gather(*(one(c) for c in case_ids))))
        return results

    async def _plan(self, runs: dict[str, _CaseRun], floors: dict[str, tuple[Depth, str]]) -> dict[str, CasePlan]:
        digest = []
        for cid, r in runs.items():
            a = r.triage
            digest.append({"case_id": cid, "score": f"{a.score.lo:.0f}-{a.score.hi:.0f}", "decision": _decision_kind(a),
                           "flippers": [f"{f.fact} ({f.resolver})" for f in a.decision.flippers]
                           if isinstance(a.decision, Open) else [],
                           "value_at_stake": _fmt_money(r.case.tiv.v) if isinstance(r.case.tiv, Known) else "unknown",
                           "issues": [i.text for i in r.case.issues if i.kind != "missing_roof_year"],
                           "depth_floor": floors[cid][0], "floor_reason": floors[cid][1]})
        lead = Agent(name="lead", instructions=PROMPTS["lead_plan"], model=self.models.lead, output_type=LeadPlan)
        first = next(iter(runs.values()))
        out: LeadPlan | None = await self._turn(first, lead, json.dumps(digest))
        share = len(runs)
        if first.calls:   # the plan call is shared: split its cost across the batch
            for r in runs.values():
                r.calls, r.tokens_in, r.tokens_out = first.calls, first.tokens_in, first.tokens_out
                r.cost_usd = first.cost_usd / share
        by_case = {p.case_id.removeprefix("SUB-"): p for p in (out.plans if out else [])}
        plans: dict[str, CasePlan] = {}
        for cid, r in runs.items():
            floor, floor_reason = floors[cid]
            p = by_case.get(cid) or CasePlan(case_id=cid, depth=floor, reason=floor_reason, briefs=[])
            depth: Depth = p.depth if _DEPTH_RANK[p.depth] >= _DEPTH_RANK[floor] else floor
            raised = _DEPTH_RANK[depth] > _DEPTH_RANK[floor]
            reason, _ok = r.checked(p.reason, floor_reason)
            deep = depth != "skim"
            dispatch: list[Actor] = ["intake", "hazard", "portfolio", "appetite"] if deep else []
            text = (f"{'Deep dive' if deep else 'No deep dive'} ({depth}{', raised from ' + floor if raised else ''}): {reason}")
            r.post("lead", PlanP(text=text, depth=depth, floor=floor, deep_dive=deep, dispatch=dispatch, reason=reason))
            plans[cid] = p.model_copy(update={"depth": depth})
        return plans

    async def _case(self, r: _CaseRun, plan: CasePlan) -> CaseResult:
        if plan.depth == "skim":
            return self._template_decision(r)
        digest = self._digest(r)

        # Lead briefs: addressed asks from the Lead, answered by each specialist's report
        brief_ids: dict[str, str] = {}
        for b in plan.briefs:
            q, ok = r.checked(b.question, f"what does {b.to} find on this case?")
            brief_ids[b.to] = r.post("lead", AskP(text=f"Ask {b.to}: {q}", to=b.to, question=q)).id
        questions = {b.to: b.question for b in plan.briefs}

        async def specialist(actor: Specialist) -> None:
            q = questions.get(actor, "")
            rep: SpecialistReport | None = await self._turn(
                r, self._agent(r, actor, SpecialistReport),
                f"Case digest: {digest}\n\nLead's brief to you: {q or '(none, do your standard work)'}")
            if rep is None:
                return
            if actor in brief_ids:
                text, ok = r.checked(rep.answer or rep.summary, "Findings posted in my lane.", agent=actor)
                r.post(actor, AnswerP(text=text, to="lead", in_reply_to=brief_ids[actor], verified=ok))
            if actor == "appetite":
                text, ok = r.checked(rep.summary, "Narration withheld: it cited a number the engine did not compute.", agent=actor)
                r.post("appetite", FindingP(text=text, fact="appetite.narrative", provenance="known"))
            for ask in rep.asks[:1]:
                if ask.to != actor and "?" in ask.question:   # "no action needed" is not an ask
                    qt, _ok = r.checked(ask.question, f"what do you find that bears on my {actor} finding?", agent=actor)
                    r.post(actor, AskP(text=f"Ask {ask.to}: {qt}", to=ask.to, question=qt))

        await asyncio.gather(*(specialist(a) for a in ("intake", "hazard", "portfolio")))
        await self._answer_asks(r, digest)
        await specialist("appetite")
        await self._answer_asks(r, digest)

        return await self._decide(r)

    async def _answer_asks(self, r: _CaseRun, digest: str) -> None:
        for _round in range(self.policy.max_ask_rounds):
            open_asks = [e for e in CaseFile.fold(r.events()).open_asks if e.actor != "lead"]
            if not open_asks:
                return

            async def answer(e: DeskEvent) -> None:
                p: AskP = e.payload  # type: ignore[assignment]
                out: AnswerOut | None = await self._turn(
                    r, self._agent(r, p.to, AnswerOut, "answer"),
                    f"Case digest: {digest}\n\nQuestion from {e.actor}: {p.question}\n\nYour lane so far: "
                    + json.dumps([x.payload.text for x in r.events() if x.actor == p.to][-8:]))
                text, ok = r.checked(out.answer if out else "", "No answer within budget.", agent=p.to)
                r.post(p.to, AnswerP(text=text, to=e.actor, in_reply_to=e.id, verified=ok), refs=[e.id])

            await asyncio.gather(*(answer(e) for e in open_asks))

    async def _decide(self, r: _CaseRun) -> CaseResult:
        case, a = r.enriched()
        events = r.events()
        f = CaseFile.fold(events)
        hz = math.prod(f.hazard_multipliers.values()) if f.hazard_multipliers else None
        port = next((e.payload.score_delta for e in events
                     if isinstance(e.payload, FindingP) and e.payload.fact == "portfolio.concentration"), None)
        if not any(isinstance(e.payload, AssessmentP) and e.actor == "appetite" for e in events):
            r.post("system", _assessment_payload(a, f"Re-assessed: {a.score.lo:.0f}-{a.score.hi:.0f}, {_decision_kind(a)}"))
        r.fact(explain(a))
        r.fact(json.dumps(self.rules.thresholds))
        conflicts = detect_conflicts(a, self.rules, hz, port)
        conflict_ids = {c.conflict_id: r.post("system", c).id for c in conflicts}
        for c in conflicts:
            log("conflict.detected", case_id=r.case_id, conflict_id=c.conflict_id, stances=str(c.stances))
        verdict_allowed = allowed_options(a)

        findings = [f"{e.actor}: {e.payload.text}" for e in events
                    if e.kind in ("finding", "estimate", "gap", "answer", "assessment", "query", "query_retry")]
        lead = Agent(name="lead", instructions=PROMPTS["lead_decide"], model=self.models.lead, output_type=LeadDecision)
        prompt = json.dumps({"case": r.case_id, "assessment": explain(a), "findings": findings,
                             "conflicts": [c.model_dump(include={"conflict_id", "text", "stances", "allowed"}) for c in conflicts],
                             "verdict_allowed": verdict_allowed})
        out: LeadDecision | None = await self._turn(r, lead, prompt, reserve=0)

        chosen = {x.conflict_id: x for x in (out.resolutions if out else [])}
        for c in conflicts:
            x = chosen.get(c.conflict_id)
            ok_option = x is not None and x.option in c.allowed
            reason, _ok = r.checked(x.reason, "resolved from the allowed set") if x else ("", False)
            option = x.option if ok_option else c.allowed[0]
            r.post("lead", ResolutionP(text=f"{c.conflict_id} -> {option}: {reason or 'code fallback, Lead gave no allowed option'}",
                                       conflict_id=c.conflict_id, option=option, reason=reason,
                                       fallback=not ok_option), refs=[conflict_ids[c.conflict_id]])

        verdict = out.verdict if out and out.verdict in verdict_allowed else verdict_allowed[0]
        template = explain(a)
        explanation, verified = r.checked(out.explanation, template) if out else (template, True)
        fallback = out is None or explanation == template
        if out and not verified:
            r.post("system", NoteP(text=f"verify_numbers rejected the Lead's explanation "
                                        f"({', '.join(verify_numbers(out.explanation, r.facts))}); template used"))
        action = "request_broker_info" if verdict == "request_info" else None
        dec = DecisionP(text=f"{verdict.replace('_', ' ').capitalize()}: {explanation}", verdict=verdict,
                        explanation=explanation, verified=True, fallback=fallback,
                        action="Broker email proposed" if action else None)
        r.post("lead", dec, refs=list(conflict_ids.values()))
        if action:
            flips = [fr.fact for fr in r.triage.factors if len(fr.possible) > 1] or ["premium"]
            r.post("lead", ActionP(text=f"Request from broker: {', '.join(flips)}", action=action, facts=flips))
        return self._close(r, case, a, dec)

    def _template_decision(self, r: _CaseRun) -> CaseResult:
        a = r.triage
        verdict = allowed_options(a)[0]
        text = explain(a)
        dec = DecisionP(text=f"{verdict.capitalize()}: {text}", verdict=verdict, explanation=text, verified=True,
                        fallback=True)
        r.post("lead", dec)
        return self._close(r, r.case, a, dec)

    def _close(self, r: _CaseRun, case: Case, a: Assessment, dec: DecisionP) -> CaseResult:
        secs = time.time() - r.t0
        r.post("system", NoteP(text=f"Run closed: {r.calls} model calls, ${r.cost_usd:.2f}, {secs:.0f} s",
                               calls=r.calls, tokens_in=r.tokens_in, tokens_out=r.tokens_out,
                               cost_usd=round(r.cost_usd, 4), ms=int(secs * 1000)))
        return CaseResult(case, a, dec, r.calls, r.tokens_in, r.tokens_out, r.cost_usd, secs)


# ---------- replay -------------------------------------------------------------------------------------

async def replay(store: CaseStore, case_id: str, speed: float = 1.0, after: int = 0):
    """Re-emit the latest recorded run of a case with its original spacing divided by `speed`. No network."""
    run_id = store.latest_run(case_id)
    if not run_id:
        return
    last = None
    for e in store.tail(case_id, after_seq=after, run_id=run_id):
        if last is not None and speed > 0:
            await asyncio.sleep(max(0, e.t_ms - last) / 1000 / speed)
        last = e.t_ms
        yield e
