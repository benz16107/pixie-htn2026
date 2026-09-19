"""Backtest (the desk vs the human underwriters) and the plain-English question path.

Pre-registration: eval/BACKTEST.md is committed (with these metric definitions and the answer key)
BEFORE the first backtest run. The commit hash is printed on the backtest page.

Leakage rule: every historical case is built with World.case(id, as_of=received_date). Loss history
counts only claims with date_of_loss < as_of, from the insured's OTHER policies. The policy's own claims
are the outcome, never an input. Premium for bound policies is Known (the quoted premium existed at
binding); comparables for estimates use only policies bound before as_of.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal


@dataclass(frozen=True)
class TierOutcome:
    tier: Literal["accept", "refer", "decline", "open"]
    policies: int
    premium: float
    incurred: float
    loss_ratio: float              # incurred / premium, code-computed
    policy_ids: tuple[str, ...]


@dataclass(frozen=True)
class DeclineCheck:
    submission: str
    human_reason: str              # loss_history | cat_exposure_aggregation | outside_appetite | insufficient_controls
    desk_decision: str
    desk_top_reason: str | None
    reason_match: Literal["match", "different_reason", "not_modeled"]   # insufficient_controls = not_modeled


@dataclass(frozen=True)
class BacktestReport:
    registered_commit: str
    # B1 outcomes: bound PROPERTY policies (n=27), desk tier as of received_date vs realised loss ratio
    b1_property: tuple[TierOutcome, ...]
    b1_spearman: float             # score midpoint vs loss ratio (negative = good); n shown next to it
    # B1b: all 113 bound, risk-engine multiplier only (line-agnostic) vs loss ratio, quartiles
    b1b_risk_quartiles: tuple[TierOutcome, ...]
    # B2 human declines with an underwriting reason (n=11; 3 broker_withdrew excluded and shown as excluded)
    b2_declines: tuple[DeclineCheck, ...]
    # B3 enrichment effect: cases whose tier changed with external layers on vs off, Kendall tau of ranks
    b3_changed: tuple[tuple[str, str, str], ...]   # (case, tier_without, tier_with)
    b3_tau: float
    # B4 guideline vs book: bound property policies the 2025 guideline would decline, by reason
    b4_off_guideline: dict[str, int]               # {"premium_over_175k": 17, ...} measured, not assumed
    answer_key_pass: tuple[int, int]               # (passed, total) of Ben's 10 hand-scored cases


def backtest(world: Any) -> BacktestReport:
    raise NotImplementedError


# ---- plain-English questions -------------------------------------------------------------------

@dataclass(frozen=True)
class AskAttempt:
    payload: dict[str, Any]
    lint: tuple[str, ...]          # LintIssue.kind:at
    error: str | None              # parsed FederatoError "[VALIDATION_ERROR] ..."
    rows: int


@dataclass(frozen=True)
class AskResult:
    question: str
    rationale: str                 # Intake: why this resource, why expand here, why $elemMatch
    attempts: tuple[AskAttempt, ...]   # the UI shows every attempt, including the failed first one
    final_payload: dict[str, Any]
    columns: tuple[str, ...]
    rows: tuple[dict[str, Any], ...]
    answer: str                    # verified against rows; otherwise just 'N rows' + table
    run_id: str                    # Intake lane events for this question


async def ask(world: Any, question: str, max_attempts: int = 3) -> AskResult:
    """Intake agent with tools schema_summary, paths, lint_query, run_query. Loop: draft -> lint (fix
    locally if a fix is machine-applicable) -> run -> on error or 0 rows, the agent sees the parsed error
    and the lint hints and revises (e.g. 'broaden: drop the sprinklered filter'). Three canned questions are
    pre-run and cached for the demo; any other question runs live."""
    raise NotImplementedError
