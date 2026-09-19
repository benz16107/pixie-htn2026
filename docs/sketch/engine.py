"""The shared engine: appetite rules + region-pack risk + portfolio -> interval Assessment.

One function, `assess`, serves the underwriter desk, the backtest, and the Intact tenant quote.
Pure given its inputs (layer lookups are disk-cached and injected through the pack).

Rules file format (rules/property_2025.yaml). Bands are checked in order; first match wins.

    id: property_2025
    kind: commercial
    thresholds: {accept: 70, decline: 45}      # >=accept -> accept/quote-review, <decline -> decline, else refer
    hard_fail_cap: 30
    required: {tiv: Building.tiv, premium: Policy.premium, year_built: Building.year_built,
               construction_share: Building.construction_type, loss_5yr: Claim.paid_indemnity,
               primary_admin: Location.state, line: Submission.line_of_business,
               business_type: Policy.business_type}
    factors:
      - {fact: line, route_if_not_acceptable: true,
         bands: {acceptable: {in: [property]}, not_acceptable: {else: true}}}
      - {fact: business_type, bands: {acceptable: {eq: new}, not_acceptable: {eq: renewal}}, hard_fail: true}
      - {fact: primary_admin, bands: {target: {in: [OH,PA,MD,CO,CA,FL]},
                                      acceptable: {in: [NC,SC,GA,VA,UT]}, not_acceptable: {else: true}}, hard_fail: true}
      - {fact: tiv, bands: {target: {between: [50e6, 100e6]}, acceptable: {lte: 150e6}, not_acceptable: {gt: 150e6}}, hard_fail: true}
      - {fact: premium, bands: {target: {between: [75e3, 100e3]}, acceptable: {between: [50e3, 175e3]},
                                not_acceptable: {else: true}}, hard_fail: true}
      - {fact: year_built, bands: {target: {gt: 2010}, acceptable: {gt: 1990}, not_acceptable: {else: true}}, hard_fail: true}
      - {fact: construction_share, bands: {acceptable: {share_gt: [0.5, [Joisted Masonry, Non-Combustible,
                                     Steel Frame, Masonry Non-Combustible]]}, not_acceptable: {else: true}}, hard_fail: true}
      - {fact: loss_5yr, bands: {acceptable: {lt: 100e3}, not_acceptable: {else: true}}, hard_fail: true}
    points: {target: 2, acceptable: 1, not_acceptable: 0}
    risk_points: {max: 15}                      # from RiskProfile.total, see risk_points()
    portfolio_points: {max_penalty: 10}

rules/tenant.yaml is the same format: kind: tenant, facts contents_value, unit_level, claims_3yr,
prior_cancellation; refer bands (basement unit AND basement-flooding area, 2+ claims, contents > $100K);
no hard-fail cap; `pricing: {base_annual: 240, deductible_credits: {...}}` (illustrative, labelled).

The "Guideline says Joisted Masonry acceptable" reading: their table lists JM, non-combustible/steel,
masonry non-combustible. Our mapping of the 8 construction types is in the yaml and shown in the UI.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from case import Case, Missing, Resolver  # sketch-local imports
from risk import RegionPack, RiskProfile
from portfolio import Portfolio, PortfolioImpact

Band = Literal["target", "acceptable", "not_acceptable"]


@dataclass(frozen=True)
class Rule:
    fact: str
    bands: dict[Band, dict]        # predicate dicts as in the yaml
    hard_fail: bool
    route_if_not_acceptable: bool = False


@dataclass(frozen=True)
class RulesFile:
    id: str
    kind: Literal["commercial", "tenant"]
    rules: tuple[Rule, ...]
    thresholds: dict[str, float]
    points: dict[Band, int]
    required: dict[str, str]
    hard_fail_cap: float | None = None
    pricing: dict | None = None

    @staticmethod
    def load(path: str) -> "RulesFile":
        # validate at the boundary: unknown fact names or predicate ops raise at startup, not at demo time
        raise NotImplementedError


@dataclass(frozen=True)
class FactorResult:
    fact: str
    possible: frozenset[Band]      # one band if Known; several if Estimated spans edges; all if Missing
    value_text: str                # "$2,073,000 (Insured.hq -> Location 38)"
    provenance: Literal["known", "estimated", "missing"]
    resolver: Resolver | None      # from Missing/Estimated; None if Known

    @property
    def decided(self) -> bool:
        return len(self.possible) == 1


@dataclass(frozen=True)
class ScoreInterval:
    lo: float
    hi: float

    @property
    def mid(self) -> float:
        return (self.lo + self.hi) / 2


@dataclass(frozen=True)
class Flipper:
    fact: str
    resolver: Resolver
    bands_possible: frozenset[Band]
    value_at_stake: float          # TIV (commercial) or premium (tenant): drives deep-dive priority


@dataclass(frozen=True)
class Decided:
    kind: Literal["accept", "refer", "decline", "approve"]   # approve = tenant instant bind
    because: tuple[str, ...]       # factor ids, e.g. "year_built:not_acceptable"


@dataclass(frozen=True)
class Open:
    straddles: float               # the threshold the interval crosses
    flippers: tuple[Flipper, ...]


@dataclass(frozen=True)
class Routed:
    to: str                        # "cgl desk": outside this guideline's line, not a decline
    because: str


Decision = Decided | Open | Routed


@dataclass(frozen=True)
class Contradiction:
    """In-appetite on some factors, out on others. Computed, then narrated by the Appetite agent."""
    good: tuple[str, ...]          # "tiv:target", "primary_admin:target"
    bad: tuple[str, ...]           # "year_built:not_acceptable"
    what_would_resolve: tuple[str, ...]   # "renovation evidence post-2010 (roof, wiring)"


@dataclass(frozen=True)
class Assessment:
    case_id: str
    rules_id: str
    factors: tuple[FactorResult, ...]
    risk: RiskProfile
    portfolio: PortfolioImpact | None
    score: ScoreInterval
    decision: Decision
    contradictions: tuple[Contradiction, ...]
    without_enrichment: ScoreInterval   # same case, pack layers off: the Federato-bonus before/after chip


def assess(case: Case, rules: RulesFile, pack: RegionPack, portfolio: Portfolio | None = None,
           *, enrich: bool = True) -> Assessment:
    """
    TODO:
      factors = [evaluate(r, case.fact(r.fact)) for r in rules.rules]
      if a route_if_not_acceptable factor is decided not_acceptable -> Routed
      lo = sum(min points over possible), hi = sum(max points) ; normalise to 0-100
      if any hard_fail factor has possible == {not_acceptable}: hi = min(hi, cap); lo = min(lo, cap)
      if any hard_fail factor merely MAY be not_acceptable: lo = min(lo, cap)   # widens, never passes
      risk = pack.profile(case.sites) if enrich else pack.profile(case.sites, layers="data_only")
      add risk_points(risk) to lo/hi; add portfolio.impact(case).points if portfolio
      decision: hi < decline -> Decided(decline); lo >= accept -> Decided(accept); else Open(flippers)
      flippers = undecided factors whose best/worst band moves the interval across the straddled threshold
      contradictions = decided target/acceptable factors alongside decided not_acceptable ones
    """
    raise NotImplementedError


def evaluate(rule: Rule, value) -> FactorResult:
    """Known -> the one matching band. Estimated -> bands matched by lo, point and hi (and any band
    between). Missing -> all bands. This is where 'missing is never a pass' lives."""
    raise NotImplementedError


def risk_points(risk: RiskProfile, max_points: float = 15) -> float:
    """Deterministic: round(-max_points * log(total) / log(1.25)), clamped to +/-max_points."""
    raise NotImplementedError


def estimate_premium(case: Case, comparables: list[tuple[str, float, float]]) -> Missing | object:
    """comparables: (policy_number, technical_premium, tiv) of bound property policies bound before
    case.as_of. rate = technical/tiv; Estimated(lo=p25*tiv, hi=p75*tiv, point=median*tiv,
    evidence=policy numbers). Fewer than 5 comparables -> stays Missing(resolver='broker')."""
    raise NotImplementedError


@dataclass(frozen=True)
class ReceiptLine:
    label: str                     # "Break-ins near you (peril: contents theft)"
    multiplier: float
    dollars: float                 # effect on the annual premium, code-computed
    capped: bool
    source: str                    # dataset + hex id / polygon id


def quote_tenant(world, address: str | None, lat: float | None, lng: float | None, answers: dict) -> tuple:
    """Consumer path. Geocode (Toronto address points, offline; Nominatim fallback) -> Case(kind='tenant',
    sites=(Site(region='toronto'),), extra=answers as Known(source='applicant')) -> assess(case,
    rules('tenant'), pack('toronto')) -> price = base * deductible credit * risk.total (capped) ->
    receipt lines -> world.add_case(case) -> (Assessment, receipt, hexes, case_id).
    Decision mapping: Decided(accept)->approve; Open or refer bands -> refer (lands in the underwriter
    queue as a desk case). No LLM in this path; receipt wording is templated (<300 ms)."""
    raise NotImplementedError


if __name__ == "__main__":
    # assert evaluate(tiv_rule, Missing("x", "broker")).possible == {"target", "acceptable", "not_acceptable"}
    # a = assess(world.case("SUB-133"), prop, us); assert isinstance(a.decision, Decided) and a.decision.kind == "decline"
    # a = assess(world.case("SUB-123"), prop, us); assert isinstance(a.decision, Routed)   # cgl
    pass
