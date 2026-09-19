"""The multi-agent underwriting desk.

Roster (each an OpenAI Agents SDK `Agent` with pydantic output_type; model ids from config):
  lead       Plans the run, picks deep dives from Open cases, re-asks, resolves conflicts from an allowed
             set, writes the recommendation, proposes actions.          tools: ask, decide, propose_action
  intake     Chooses among schema paths when a fact is missing, runs comparables, answers plain-English
             questions by writing a Federato query (lint -> run -> retry).  tools: schema_summary, paths,
                                                                       lint_query, run_query, comparables
  appetite   Reads the Assessment (code), narrates contradictions, says which facts would resolve them,
             asks Intake/Hazard for them.                               tools: assess, explain_factor
  hazard     Picks which pack layers are worth running for each site and why; runs them; flags tag vs
             external disagreements; may request the Gemini surroundings card.  tools: catalog, lookup
  portfolio  Asks the exposure index the right question (which perils, which neighbourhood), reports
             impact.                                                    tools: impact, cells

Communication: typed DeskEvents on a per-case append-only log. Agents write only their own events.
The case file (what any agent reads) is fold(events) at read time. Asks are addressed; the scheduler
dispatches an agent turn when an event it subscribes to, or an Ask addressed to it, arrives.

Trace = the same events. The UI renders one swimlane per `actor`, arrows for Ask/Answer pairs
(`in_reply_to`), and tool calls as chips inside a lane.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Literal

Actor = Literal["lead", "intake", "appetite", "hazard", "portfolio", "system", "human", "applicant"]

EventKind = Literal[
    "plan",          # lead: deep-dive set with reasons ("Open, $2.1M at stake, flipper premium -> broker")
    "ask",           # any -> addressed agent
    "answer",        # reply to an ask
    "tool_call",     # tool, args summary, result summary, ms, cache_hit
    "finding",       # adds or narrows a fact: {fact, value(Value), by}
    "assessment",    # system: re-run of assess(); carries score interval and decision
    "conflict",      # system: computed stance disagreement
    "resolution",    # lead: resolves a conflict with an allowed option + cited facts
    "decision",      # lead or human: final recommendation
    "explanation",   # lead: 2-3 sentences, passed verify_numbers()
    "action",        # outbox state change: proposed|sent|failed|skipped
    "note",          # anything else; UI renders a generic card
]


@dataclass(frozen=True)
class DeskEvent:
    id: str                        # sha256(case_id, actor, kind, canonical body)[:16]  -> idempotent append
    case_id: str
    seq: int                       # assigned by the log on append
    t_ms: int                      # ms since run start (replay uses these)
    actor: Actor
    kind: EventKind
    to: Actor | None               # for ask
    in_reply_to: str | None
    body: dict[str, Any]           # kind-specific, pydantic-validated per kind
    refs: tuple[str, ...]          # fact ids cited

    @staticmethod
    def make(case_id: str, actor: Actor, kind: EventKind, body: dict, **kw) -> "DeskEvent":
        raise NotImplementedError


def event_id(case_id: str, actor: str, kind: str, body: dict) -> str:
    return hashlib.sha256(repr((case_id, actor, kind, sorted(body.items()))).encode()).hexdigest()[:16]


class CaseLog:
    """JSONL per case under cache/events/<run_id>/<case_id>.jsonl. append() is a no-op on a known id.
    stream(replay=True) re-emits a recorded run honouring t_ms (speed factor configurable)."""

    def __init__(self, root: str) -> None:
        raise NotImplementedError

    def append(self, e: DeskEvent) -> bool:
        raise NotImplementedError

    def events(self, case_id: str) -> list[DeskEvent]:
        raise NotImplementedError

    async def stream(self, case_id: str, replay: bool = False, speed: float = 1.0) -> AsyncIterator[DeskEvent]:
        raise NotImplementedError


@dataclass(frozen=True)
class CaseFile:
    """What agents read. Derived, never stored."""
    case: Any                      # case.Case with all findings folded in
    assessment: Any                # engine.Assessment of that case
    open_asks: tuple[DeskEvent, ...]
    conflicts: tuple["Conflict", ...]
    history: tuple[DeskEvent, ...]

    @staticmethod
    def fold(base_case: Any, events: list[DeskEvent], world: Any) -> "CaseFile":
        """TODO: apply findings in seq order via case.with_fact; re-assess; collect unanswered asks."""
        raise NotImplementedError


Stance = Literal["favour", "neutral", "against"]


@dataclass(frozen=True)
class Conflict:
    """Computed by code from each specialist's last stance. Example: appetite=against (year_built
    not_acceptable), hazard=favour (low flood, sprinklered), portfolio=neutral."""
    id: str
    stances: dict[Actor, Stance]
    about: tuple[str, ...]         # fact ids
    allowed: tuple[Literal["decline", "refer_with_subjectivity", "accept_with_subjectivity",
                           "request_info", "route"], ...]   # computed: guideline hard fail removes accept_*


@dataclass(frozen=True)
class DeskPolicy:
    max_deep_dives: int = 8
    max_rounds: int = 2            # ask/answer rounds per case
    max_llm_calls_per_case: int = 12
    live_timeout_s: float = 45
    deep_dive_rule: str = "Open decision, ordered by value_at_stake; plus any case with a block-level DataIssue"

    def deep_dive_candidates(self, assessments: list[Any]) -> list[tuple[str, str]]:
        """(case_id, reason). The Lead may add/remove with a stated reason; the plan event records both."""
        raise NotImplementedError


@dataclass(frozen=True)
class ModelConfig:
    lead: str
    specialist: str
    @staticmethod
    def from_env() -> "ModelConfig":   # ATLAS_MODEL_LEAD / ATLAS_MODEL_SPECIALIST, verified at setup
        raise NotImplementedError


@dataclass
class Desk:
    world: Any
    log: CaseLog
    models: ModelConfig
    policy: DeskPolicy = field(default_factory=DeskPolicy)

    async def run(self, case_ids: list[str] | None, mode: Literal["live", "replay"] = "live") -> str:
        """Returns run_id.
        1. triage: world.assess_all() (code) -> 'assessment' events for every case (actor=system)
        2. lead plan: sees queue digest (ids, intervals, flippers, issues); emits 'plan' with deep dives
        3. per deep dive, concurrently (asyncio.gather, bounded semaphore 4):
             lead asks intake/hazard/portfolio (addressed asks, in parallel)
             each specialist turn: Runner.run(agent, casefile_digest) -> tool_calls + findings/answer
             on any finding: system re-assesses -> 'assessment'; appetite turn narrates the delta
             system computes conflicts -> 'conflict'; lead resolves (option must be in allowed) -> 'resolution'
             stop when decision is Decided/Routed, or rounds exhausted, or only broker-resolvable flippers
             remain -> lead proposes request_info action
        4. lead decision + explanation (verify_numbers; on failure use template, emit note 'fallback')
        5. non-deep cases: template explanation, one batched lead call for wording (verified)
        Every agent turn is a Sentry span (OpenAIAgentsIntegration) and our own add_trace_processor
        mirrors SDK spans into tool_call events."""
        raise NotImplementedError


def verify_numbers(text: str, allowed: dict[str, str]) -> list[str]:
    """Extract every number/currency/percent/year in text; return those not rendered in `allowed`
    (fact id -> rendered string, with $2.1M == $2,073,000 normalisation). Empty list = pass."""
    raise NotImplementedError


if __name__ == "__main__":
    # assert verify_numbers("TIV $2.1M, built 2023", {"tiv": "$2,073,000", "year_built": "2023"}) == []
    # assert verify_numbers("premium $90K", {"tiv": "$2,073,000"}) == ["$90K"]
    # log = CaseLog(tmp); e = DeskEvent.make("SUB-138", "lead", "plan", {"x": 1}); assert log.append(e) and not log.append(e)
    pass
