"""Region packs and the capped, explained risk profile. Region-agnostic engine (AGENTS.md 5):
no state, city or dataset name appears here; packs live in packs/<id>/pack.yaml + a layers.py.

packs/us/pack.yaml
    id: us
    h3_res: {portfolio: 5, display: 5}
    caps: {factor: [0.90, 1.12], total: [0.85, 1.25]}
    layers:
      - {id: tags, peril: multi, kind: data, source: "Federato Location.hazard_tags", cost: 0}
      - {id: protection_class, peril: fire, kind: data, source: "Federato Location.protection_class", cost: 0}
      - {id: fema_flood, peril: flood, kind: external, source: "FEMA NFHL via Esri Living Atlas", cost: 1,
         relevant_if: {tags_any: [flood, hurricane]}}
      - {id: usgs_quakes, peril: earthquake, kind: external, source: "USGS M4+ within 50 km, 30 y", cost: 1}
      - {id: usfs_whp, peril: wildfire, kind: external, source: "USFS Wildfire Hazard Potential", cost: 1}
      - {id: open_meteo_gusts, peril: wind, kind: external, source: "Open-Meteo archive gust p99", cost: 1}
      - {id: surroundings, peril: context, kind: advisory, source: "Gemini + Google Maps grounding", cost: 3}
    curves:                       # observation -> raw multiplier, piecewise; then capped
      fema_flood: {"A*": 1.10, "V*": 1.12, "X_shaded": 1.03, "X": 0.97, none: 1.0}
      usgs_quakes: [[0, 0.97], [5, 1.0], [30, 1.06], [70, 1.10]]
      usfs_whp: {very_low: 0.97, low: 1.0, moderate: 1.04, high: 1.08, very_high: 1.12, nodata_urban: 0.98}
      protection_class: [[1, 0.95], [5, 1.0], [8, 1.05], [10, 1.10]]

packs/toronto/pack.yaml
    id: toronto
    h3_res: {display: 9, shrink_parent: neighbourhood}
    caps: {factor: [0.92, 1.10], total: [0.85, 1.25]}     # GEO-PLAN fairness guardrails
    layers:
      - {id: tps_break_ins, peril: theft, kind: data, source: "TPS Break and Enter 2023-2026, apartment+house",
         shrink: {k: 20}}                                  # credibility: n/(n+k) toward neighbourhood mean
      - {id: basement_flood_area, peril: water, kind: data, source: "City of Toronto basement flooding study areas"}
      - {id: trca_floodline, peril: flood, kind: data, source: "TRCA regulated floodplain"}
      - {id: fire_station_km, peril: fire, kind: data, source: "Toronto fire station locations (85)"}
      - {id: hydrant_150m, peril: fire, kind: data, source: "Toronto fire hydrants"}
      - {id: surroundings, peril: context, kind: advisory, source: "Gemini + Google Maps grounding"}
    excluded: [assault, robbery, shootings]              # not the covered peril; stated in the README
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol

from case import Site

Peril = str


@dataclass(frozen=True)
class Observation:
    layer: str
    peril: Peril
    value: str | float | None      # "AE", 71, "nodata_urban", None
    source: str
    citation: str                  # URL or dataset row id
    cached: bool
    ok: bool                       # False = lookup failed; factor becomes 1.0 with a visible note


@dataclass(frozen=True)
class Factor:
    peril: Peril
    layer: str
    observation: Observation
    raw: float
    applied: float                 # after per-factor cap
    capped: bool
    line: str                      # template text: "FEMA Zone AE (1% annual chance) x1.10"


@dataclass(frozen=True)
class RiskProfile:
    site_id: str
    factors: tuple[Factor, ...]
    total_raw: float
    total: float                   # after total cap
    total_capped: bool
    advisories: tuple[Observation, ...]    # Gemini surroundings: never multiply, may add a subjectivity
    layers_skipped: tuple[tuple[str, str], ...]   # (layer, why) e.g. ("usgs_quakes", "Hazard agent: no seismic tag, Florida")


class Layer(Protocol):
    id: str
    def lookup(self, site: Site) -> Observation: ...   # disk-cached by (layer, lat, lng rounded 4dp)


@dataclass
class RegionPack:
    id: str
    layers: dict[str, Layer]
    curves: dict[str, object]
    caps: dict[str, tuple[float, float]]
    h3_res: dict[str, int]

    @staticmethod
    def load(pack_dir: str) -> "RegionPack":
        raise NotImplementedError

    def catalog(self) -> list[dict]:
        """Layer id, peril, source, cost, relevant_if: what the Hazard agent chooses from."""
        raise NotImplementedError

    def profile(self, sites: tuple[Site, ...], layers: list[str] | Literal["all", "data_only"] = "all",
                skipped: dict[str, str] | None = None) -> RiskProfile:
        """TIV-weighted across sites for commercial (largest site for display). Deterministic.
        TODO: obs = layer.lookup(site); raw = curve(obs); applied = clamp(raw, caps.factor);
              total = clamp(prod(applied), caps.total)."""
        raise NotImplementedError

    def hexes(self, center: tuple[float, float], k: int, value_layer: str) -> list[dict]:
        """Server-side H3 (h3-py v4): grid_disk -> [{cell, ring: cell_to_boundary as [[lat,lng]], value, level}].
        The Expo app and the web map draw these polygons; no h3-js on the client."""
        raise NotImplementedError


def prefetch(pack: RegionPack, sites: list[Site]) -> dict[str, int]:
    """Runs every external layer for every site once (Nominatim at 1 req/s), writes cache/, returns
    counts {ok, failed, cached}. Codex lane runs this at ~20:00; the demo reads only the cache."""
    raise NotImplementedError
