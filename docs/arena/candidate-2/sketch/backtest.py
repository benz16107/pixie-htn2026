"""atlas.backtest: the desk against the human underwriters' real decisions. Deterministic path, ~2 s, reproducible.

Population: the 137 submissions with an outcome (113 bound, 14 declined, 10 lost). The open 21 are excluded.
Labels come from Submission.status and decline_reason. broker_withdrew (3) is not an underwriting decision and is
reported separately, never scored.

Answer key (evals/answer_key.yaml), written by hand before the engine exists so it cannot be fitted:
  - id: 126        # Lakeside Medical, TX property, open
    expect: {verdict: refer, hard_fail: true, top_factor: building_age, gaps: [premium]}
  - id: 143        # Aperture Cloud, WA property 2010 steel, $26M
    expect: {verdict: refer, top_factor: state}        # WA not acceptable
  ... 10 cases (6 open property + 2 declined + 2 bound), each with a one-line 'why' Ben wrote

Reason-to-agent map (which lane should have raised a warn/block finding):
  loss_history              -> appetite.loss_value  (line agnostic)
  cat_exposure_aggregation  -> portfolio.concentration OR hazard.* with points <= -4
  outside_appetite          -> appetite.* not_acceptable (line/state/tiv/premium)
  insufficient_controls     -> a gap or warn on sprinklered/protection_class/roof_year (controls data missing or poor)
  broker_withdrew           -> not the desk's call (excluded)
"""
from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import BaseModel

from .case import CaseStore, CaseView, Verdict
from .desk import Desk
from .federato import Snapshot

REASON_TO_LANE = {
    "loss_history": [("appetite", "loss_value")],
    "cat_exposure_aggregation": [("portfolio", "concentration"), ("hazard", "*")],
    "outside_appetite": [("appetite", "line"), ("appetite", "state"), ("appetite", "tiv"), ("appetite", "premium")],
    "insufficient_controls": [("appetite", "construction"), ("hazard", "protection_class"), ("intake", "gap:*")],
}


class AnswerKeyCase(BaseModel):
    id: int
    expect: dict
    why: str


class AnswerKey(BaseModel):
    cases: list[AnswerKeyCase]

    @classmethod
    def load(cls, path: Path) -> "AnswerKey": ...


class CaseResult(BaseModel):
    id: int
    line: str
    human: str                          # bound | declined:<reason> | lost
    verdict: Verdict
    points: int
    hard_fail: bool
    lane_hit: bool | None               # for declines: did the mapped lane raise warn/block?
    loss_ratio: float | None            # bound only: (paid + reserve) / premium


class BacktestReport(BaseModel):
    n: int
    decline_recall: tuple[int, int]     # (hits, scorable declines = 11)
    by_reason: dict[str, tuple[int, int]]
    false_declines: tuple[int, int]     # bound property policies the desk would decline (n, of)
    loss_ratio_by_bucket: dict[Literal["top", "mid", "bottom"], float]   # bound, all lines, by points tercile
    enrichment_changed_rank: int        # how many of the 137 moved >= 3 places with hazard findings on vs off
    out_of_guideline: int               # non-property count, reported not scored
    answer_key: tuple[int, int]         # (passed, total)
    cases: list[CaseResult]
    note: str = ("The guideline covers property only; other lines are checked on line-agnostic rules "
                 "(loss history, catastrophe aggregation, portfolio) and shown as out_of_guideline.")

    def write(self, path: Path) -> None: ...


def backtest(store: CaseStore, snapshot: Snapshot, key: AnswerKey, desk: Desk) -> BacktestReport:
    """TODO pseudocode:
      for each submission with status in (bound, declined, lost):
          case = builder.from_snapshot(snapshot, id)   # human_outcome set from status/decline_reason
          v_off = desk.run_deterministic(case, enrichment=False); v_on = desk.run_deterministic(case)
          record verdict/points/hard_fail from v_on; lane_hit via REASON_TO_LANE over v_on.lanes
      recall = declines with lane_hit / 11 ; by_reason grouped
      false_declines over bound property policies
      loss_ratio_by_bucket: bound policies split into terciles by v_on.points; ratio = sum(claims $) / sum(premium)
      enrichment_changed_rank = count(|rank_on - rank_off| >= 3)
      answer_key = count(expect matches v_on) ; each mismatch is also a pytest failure in evals/test_answer_key.py
    """
    raise NotImplementedError


if __name__ == "__main__":
    # check: running backtest twice on the same snapshot yields byte-identical latest.json (determinism), and
    # decline_recall[1] == 11.
    raise SystemExit("TODO")
