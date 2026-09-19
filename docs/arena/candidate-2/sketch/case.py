"""atlas.case: the case file is the trace.

One append-only ledger of typed Events per case. Every screen is a fold over it:
  view(case) -> CaseView  (score, verdict, factors, conflicts, lanes, actions, explanation)

Invariants encoded here:
  - every value carries a Source (provenance); Field[None] with source=missing is a gap, never a pass
  - one actor per event; two actors never write the same field (per-actor state, merged in view())
  - Event.key is an idempotency key: posting the same key twice replaces, so re-runs converge
  - no score is stored; it is derived in view() from appetite/risk/portfolio findings
"""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from pathlib import Path
from typing import Generic, Iterator, Literal, TypeVar

from pydantic import BaseModel, Field as PField

T = TypeVar("T")


# ---------------------------------------------------------------- provenance

class SourceKind(StrEnum):
    api = "api"              # api:Policy.premium#1001
    derived = "derived"      # derived:sum(Building.tiv)[30,31,32]
    estimated = "estimated"  # estimated:median technical_premium/tiv over policies [1001,1007,...]
    external = "external"    # external:fema_nfhl@2026-09-19 (cache key)
    answer = "answer"        # answer:user (consumer questions)
    missing = "missing"      # missing:Policy.premium (no policy for open submission)


class Source(BaseModel):
    kind: SourceKind
    ref: str                                  # human-readable reference, shown verbatim in the UI
    cites: list[int] = []                     # record ids that back the value (comparables, buildings, claims)

    def __str__(self) -> str:
        return f"{self.kind}:{self.ref}"


class Field(BaseModel, Generic[T]):
    """A value plus where it came from. value=None with kind=missing is a gap."""
    value: T | None
    source: Source
    confidence: float = 1.0                   # 1.0 api/derived; <1 estimated; 0 missing

    @property
    def is_gap(self) -> bool:
        return self.value is None

    @classmethod
    def missing(cls, ref: str) -> "Field[T]":
        return cls(value=None, source=Source(kind=SourceKind.missing, ref=ref), confidence=0.0)


# ---------------------------------------------------------------- domain records (parsed, not wire)

class LocationRec(BaseModel):
    id: int
    lat: float
    lng: float
    state: str | None                         # None for Toronto pack (province lives in region context)
    county: str | None
    hazard_tags: list[str]
    protection_class: int | None
    address: str
    tiv: int                                  # sum of its buildings' tiv
    building_ids: list[int]


class BuildingRec(BaseModel):
    id: int
    tiv: int
    year_built: int | None
    construction_type: str | None
    sprinklered: bool | None
    roof_year: int | None


class Contact(BaseModel):
    name: str
    email: str | None
    broker: str


Verdict = Literal["accept", "refer", "decline", "out_of_guideline"]
Region = Literal["us", "toronto"]


class Case(BaseModel):
    """What the desk reasons about. Fields mirror the guideline's required data points."""
    id: str                                   # "sub-126" (Federato) or "q-<uuid>" (consumer)
    region: Region
    line: str
    insured_name: str
    insured_id: int | None
    submission_status: str | None             # received/cleared/quoted/bound/declined/lost; None for consumer
    human_outcome: str | None                 # backtest label: bound|declined:<reason>|lost; None if open
    contact: Contact | None
    effective: Field[str]
    expiration: Field[str]
    business_type: Field[str]                 # new|renewal; inferred for open queue (see builder)
    primary_state: Field[str]
    tiv: Field[int]
    premium: Field[int]
    building_year: Field[int]                 # tiv-weighted year_built
    construction_mix: Field[dict[str, float]] # {"Joisted Masonry": 0.6, ...} tiv share
    loss_5y: Field[int]                       # paid + reserve over all prior policies of this insured, 5 y
    locations: list[LocationRec]
    buildings: list[BuildingRec]
    answers: dict[str, str | int | bool] = {} # consumer questions (unit, contents, deductible, claims)


# ---------------------------------------------------------------- events

Actor = Literal["lead", "intake", "appetite", "hazard", "portfolio", "underwriter", "broker", "system"]


class Kind(StrEnum):
    query = "query"                 # payload: QueryP  (query json, why, rows, ms)
    query_retry = "query_retry"     # payload: RetryP  (error text, fix applied, refs -> original query)
    finding = "finding"             # payload: FindingP (factor name, band/points/multiplier, evidence, source)
    estimate = "estimate"           # payload: EstimateP (field, value, method, comparables)
    gap = "gap"                     # payload: GapP (field, why missing, how to fill)
    plan = "plan"                   # payload: PlanP (depth chosen, reason, proposed_by_code)
    ask = "ask"                     # payload: AskP (to: Actor, question)
    answer = "answer"               # payload: AnswerP (text, refs -> ask)
    conflict = "conflict"           # payload: ConflictP (kind, a, b, resolution, reason)
    decision = "decision"           # payload: DecisionP (verdict, explanation, checked_numbers)
    action = "action"               # payload: ActionP (kind, to, body_ref)
    action_result = "action_result" # payload: ActionResultP (ok, external_id, error)
    inbound = "inbound"             # payload: InboundP (channel, raw, parsed)
    note = "note"                   # payload: NoteP (text)  e.g. "Lead timed out; deterministic verdict stands"


class FindingP(BaseModel):
    factor: str                                          # "state", "flood", "concentration"
    band: Literal["target", "acceptable", "not_acceptable", "unknown"] | None = None
    points: int | None = None                            # risk/portfolio deltas (us pack)
    multiplier: float | None = None                      # toronto pack
    cap: float | None = None
    value: str | int | float | None = None
    evidence: str                                        # one sentence, human readable
    source: Source
    severity: Literal["info", "warn", "block"] = "info"


class ConflictP(BaseModel):
    kind: Literal["target_vs_fail", "hazard_vs_appetite", "portfolio_vs_appetite", "estimate_vs_stated"]
    a: str                                               # "tiv:acceptable"
    b: str                                               # "building_age:not_acceptable"
    resolution: str | None = None                        # None until the Lead resolves it
    reason: str | None = None


class DecisionP(BaseModel):
    verdict: Verdict
    explanation: str                                     # 2-4 sentences; every number must be in factors
    top_factors: list[str]
    by: Literal["desk", "underwriter", "deterministic"]  # underwriter = Linq/web override


class PlanP(BaseModel):
    depth: Literal["skim", "standard", "deep"]
    proposed_by_code: Literal["skim", "standard", "deep"]
    reason: str


class AskP(BaseModel):
    to: Actor
    question: str


class QueryP(BaseModel):
    query: dict                                          # the exact Federato payload (rendered as JSON in the UI)
    why: str
    rows: int | None = None
    ms: int | None = None


Payload = FindingP | ConflictP | DecisionP | PlanP | AskP | QueryP | dict  # TODO: one class per Kind


class Event(BaseModel):
    id: str
    case_id: str
    seq: int                                             # per-case monotonic; SSE cursor
    ts: datetime
    actor: Actor
    kind: Kind
    subject: str                                         # "state", "case", "fema:loc-12", "ask#3"
    payload: Payload
    refs: list[str] = []                                 # earlier event ids; the swimlane draws these as arrows
    key: str = ""                                        # f"{actor}:{kind}:{subject}"; replace-on-repeat

    def model_post_init(self, _):
        if not self.key:
            self.key = f"{self.actor}:{self.kind}:{self.subject}"


# ---------------------------------------------------------------- the fold

class Factor(BaseModel):
    name: str
    band: Literal["target", "acceptable", "not_acceptable", "unknown"]
    value: str | int | float | None
    source: str
    rule: str                                            # "Newer than 1990 acceptable; newer than 2010 target"
    event_id: str


class Score(BaseModel):
    points: int                                          # 0-100 after caps
    appetite_points: int
    enrichment_delta: int                                # sum of hazard finding points (capped)
    portfolio_delta: int
    hard_fail: bool                                      # any not_acceptable -> capped at 30
    verdict: Verdict


class Lane(BaseModel):
    actor: Actor
    events: list[Event]


class CaseView(BaseModel):
    case: Case
    score: Score
    factors: list[Factor]
    risk_factors: list[FindingP]
    portfolio: FindingP | None
    gaps: list[str]
    conflicts: list[Event]                               # conflict events, resolved or not
    depth: str
    decision: DecisionP | None
    explanation: str                                     # decision text, or the templated fallback
    lanes: list[Lane]
    actions: list[Event]
    updated_seq: int


def view(case: Case, events: list[Event]) -> CaseView:
    """The single place score/verdict/explanation are derived. Pure.

    TODO pseudocode:
      factors   = latest finding per subject where actor == appetite
      risk      = findings where actor == hazard and points is not None      -> clamp(sum, -15, +5)
      portfolio = latest finding where actor == portfolio                      -> clamp(points, -10, 0)
      appetite_points = sum(target 2, acceptable 1, unknown 0) scaled to 0-100 over 8 rules
      hard_fail = any band == not_acceptable
      points = min(30, ...) if hard_fail else clamp(appetite_points + risk + portfolio, 0, 100)
      verdict: out_of_guideline if case.line not in guideline.lines
               else decision.verdict if decision exists
               else deterministic_verdict(points, hard_fail, gaps)   # accept>=70, refer 40-70 or gaps, decline<40 or hard_fail
      explanation = decision.explanation or template(factors, risk, portfolio)
      lanes = group events by actor in ACTOR_ORDER
    """
    raise NotImplementedError


def conflicts(v: CaseView) -> list[ConflictP]:
    """Code decides what counts as a contradiction; the Lead must resolve each one.

    TODO: target_vs_fail when any factor.band == target and any == not_acceptable
          hazard_vs_appetite when risk delta <= -8 and state band == target
          portfolio_vs_appetite when portfolio.over and appetite verdict would be accept
          estimate_vs_stated when premium is estimated and an inbound broker figure differs by > 25%
    """
    raise NotImplementedError


def check_numbers(text: str, v: CaseView) -> list[str]:
    """Return every number token in `text` that does not appear in the factor/risk/portfolio values.
    Empty list = text passes. Tolerates $35.7M vs 35716000 via a rounding table. Pure."""
    raise NotImplementedError


# ---------------------------------------------------------------- store

class CaseStore:
    """SQLite, three tables: cases(id, region, json), events(case_id, seq, key, json), cache(key, json, ts).
    The events table is also the message bus: tail() polls by seq. One writer process, so no locks.
    """

    def __init__(self, conn: sqlite3.Connection): ...

    @classmethod
    def open(cls, path: Path) -> "CaseStore":
        raise NotImplementedError  # CREATE TABLE IF NOT EXISTS ...; PRAGMA journal_mode=wal

    def put_case(self, case: Case) -> None:
        raise NotImplementedError  # upsert by id

    def get_case(self, case_id: str) -> Case:
        raise NotImplementedError

    def post(self, ev: Event) -> Event:
        """Append or replace by (case_id, key). Assigns seq and id. Returns the stored event."""
        raise NotImplementedError

    def events(self, case_id: str, after_seq: int = 0) -> list[Event]:
        raise NotImplementedError

    def tail(self, case_id: str, after_seq: int = 0) -> Iterator[Event]:
        """Blocking generator for SSE: poll every 250 ms. ponytail: polling, switch to a Condition if it matters."""
        raise NotImplementedError

    def view(self, case_id: str) -> CaseView:
        return view(self.get_case(case_id), self.events(case_id))

    def list_cases(self, region: Region, status: list[str] | None = None) -> list[Case]:
        raise NotImplementedError

    # disk cache for every external lookup (AGENTS.md invariant 4)
    def cache_get(self, key: str) -> dict | None: ...
    def cache_put(self, key: str, value: dict) -> None: ...


class CaseFile:
    """The handle an agent's tools hold: bound to (store, case_id, actor). An agent can only post as itself."""

    def __init__(self, store: CaseStore, case_id: str, actor: Actor): ...

    def post(self, kind: Kind, subject: str, payload: Payload, refs: list[str] = ()) -> Event:
        raise NotImplementedError  # builds Event(actor=self.actor, ...) and store.post()

    def read(self) -> CaseView:
        return self.store.view(self.case_id)     # any agent may read everything (blackboard)


if __name__ == "__main__":
    # smallest check that fails if the fold breaks: a hand-written ledger with one target, one fail, one hazard
    # finding must produce hard_fail=True, points<=30, one target_vs_fail conflict, and 3 lanes.
    raise SystemExit("TODO: fixture in evals/fixtures/case_sub126.json")
