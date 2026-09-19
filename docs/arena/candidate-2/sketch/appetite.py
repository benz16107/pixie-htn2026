"""atlas.appetite: rules-as-data, evaluated in code. Two rule files, one evaluator.

packs/us/appetite.yaml  (the 2025 commercial property guideline, transcribed)
------------------------------------------------------------------------------
name: "2025 commercial property"
lines: [property]                       # verdict for other lines: out_of_guideline (line-agnostic rules still run)
points: {target: 2, acceptable: 1, unknown: 0}
hard_fail_cap: 30
rules:
  - id: submission_type
    field: business_type                 # Case field name
    bands: {acceptable: [new], not_acceptable: [renewal]}
    text: "New business acceptable; renewals not acceptable"
  - id: line
    field: line
    bands: {acceptable: [property]}
    other: not_acceptable
  - id: state
    field: primary_state
    bands: {target: [OH, PA, MD, CO, CA, FL], acceptable: [NC, SC, GA, VA, UT]}
    other: not_acceptable
  - id: tiv
    field: tiv
    ranges: {target: [50e6, 100e6], acceptable: [0, 150e6]}     # first matching band wins; else not_acceptable
  - id: premium
    field: premium
    ranges: {target: [75e3, 100e3], acceptable: [50e3, 175e3]}
    unknown_when_estimated: false        # estimated premium is scored but shown with the estimate badge
  - id: building_age
    field: building_year
    ranges: {target: [2011, 9999], acceptable: [1991, 9999]}
  - id: construction
    field: construction_mix
    share_over: 0.5
    good: ["Joisted Masonry", "Non-Combustible", "Steel Frame", "Masonry Non-Combustible"]
    bands: {acceptable: good_share_over, not_acceptable: other_share_over}
  - id: loss_value
    field: loss_5y
    ranges: {acceptable: [0, 100e3]}
    line_agnostic: true                  # applies to every line (backtest reason: loss_history)
required: [insured_name, primary_state, line, effective, expiration, tiv, construction_mix, building_year, premium, loss_5y]

packs/toronto/tenant.yaml  (personal lines, written and labelled by us)
----------------------------------------------------------------------
name: "Atlas tenant (illustrative, not an Intact rate)"
lines: [tenant]
base_annual: 150                         # $20k contents, $1M liability, $1,000 deductible (invented)
rules:
  - id: claims
    field: answers.claims_5y
    bands: {acceptable: [0, 1]}
    other: refer                         # 2+ claims -> refer, never priced
  - id: floodline
    field: risk.floodline                # RiskReport factor lookup
    bands: {acceptable: [false]}
    other: refer                         # overland flood is a separate product
  - id: contents
    field: answers.contents
    ranges: {acceptable: [0, 100e3]}
    other: refer
receipt:                                 # fixed order; lines sum exactly to the total
  - {line: "contents", per_1k_over_20k: 4}
  - {line: "deductible", options: {500: 20, 1000: 0, 2500: -15}}
  - {line: "location", from: risk.multipliers}   # each RiskFactor becomes its own dollar line
  - {line: "sewer_backup", addon: 40, when: answers.sewer_backup}
"""
from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import BaseModel

from .case import Case, Factor, Field, FindingP, Verdict
from .risk import RiskReport

Band = Literal["target", "acceptable", "not_acceptable", "unknown"]


class Rule(BaseModel):
    id: str
    field: str
    text: str
    bands: dict[str, list] = {}
    ranges: dict[str, list[float]] = {}
    other: Literal["not_acceptable", "refer", "unknown"] = "not_acceptable"
    line_agnostic: bool = False
    share_over: float | None = None
    good: list[str] = []


class Guideline(BaseModel):
    name: str
    lines: list[str]
    points: dict[str, int]
    hard_fail_cap: int
    rules: list[Rule]
    required: list[str]

    @classmethod
    def load(cls, path: Path) -> "Guideline":
        raise NotImplementedError  # yaml -> pydantic; validation errors name the rule id

    def covers(self, line: str) -> bool:
        return line in self.lines


class Appetite:
    """Deterministic. evaluate() is pure and runs in microseconds; the backtest calls it 137 times."""

    def __init__(self, g: Guideline): ...

    @classmethod
    def load(cls, path: Path) -> "Appetite":
        return cls(Guideline.load(path))

    def evaluate(self, case: Case, risk: RiskReport | None = None) -> list[FindingP]:
        """One FindingP per rule with band/value/evidence/source copied from the Field's provenance.
        Missing field -> band=unknown, severity=warn, evidence='<field> missing: <source.ref>'. Never a pass.
        Rules with line_agnostic=False are skipped (not scored) when not covers(case.line); a single
        finding factor='line' band=not_acceptable is still posted so the table says why.
        TODO pseudocode per rule:
          v = getattr(case, rule.field) ; if v.is_gap -> unknown
          band = first of [target, acceptable] whose bands/ranges contain v.value, else rule.other
          construction: good_share = sum(mix[t] for t in good); band = acceptable if > share_over else not_acceptable
        """
        raise NotImplementedError

    def missing_required(self, case: Case) -> list[str]:
        """Field names from guideline.required whose Field is a gap. Feeds the Composio request_info email."""
        raise NotImplementedError

    def deterministic_verdict(self, findings: list[FindingP], line: str, points: int) -> Verdict:
        """out_of_guideline if not covers(line); decline if any not_acceptable on a hard rule or points < 40;
        refer if 40 <= points < 70 or any unknown among required; else accept. Pure."""
        raise NotImplementedError


# ---------------------------------------------------------------- consumer pricing (tenant.yaml receipt block)

class ReceiptLine(BaseModel):
    name: str
    dollars: int
    reason: str                                # plain words, grade 7
    source: str                                # "your answer" | "public data: TPS break-ins 2023-2025" | "invented constant"
    capped: bool = False
    hex_ids: list[str] = []                    # which cells lit up for this line (map highlight)


class Receipt(BaseModel):
    base: int
    lines: list[ReceiptLine]
    total: int                                 # == base + sum(lines); asserted
    monthly: int
    disclaimer: str = "Illustrative estimate, not an offer."


def build_receipt(guideline: Guideline, case: Case, risk: RiskReport) -> Receipt:
    """Fixed-order dollar lines from the receipt block; each RiskFactor multiplier becomes one line applied to
    the running total (rounded to whole dollars, so lines sum exactly). Pure."""
    raise NotImplementedError


if __name__ == "__main__":
    # check: a Case with building_year=1978, tiv=78e6, state=CA, premium missing ->
    #   state target, tiv target, building_age not_acceptable, premium unknown; verdict decline (hard fail)
    raise SystemExit("TODO")
