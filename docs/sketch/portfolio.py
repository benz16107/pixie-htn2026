"""Portfolio engine: 'are we already exposed to this risk?'

Two implementations of one small protocol, chosen at startup: Elastic (primary, the Elastic track) and
in-memory (fallback when ELASTIC_URL is unset or a ping fails). Same answers; a test asserts equality.

Elastic index `atlas-exposure` (one doc per active-policy building):
    {policy: "PR-2025-1001", line: "property", status: "active", insured: 1,
     site: {lat, lon} (geo_point), h3_5: "852...ffff" (keyword), h3_7: "872...ffff" (keyword),
     perils: ["flood","hurricane","wind"] (keyword), tiv: 2321000 (double), premium_share: 0.21}
Aggregation: terms on h3_5 filtered to grid_disk(cell, 1) and perils, sum tiv. Keyword terms agg
works on the basic licence; geohex_grid is an optional extra for the map layer only.
ES|QL shown at the booth:
    FROM atlas-exposure | WHERE status == "active" | STATS tiv = SUM(tiv) BY h3_5, perils | SORT tiv DESC | LIMIT 10

Elastic index `toronto-events` (TPS points): {at: geo_point, h3_9: keyword, hood: keyword, date, premises}
used by the Toronto pack layer tps_break_ins (terms agg by h3_9 over grid_disk(cell, 1)).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from case import Case


@dataclass(frozen=True)
class CellExposure:
    cell: str
    tiv: float
    policies: int
    perils: tuple[str, ...]


@dataclass(frozen=True)
class PortfolioImpact:
    case_id: str
    neighbourhood_tiv: float       # TIV already held in grid_disk(case cell, 1) sharing a peril with the case
    added_tiv: float
    threshold: float               # from pack.yaml: concentration limit per peril neighbourhood
    over_threshold_after: bool
    points: float                  # 0 .. -10, deterministic
    shared_perils: tuple[str, ...]
    top_policies: tuple[str, ...]  # the policies driving it, for the explanation
    line: str                      # "Adds $2.1M to a hurricane/flood neighbourhood already holding $9.8M (limit $15M)"


class ExposureIndex(Protocol):
    def cells(self, cells: list[str], perils: list[str]) -> list[CellExposure]: ...
    def book(self, res: int) -> list[CellExposure]: ...        # whole active book, for the map


@dataclass
class Portfolio:
    index: ExposureIndex
    thresholds: dict[str, float]   # peril -> limit

    def impact(self, case: Case, exclude_insured_policies: bool = True) -> PortfolioImpact:
        """exclude_insured_policies: a renewal must not count its own expiring policy as concentration."""
        raise NotImplementedError


def open_index(elastic_url: str | None, api_key: str | None, snapshot) -> ExposureIndex:
    """Elastic if reachable (ping < 1 s), else InMemoryIndex(snapshot). Logs which one to Sentry."""
    raise NotImplementedError


def load_elastic(snapshot, toronto_points_path: str) -> dict[str, int]:
    """Idempotent bulk load (doc _id = policy:building / tps event id). Returns doc counts."""
    raise NotImplementedError
