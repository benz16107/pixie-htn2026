"""In-memory portfolio index: active property-policy TIV near a case (H3 res 5 cell + 30 km radius).

Same question Elastic's terms aggregation on a keyword h3 field answers (C4); this is the fallback
the engine's `portfolio` hook reads when Elastic is down or not built yet.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import h3

from .case import Case, Known, World

RES = 5
RADIUS_KM = 30.0
PENALTY_PER_TIV = 1 / 25_000_000   # 1 point per $25M near the case, capped at the rules' max_penalty


def _km(a: tuple[float, float], b: tuple[float, float]) -> float:
    la1, lo1, la2, lo2 = map(math.radians, (*a, *b))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


@dataclass(frozen=True)
class Impact:
    points: float
    near_tiv: float
    cell_tiv: float
    cell: str
    n_locations: int
    policies: tuple[str, ...]
    near_cells: tuple[str, ...] = ()


class PortfolioIndex:
    def __init__(self, world: World, max_penalty: float = 10) -> None:
        self.max_penalty = max_penalty
        self.rows: list[tuple[str, int, float, float, float, str]] = []   # policy, insured, lat, lng, tiv, cell
        for p in world.policies.values():
            if p["status"] != "active" or p["line_of_business"] != "property":
                continue
            _tiv, sites = world._tiv_via_policy(p)
            for s in sites:
                tiv = sum(b.tiv for b in s.buildings)
                if s.lat and s.lng:
                    self.rows.append((p["policy_number"], p["insured"], s.lat, s.lng, tiv,
                                      h3.latlng_to_cell(s.lat, s.lng, RES)))

    def impact(self, case: Case, insured_id: int | None = None) -> Impact | None:
        if not case.sites:
            return None
        site = case.sites[0]
        cell = h3.latlng_to_cell(site.lat, site.lng, RES)
        near = [r for r in self.rows if r[1] != insured_id and _km((site.lat, site.lng), (r[2], r[3])) <= RADIUS_KM]
        in_cell = [r for r in self.rows if r[1] != insured_id and r[5] == cell]
        near_tiv = sum(r[4] for r in near)
        pts = -min(self.max_penalty, near_tiv * PENALTY_PER_TIV)
        return Impact(points=round(pts, 1), near_tiv=near_tiv, cell_tiv=sum(r[4] for r in in_cell), cell=cell,
                      n_locations=len(near), policies=tuple(sorted({r[0] for r in near})),
                      near_cells=tuple(sorted({r[5] for r in near})))
