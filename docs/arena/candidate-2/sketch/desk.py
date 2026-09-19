"""atlas.desk: the multi-agent underwriting desk on the OpenAI Agents SDK, and the no-LLM consumer desk.

Roster (UNDERWRITING_DESK): Lead (orchestrator), Intake, Appetite, Hazard, Portfolio.
Message protocol = the Event kinds in case.py. Agents talk by posting to the CaseFile and by the Lead's
ask/answer pairs; refs make the arrows. The SDK is used agent-as-tool style (Lead stays in charge), and every
tool is a closure over a CaseFile bound to that agent's actor, so a specialist cannot post as another.

Orchestration policy (code, not prompt):
  1. intake.build(case_id)                                   -> Case + query/query_retry/estimate/gap events
  2. appetite.evaluate                                        -> finding per rule (deterministic) + contradiction notes
  3. depth = depth_policy(view); Lead may RAISE it (plan event with reason); never lower
  4. gather(hazard.run(depth), portfolio.run())  concurrently -> findings
  5. loop (max 2 rounds): conflicts(view) unresolved? -> Lead must post conflict resolutions; Lead may `ask`
     a specialist (answer posted by that specialist's agent); then Lead posts decision
  6. check_numbers(decision.explanation) must be empty, else re-prompt with the offending numbers (max 2)
  7. Lead posts action events (request_info when missing_required; notify when verdict in {accept, refer} and rank<=3)
  On timeout (per-case budget 90 s live, 25 s in 'fast' mode) the deterministic verdict stands and a note says so.
Reusability: Desk(roster, policy) is domain-agnostic; underwriting is the roster + the yaml packs.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Awaitable, Callable, Literal

from pydantic import BaseModel

from .actions import Actions
from .appetite import Appetite, Receipt, build_receipt
from .case import Actor, Case, CaseFile, CaseStore, CaseView, ConflictP, DecisionP, Kind, PlanP, conflicts, check_numbers
from .federato import CaseBuilder, FederatoClient, Query, Rows, Snapshot
from .portfolio import Portfolio
from .risk import Point, RiskEngine, RiskReport

Depth = Literal["skim", "standard", "deep"]


# ---------------------------------------------------------------- roster

class Specialist(BaseModel):
    actor: Actor
    instructions: str                     # loaded from api/prompts/<actor>.md
    tools: list[str]                      # names bound in Desk._bind(); listed here so the roster is readable
    output_model: str | None              # pydantic class name for output_type, e.g. "HazardReport"
    uses_llm: bool = True


UNDERWRITING_DESK: list[Specialist] = [
    Specialist(actor="lead", instructions="prompts/lead.md", output_model="LeadDecision",
               tools=["read_case", "set_depth", "ask", "resolve_conflict", "decide", "request_info", "notify"]),
    Specialist(actor="intake", instructions="prompts/intake.md", output_model="IntakeReport",
               tools=["get_schema", "run_query", "assemble_case", "answer"]),
    Specialist(actor="appetite", instructions="prompts/appetite.md", output_model="AppetiteReport",
               tools=["evaluate", "answer"]),
    Specialist(actor="hazard", instructions="prompts/hazard.md", output_model="HazardReport",
               tools=["available_lookups", "assess", "places_card", "answer"]),
    Specialist(actor="portfolio", instructions="prompts/portfolio.md", output_model="PortfolioReport",
               tools=["impact", "run_query", "answer"]),
]

CONSUMER_DESK: list[Specialist] = [   # no LLM anywhere in the decision path
    Specialist(actor="intake", instructions="", tools=["geocode", "assemble_case"], output_model=None, uses_llm=False),
    Specialist(actor="hazard", instructions="", tools=["assess"], output_model=None, uses_llm=False),
    Specialist(actor="appetite", instructions="", tools=["evaluate", "receipt"], output_model=None, uses_llm=False),
]


# ---------------------------------------------------------------- structured outputs (output_type)

class LeadDecision(BaseModel):
    verdict: Literal["accept", "refer", "decline", "out_of_guideline"]
    explanation: str
    top_factors: list[str]
    actions: list[Literal["request_info", "notify", "none"]]


class HazardReport(BaseModel):
    chosen: list[tuple[str, str]]         # (lookup, reason) : the "reasons about which data to request" proof
    summary: str


class IntakeReport(BaseModel):
    plan: list[str]                       # which hydration plan and extra queries, in order, with why
    gaps: list[str]


class AskResult(BaseModel):
    question: str
    attempts: list[dict]                  # [{query, issues, error, rows, ms}] : retries are the adaptation proof
    final: Query | None
    rows: Rows | None
    rationale: str


# ---------------------------------------------------------------- policies (code)

def depth_policy(v: CaseView) -> tuple[Depth, str]:
    """deep if tiv >= 20e6 or preliminary points >= 60 or conflicts(v) non-empty;
    standard if guideline covers the line; skim otherwise. Returns the reason string the plan event carries."""
    raise NotImplementedError


LOOKUPS_BY_DEPTH = {"skim": ["hazard_tags", "protection_class"],
                    "standard": ["hazard_tags", "protection_class", "fema_flood"],
                    "deep": None}          # None = the Hazard agent chooses from available(); must give reasons


# ---------------------------------------------------------------- the desk

class Desk:
    def __init__(self, roster: list[Specialist], *, store: CaseStore, fed: FederatoClient | None, risk: RiskEngine,
                 portfolio: Portfolio | None, appetite: Appetite, actions: Actions | None, model: str,
                 snapshot: Snapshot | None = None, on_event: Callable[[object], None] | None = None): ...

    # -- entry points --------------------------------------------------------------------------------------
    async def run(self, case_id: str, depth: Depth | None = None, mode: Literal["live", "fast"] = "live") -> CaseView:
        """Steps 1-7 in the module docstring. Idempotent: events replace by key, so re-running converges."""
        raise NotImplementedError

    def run_deterministic(self, case: Case) -> CaseView:
        """Intake(snapshot) + appetite + hazard(cache only, LOOKUPS_BY_DEPTH[standard]) + portfolio, no LLM.
        Used by the backtest and as the precomputed baseline every case shows before the desk runs."""
        raise NotImplementedError

    async def run_queue(self, case_ids: list[str], concurrency: int = 3) -> list[CaseView]:
        """The precompute at feature freeze; Sentry transaction 'desk.queue'."""
        raise NotImplementedError

    @property
    def intake(self) -> "Intake": ...
    @property
    def consumer(self) -> "Consumer": ...

    # -- internals ---------------------------------------------------------------------------------------
    def _bind(self, spec: Specialist, file: CaseFile) -> "agents.Agent":
        """Build the SDK Agent with function_tools closed over `file`. Each tool posts its own event(s):
           run_query   -> query (+ query_retry per issue/fix)      assess -> finding per RiskFactor, note for skipped
           evaluate    -> finding per rule                         impact -> finding(concentration)
           ask         -> ask (Lead only; enforced by the closure)  answer -> answer with refs=[ask id]
           resolve_conflict -> replaces the conflict event (same key) with resolution + reason
           decide      -> rejected unless conflicts resolved and check_numbers == []
        """
        raise NotImplementedError

    async def _lead_round(self, file: CaseFile, view: CaseView, round_no: int) -> DecisionP | None:
        raise NotImplementedError

    def _trace_processor(self):
        """add_trace_processor: mirror generation spans as `note` events (short 'thinking' summaries, no numbers)
        so lanes show the model working between tool calls. Optional; the lanes work without it."""
        raise NotImplementedError


class Intake:
    """Shared by the desk and the question box. Same schema summary, same check/retry loop."""

    def __init__(self, fed: FederatoClient, builder: CaseBuilder, model: str): ...

    async def build(self, file: CaseFile, submission_id: int) -> Case:
        """LLM picks the hydration plan (bound/open) from status and writes each Query; fed.check() fixes and
        logs; fed.run(); builder.assemble(). Posts estimate/gap events for premium and missing_required."""
        raise NotImplementedError

    async def ask(self, question: str, max_attempts: int = 3) -> AskResult:
        """Plain English -> Query. Prompt = schema summary + query grammar cheatsheet + 3 worked examples.
        On FederatoError or 0 rows: retry with the error text / 'broaden the filter' (posted as attempts).
        The web shows attempts[] verbatim, which is Federato's 'trace why it chose specific queries'."""
        raise NotImplementedError


class Consumer:
    """Toronto tenant quote. Deterministic; sub-second; posts events under the same actors as the desk so
    /cases/{id} renders it as a three-lane swimlane ('View as underwriter')."""

    def __init__(self, store: CaseStore, risk: RiskEngine, appetite: Appetite, geocode): ...

    def quote(self, req: "QuoteRequest") -> "QuoteView":
        """geocode -> Case(region=toronto, answers) -> risk.assess('toronto', point, context={'unit': req.unit})
        -> appetite.evaluate (refer rules) -> build_receipt -> post events -> QuoteView(case_id, decision, receipt,
        hexes=risk.hexes(res=9, ring=2), summary_text for aria-live)."""
        raise NotImplementedError

    def explain_async(self, case_id: str) -> None:
        """Optional LLM rewrite of ReceiptLine.reason into plainer words; checked by check_numbers; never blocks."""
        raise NotImplementedError


if __name__ == "__main__":
    # check: run_deterministic on fixture sub-126 posts exactly one finding per rule under actor=appetite, at least one
    # hazard finding from cache, one portfolio finding, one unresolved conflict, and view().score.hard_fail is True.
    raise SystemExit("TODO")
