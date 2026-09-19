"""Case model with provenance, and World (the indexed snapshot).

Invariant (AGENTS.md 2, 3): every scalar a rule can read is a Value. Rules never see bare floats,
so a Missing value cannot be treated as passing.

Callers:
    world = World.load(snapshot, packs=["us", "toronto"], rules=Path("rules"))
    case = world.case("SUB-138")
    case.premium            # Missing(reason="open submission has no Policy", resolver="broker")
    case.tiv                # Known(2_073_000, source="Insured.hq -> Location 38 -> Buildings [61]")
    case.with_fact("premium", Estimated(...), by="intake")   # returns a NEW Case; cases are immutable
"""
from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Generic, Literal, TypeVar

T = TypeVar("T")
Resolver = Literal["broker", "intake", "hazard", "portfolio", "applicant", "none"]


@dataclass(frozen=True)
class Known(Generic[T]):
    v: T
    source: str                    # "Policy.premium (PR-2025-1001)"


@dataclass(frozen=True)
class Estimated(Generic[T]):
    lo: T
    hi: T
    point: T
    method: str                    # "median technical_premium/TIV of 9 bound property comparables"
    evidence: tuple[str, ...]      # ids of comparables, or "insured holds active PR-2026-1031"


@dataclass(frozen=True)
class Missing:
    reason: str
    resolver: Resolver             # who could supply it; drives flippers -> actions


Value = Known[T] | Estimated[T] | Missing


@dataclass(frozen=True)
class DataIssue:
    kind: Literal["duplicate_account", "broker_conflict", "limit_vs_tiv", "coord_mismatch",
                  "tag_vs_external", "missing_roof_year", "stale_token_retry", "api_error"]
    severity: Literal["info", "warn", "block"]
    text: str                      # template text, numbers only from `facts`
    facts: tuple[str, ...]         # fact ids cited


@dataclass(frozen=True)
class Building:
    id: int
    tiv: Value[float]
    year_built: Value[int]
    construction: Value[str]
    sprinklered: Value[bool]
    roof_year: Value[int]


@dataclass(frozen=True)
class Site:
    """A location; region-agnostic. Commercial: Federato Location. Tenant: geocoded address."""
    id: str
    lat: float
    lng: float
    region: str                    # pack id: "us" | "toronto"
    admin: str                     # state or province, for rules
    tags: tuple[str, ...]          # Federato hazard_tags, or () for tenant
    protection_class: Value[int]
    buildings: tuple[Building, ...] = ()
    h3: dict[int, str] = field(default_factory=dict)   # res -> cell, computed at load (server side only)


@dataclass(frozen=True)
class Case:
    id: str                        # "SUB-138", "POL-1001" (backtest view), "TQ-7f3a" (tenant quote)
    kind: Literal["commercial", "tenant"]
    status: str                    # received|cleared|quoted|bound|declined|lost|quote
    as_of: str                     # ISO date; the backtest sets it to received_date (no leakage)
    line: Value[str]
    business_type: Value[str]      # new|renewal; inferred for open submissions
    primary_admin: Value[str]      # state of the largest-TIV site
    tiv: Value[float]
    premium: Value[float]
    year_built: Value[int]         # TIV-weighted
    construction_share: Value[dict[str, float]]   # construction type -> TIV share
    loss_5yr: Value[float]         # incurred within 5y BEFORE as_of, from the insured's policies
    sites: tuple[Site, ...]
    broker: Value[str]
    contact: Value[str]            # contact name + email (the email is synthetic; demo inbox used)
    extra: dict[str, Value] = field(default_factory=dict)   # tenant answers, requested_limit, ...
    issues: tuple[DataIssue, ...] = ()
    human_outcome: str | None = None                          # decline_reason / bound / lost: backtest only, never read by rules

    def fact(self, name: str) -> Value:
        raise NotImplementedError

    def with_fact(self, name: str, value: Value, by: str) -> "Case":
        """Immutable update. The desk folds Findings into a new Case, then re-assesses."""
        raise NotImplementedError

    def fact_ids(self) -> dict[str, str]:
        """fact id -> rendered value, the whitelist for verify_numbers()."""
        raise NotImplementedError


@dataclass
class World:
    """Snapshot + indexes + packs + rules, loaded once at startup. Read-only after load, except
    `add_case` for tenant quotes (stored in cache/cases/TQ-*.json)."""

    @staticmethod
    def load(snapshot_dir: str, packs: list[str], rules: str) -> "World":
        # TODO indexes: submissions_by_id, policies_by_submission (reverse ref), policies_by_insured,
        #   claims_by_policy, sites_by_cell[res5], bound_property_rates (for premium comparables).
        raise NotImplementedError

    def case(self, case_id: str, as_of: str | None = None) -> Case:
        """Builds a Case. Order of preference for each fact is the FetchPlan order:
        tiv: Policy.exposure_units.location.buildings -> Insured.hq.buildings (open queue) -> Missing(broker)
        premium: Policy.premium -> Missing(broker)  (the estimate is added by Intake, as a Finding)
        business_type: Policy.business_type -> Estimated(renewal if insured holds an active/expired
                       same-line policy, evidence = its number) -> Missing(broker)
        loss_5yr: sum incurred of the insured's claims with date_of_loss in (as_of-5y, as_of)
        issues: duplicate insured+line among open submissions; broker differs -> broker_conflict;
                requested_limit < 25% of tiv -> limit_vs_tiv."""
        raise NotImplementedError

    def assess_all(self, view: Literal["open", "all", "backtest"]) -> list["Assessment"]:  # noqa: F821
        raise NotImplementedError

    def add_case(self, case: Case) -> None:
        raise NotImplementedError


if __name__ == "__main__":
    # w = World.load("cache/federato", ["us"], "rules")
    # c = w.case("SUB-138"); assert isinstance(c.tiv, Known) and c.tiv.v == 2_073_000
    # assert isinstance(c.premium, Missing) and c.premium.resolver == "broker"
    # assert any(i.kind == "duplicate_account" for i in w.case("SUB-126").issues)       # 126 and 141
    # assert isinstance(w.case("SUB-143").business_type, Estimated)                     # active PR-2026-1031
    pass
