"""atlas.portfolio: "are we already exposed to this risk?"

Store: Elastic index `atlas-locations` (one doc per active-policy exposure location), mapping:
  {policy_id: keyword, line: keyword, insured_id: keyword, state: keyword, hazard_tags: keyword,
   tiv: long, premium: long, location: geo_point, hex5: keyword, hex7: keyword}
Aggregation used everywhere (licence-safe, basic tier): terms on hex5 + sum(tiv) + cardinality(policy_id) + terms(hazard_tags).
geohex_grid is an optional extra behind a flag; if the trial errors, nothing changes.
Fallback (ES down or no trial): InMemoryPortfolio does the same aggregation with h3 v4 over the same records.
Threshold lives in packs/us/portfolio.yaml: {res: 5, cell_tiv_threshold: 60e6, per_hazard_threshold: 40e6, max_points: -10}.
"""
from __future__ import annotations

from pathlib import Path
from typing import Protocol

from pydantic import BaseModel

from .case import Case, FindingP, Source
from .risk import Hex


class ExposureDoc(BaseModel):
    policy_id: int
    line: str
    insured_id: int
    state: str
    hazard_tags: list[str]
    tiv: int
    premium: int
    lat: float
    lng: float
    hex5: str
    hex7: str


class Impact(BaseModel):
    hex: str
    res: int
    existing_tiv: int
    existing_policies: int
    added_tiv: int
    threshold: int
    over: bool
    shared_hazards: list[str]              # hazards this case has that the cell already carries
    same_insured: list[int]                # policy ids already held for this insured (renewal/cross-sell context)
    points: int                            # 0 .. -10
    evidence: str                          # "Adds $35.7M to cell 852a.. holding $41.0M across 3 policies (flood); over $60M threshold"
    source: Source                         # derived:elastic terms(hex5) over 76 active policies @ts


class PortfolioBackend(Protocol):
    def index(self, docs: list[ExposureDoc]) -> int: ...
    def cell(self, hex5: str) -> dict: ...                      # {tiv, policies, hazards: {tag: tiv}, insureds: [...]}
    def hexes(self, res: int, hazard: str | None) -> list[Hex]: ...
    def by_insured(self, insured_id: int) -> list[int]: ...


class ElasticPortfolio:
    """elasticsearch-py 9.x; index name and URL from env. Every call is a Sentry span 'elastic.<op>'."""
    def __init__(self, url: str, api_key: str, index: str = "atlas-locations"): ...


class InMemoryPortfolio:
    """Same interface over a list[ExposureDoc] with h3.latlng_to_cell. Used when ELASTIC_URL is unset or errors."""
    def __init__(self, docs: list[ExposureDoc]): ...


class Portfolio:
    def __init__(self, backend: PortfolioBackend, thresholds: dict): ...

    @classmethod
    def connect(cls, pack_root: Path) -> "Portfolio":
        """Try ElasticPortfolio (ping); else InMemoryPortfolio. Logs which one (Sentry log 'portfolio.backend')."""
        raise NotImplementedError

    @classmethod
    def build_docs(cls, snapshot) -> list[ExposureDoc]:
        """active policies -> exposure_units -> location -> buildings tiv. One doc per (policy, location)."""
        raise NotImplementedError

    def impact(self, case: Case) -> Impact:
        """For the case's primary location: cell(hex5) -> existing; over = existing + added > threshold or
        shared-hazard tiv > per_hazard_threshold; points = -10 * min(1, overflow / threshold) rounded. Pure after fetch."""
        raise NotImplementedError

    def finding(self, imp: Impact) -> FindingP:
        return FindingP(factor="concentration", points=imp.points, cap=-10, evidence=imp.evidence,
                        source=imp.source, severity="warn" if imp.over else "info")

    def map_hexes(self, res: int = 5, hazard: str | None = None) -> list[Hex]:
        raise NotImplementedError  # GET /portfolio/hexes; boundaries computed here (server-side h3)

    def what_if(self, case: Case) -> list[Hex]:
        """The map's 'drop this application' chip: same hexes with the case's tiv added to its cell."""
        raise NotImplementedError


if __name__ == "__main__":
    # check: InMemoryPortfolio over 3 docs in one cell with tiv 20M each; impact(case adding 10M, threshold 60M)
    # -> over=True, points=-2 (rounded), evidence names the cell and $60M.
    raise SystemExit("TODO")
