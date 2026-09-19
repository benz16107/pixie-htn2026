"""atlas.risk: the shared risk engine. Region packs in, capped explained factors out.

A pack is a directory:
  packs/us/manifest.yaml        unit: points   cap: {total_min: -15, total_max: 5}   lookups: [fema_flood, usgs_quake, usfs_wildfire, open_meteo_gusts, hazard_tags, protection_class, gemini_places]
  packs/toronto/manifest.yaml   unit: multiplier cap: {per_factor: [0.92, 1.10], total: [0.85, 1.25]} lookups: [hex_scores, floodline, basement_study, fire_station, hydrant]
  packs/<region>/cache/         one json per lookup call, keyed by (lookup, rounded lat/lng, params)
  packs/toronto/hex_scores.json precomputed by the ETL (GEO-PLAN C1): {hex9: {peril: {n, exposure, rate, percentile, multiplier}}}

No state, city, or dataset name appears in this module. The pack manifest names them.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Protocol

from pydantic import BaseModel

from .case import Source


class Point(BaseModel):
    lat: float
    lng: float
    hazard_tags: list[str] = []            # from the data, when it has them
    protection_class: int | None = None
    context: dict = {}                     # {"unit": "basement"} for toronto; {"state": "FL"} for us applies() guards


class RiskFactor(BaseModel):
    peril: str                             # "flood", "break_and_enter", "fire_response"
    value: str | float | None              # "AE", 71, 0.8 (km)
    points: int | None = None              # us pack
    multiplier: float | None = None        # toronto pack
    cap: float                             # the cap that applied (shown as a badge when hit)
    capped: bool
    evidence: str                          # "FEMA NFHL zone AE, 1% annual chance, SFHA"
    source: Source                         # external:fema_nfhl@2026-09-19 or external:tps_break_and_enter 2023-2025
    hex_ids: list[str] = []                # cells that produced it (map highlight)
    lookup: str
    from_cache: bool


class RiskReport(BaseModel):
    region: str
    unit: Literal["points", "multiplier"]
    factors: list[RiskFactor]
    points: int | None                     # clamped sum (us)
    multiplier: float | None               # clamped product (toronto)
    skipped: list[tuple[str, str]]         # (lookup, reason) e.g. ("usgs_quake", "no quake tag and 0 M4+ in 30 y for this state")
    floodline: bool | None = None          # toronto: refer trigger read by tenant.yaml


class Lookup(Protocol):
    """One external or precomputed source. Pure given the cache; never called twice for the same key."""
    name: str

    def applies(self, p: Point) -> tuple[bool, str]: ...          # (run it?, reason)  the Hazard agent sees the reason
    def cache_key(self, p: Point) -> str: ...
    def fetch(self, p: Point) -> dict: ...                        # network; raises on failure
    def to_factor(self, p: Point, raw: dict) -> RiskFactor | None: ...   # pure; None = no signal


class Pack(BaseModel):
    region: str
    unit: Literal["points", "multiplier"]
    caps: dict
    lookups: list[str]
    root: Path

    @classmethod
    def load(cls, root: Path) -> "Pack":
        raise NotImplementedError  # manifest.yaml + registry of Lookup impls by name


class RiskEngine:
    """assess() is what both the Hazard agent (per location, chosen lookups) and the consumer quote (all lookups) call."""

    def __init__(self, packs: dict[str, Pack], cache_get, cache_put): ...

    @classmethod
    def load(cls, packs_root: Path) -> "RiskEngine":
        raise NotImplementedError

    def available(self, region: str, p: Point) -> list[tuple[str, bool, str]]:
        """[(lookup, applies, reason)] : the menu the Hazard agent chooses from; it must give a reason per pick."""
        raise NotImplementedError

    def assess(self, region: str, p: Point, only: list[str] | None = None) -> RiskReport:
        """Run `only` (or every applicable lookup); cache first; on network failure record skipped=(name, error)
        and continue (Federato: 'handle API issues gracefully'); clamp per manifest caps. Sentry span per lookup
        with from_cache flag (the trace that justified caching goes in INCIDENTS.md)."""
        raise NotImplementedError

    def hexes(self, region: str, p: Point, res: int, ring: int) -> list["Hex"]:
        """Server-side H3 (h3 v4): cells + boundary polygons as plain lat/lng lists for react-native-maps.
        No h3-js on the phone (INTEGRATIONS.md gotcha 1)."""
        raise NotImplementedError


class Hex(BaseModel):
    id: str
    center: tuple[float, float]
    boundary: list[tuple[float, float]]
    values: dict[str, float]               # {"break_and_enter": 1.07, "tiv": 41e6}


# ---------------------------------------------------------------- us pack lookups (verified endpoints in grounding.md)

class FemaFlood:
    """Esri Living Atlas copy of NFHL (FEMA's own host blocks Canadian IPs). Empty result = outside mapped hazard area.
    points: SFHA true -> -6 (A/AE/V zones), zone X shaded -> -2, none -> 0. Only if 'flood' or 'hurricane' in tags
    or the state is coastal per manifest list (guard, not engine code)."""
    name = "fema_flood"


class UsgsQuake:
    """Count of M4+ within 50 km over 30 y. >=20 -> -4, 5-19 -> -2, else 0. applies: 'earthquake' tag or state in manifest quake list."""
    name = "usgs_quake"


class UsfsWildfire:
    """WHP identify. NoData in dense urban = 'urban, low wildland exposure' (0), class >=4 -> -4, 3 -> -2."""
    name = "usfs_wildfire"


class OpenMeteoGusts:
    """Days in the last year with gusts >= 90 km/h: >=10 -> -3, 3-9 -> -1. Applies when hail/tornado/wind/hurricane tags."""
    name = "open_meteo_gusts"


class HazardTags:
    """The data's own tags: -1 per cat tag, capped at -3. Always applies. Never double counts a peril an external lookup scored."""
    name = "hazard_tags"


class ProtectionClass:
    """protection_class 1-3 -> +2, 4-6 -> 0, 7-10 -> -3."""
    name = "protection_class"


class GeminiPlaces:
    """Gemini Maps grounding, 'what is around this address that matters to a property underwriter'.
    Produces a card (text + PlaceCitation list), points=0 by design (no number from a model). Deep tier only.
    Cached mp3-style: one JSON per point."""
    name = "gemini_places"


# ---------------------------------------------------------------- toronto pack lookups (GEO-PLAN B/C)

class HexScores:
    """Reads hex_scores.json for the res-9 cell + ring 1 (smoothing): one RiskFactor per loss-matched peril
    (break_and_enter for tenant contents; theft_from_vehicle only for auto). Multiplier from the percentile table,
    per-factor cap [0.92, 1.10]."""
    name = "hex_scores"


class FloodLine:
    """TRCA floodline polygon intersection -> RiskReport.floodline=True (refer). No multiplier."""
    name = "floodline"


class BasementStudy:
    """City basement-flooding study area; applies only when context.unit in (basement, ground): x1.10 + sewer backup recommended."""
    name = "basement_study"


class FireResponse:
    """Nearest run-area station distance + hydrant within 150 m: <=1.5 km & hydrant x1.00; 1.5-3 km x1.03; no hydrant x1.05.
    Labelled 'modelled on the idea of FUS grades, not an FUS grade'."""
    name = "fire_response"


if __name__ == "__main__":
    # check: assess('us', tampa_point, only=['fema_flood','hazard_tags']) from a warmed cache returns points in [-15, 5],
    # every factor has evidence and source, and a lookup that raises is listed in skipped, not silently dropped.
    raise SystemExit("TODO")
