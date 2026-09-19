"""atlas.federato: client + schema-aware query builder + the two case hydration paths.

Wire shapes (token JSON, {"action": "query", "payload": ...}, "[CODE] message" errors, {"data": {"total", "results"}})
stay inside this module. Callers see Query (domain), Rows, QueryIssue, and Case.

Federato judging hooks this module carries:
  - schema discovery at startup (Schema.fetch), never assumed field names
  - Schema.check() catches dot-paths through arrays and rewrites to $elemMatch; unknown fields; references
    selected without $expand. Each fix is returned as a QueryIssue so the Intake agent posts a query_retry event.
  - errors parsed from "[VALIDATION_ERROR] Unknown operator ..." into FederatoError(code, message, details)
"""
from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

import httpx
from pydantic import BaseModel

from .case import BuildingRec, Case, Contact, Field, LocationRec, Source, SourceKind

AUTH_URL = "https://auth.product.federato.ai/oauth/token"
AUDIENCE = "https://product.federato.ai/core-api"
HANDLER = "https://product.federato.ai/integrations-api/handlers/federato-hack-north?outputOnly=true"


# ---------------------------------------------------------------- schema

class FieldSpec(BaseModel):
    name: str
    type: Literal["number", "string", "boolean", "array", "object", "reference"]
    optional: bool
    resource: str | None = None        # for references
    many: bool = False                 # cardinality many -> array of ids
    fields: dict[str, "FieldSpec"] = {}  # nested object


class Schema(BaseModel):
    resources: dict[str, dict[str, FieldSpec]]
    fetched_at: float

    @classmethod
    def fetch(cls, client: "FederatoClient", cache: Path) -> "Schema":
        """POST {"action":"schema"}; parse output[0].data; write cache/schema.json. Reads cache if < 24 h old."""
        raise NotImplementedError

    def path_kind(self, resource: str, dotted: str) -> tuple[Literal["ok", "unknown", "through_array", "reference"], str]:
        """Walk 'exposure_units.location.state' from resource. Returns which rule it breaks and at which segment."""
        raise NotImplementedError

    def summary_for_prompt(self, max_chars: int = 6000) -> str:
        """Compact listing 'Resource: field:type, ref->Resource[]' the Intake agent reads. Cached."""
        raise NotImplementedError


# ---------------------------------------------------------------- query (domain type; serialises 1:1 to the wire)

class Query(BaseModel):
    resource: str
    where: dict[str, Any] = {}
    expand: dict[str, Any] = {}
    unwind: list[str | dict] = []
    filter: dict[str, Any] = {}
    over: list[str] = []
    select: list[str | dict] | dict[str, Any] | None = None
    sort: list[dict[str, str]] = []
    limit: int = 200
    offset: int = 0

    def to_payload(self) -> dict:
        raise NotImplementedError  # drop empty keys; pagination {limit, offset}


class QueryIssue(BaseModel):
    kind: Literal["unknown_field", "dot_path_through_array", "reference_without_expand", "bad_operator"]
    path: str
    fix: str                                     # "rewrote where.exposure_units.location.state -> $elemMatch"
    fixed_query: Query | None                    # None when the fix needs the agent (unknown field)


class Rows(BaseModel):
    total: int
    results: list[dict]
    ms: int
    query: Query


class FederatoError(Exception):
    def __init__(self, code: str, message: str, details: dict | None = None): ...

    @classmethod
    def parse(cls, text: str) -> "FederatoError":
        """'[VALIDATION_ERROR] Unknown operator "$grt" {"operator":"$grt"}' -> code, message, details."""
        raise NotImplementedError


class FederatoClient:
    """Token minted lazily, refreshed 5 min before the 4 h expiry, cached in .token (gitignored)."""

    def __init__(self, client_id: str, client_secret: str, cache_dir: Path, http: httpx.Client | None = None): ...

    @classmethod
    def from_env(cls) -> "FederatoClient":
        return cls(os.environ["FEDERATO_CLIENT_ID"], os.environ["FEDERATO_CLIENT_SECRET"], Path("cache"))

    def token(self) -> str:
        raise NotImplementedError  # POST AUTH_URL client_credentials; on 401 anywhere, re-mint once and retry

    @property
    def schema(self) -> Schema:
        raise NotImplementedError  # Schema.fetch(self, cache) memoised

    def check(self, q: Query) -> list[QueryIssue]:
        """Static validation against the schema. Applies safe rewrites (dot-path -> $elemMatch) and returns them
        so the caller can log a query_retry BEFORE the network call. Unknown fields are returned unfixed."""
        raise NotImplementedError

    def run(self, q: Query, *, span_name: str = "federato.query") -> Rows:
        """check() first; POST; parse [CODE] errors; Sentry span with rows/ms; cache by payload hash for the
        demo (network off) via store.cache_*. Raises FederatoError."""
        raise NotImplementedError

    def run_all(self, q: Query, page: int = 200) -> Rows:
        """Follows pagination until results == total."""
        raise NotImplementedError


# ---------------------------------------------------------------- snapshot (the pulled JSON) + hydration

class Snapshot(BaseModel):
    """data/federato/*.json parsed into id-keyed maps. Used by the backtest and as the demo's offline source."""
    submissions: dict[int, dict]
    policies: dict[int, dict]
    insureds: dict[int, dict]
    locations: dict[int, dict]
    buildings: dict[int, dict]
    claims: dict[int, dict]
    brokers: dict[int, dict]
    contacts: dict[int, dict] = {}     # Contact.json was not pulled; the Intake agent fetches on demand

    @classmethod
    def load(cls, root: Path) -> "Snapshot":
        raise NotImplementedError  # each file: json['output'][0]['data']['results']


# The queries Intake writes are free-form, but these two hydration plans are the ones the assembler knows how
# to fold. Intake's job is to choose and write them (and extras), not to invent the fold.
HYDRATION_PLANS = {
    "bound": [  # Submission -> Policy -> exposure_units -> location -> buildings; claims
        "Policy where submission=$id expand exposure_units.location.buildings, claims, insured, producer.contact",
    ],
    "open": [   # no policy: Insured.hq -> buildings; prior policies of the same insured for losses + renewal
        "Submission where id=$id expand insured.hq.buildings, contact",
        "Policy where insured=$insured_id expand claims  (prior policies -> loss_5y, renewal inference)",
        "Policy where line_of_business=$line and status in [bound, active] select premium, technical_premium, "
        "exposure tiv  (comparables for estimate_premium)",
    ],
}


class CaseBuilder:
    """Folds rows (live) or a Snapshot (offline) into a Case with provenance. Same fold either way."""

    def __init__(self, today: str = "2026-09-19"): ...

    def from_snapshot(self, snap: Snapshot, submission_id: int) -> Case:
        raise NotImplementedError  # picks plan by status; calls assemble()

    def assemble(self, submission: dict, policy: dict | None, insured: dict, locations: list[dict],
                 buildings: list[dict], claims: list[dict], prior_policies: list[dict],
                 comparables: list[dict], contact: dict | None) -> Case:
        """TODO pseudocode:
          tiv        = Field(sum(b.tiv), derived:sum(Building.tiv)[ids])  or missing:'no buildings reachable'
          premium    = api:Policy.premium#id  if policy else estimate_premium(...)   (estimated, cites ids)
          state      = state of the location with the largest tiv (derived) ; hq for open
          building_year = tiv-weighted year_built (derived); unknown if any building lacks year_built AND its
                          tiv share > 0.5, else computed over the known share with a note
          construction_mix = tiv share per construction_type
          loss_5y    = sum(paid_indemnity+paid_expense+reserve_*) over claims of prior_policies of this insured
                       with date_of_loss >= today-5y (derived, cites claim ids); missing if the insured has no policies
          business_type = api:Policy.business_type if policy else infer_business_type(...)
          effective/expiration = policy dates, else submission.target_effective_date + 1 y (derived)
        """
        raise NotImplementedError


def estimate_premium(line: str, tiv: int | None, requested_limit: int | None, comparables: list[dict]) -> Field[int]:
    """property: median(technical_premium / tiv) over bound property policies with tiv within +-50% of ours, x tiv.
    other lines: median(premium / limit) over bound policies of the same line, x requested_limit.
    Returns Field(kind=estimated, ref='median rate over N comparables', cites=[policy ids], confidence=0.6);
    Field.missing if fewer than 3 comparables. Pure."""
    raise NotImplementedError


def infer_business_type(submission: dict, prior_policies: list[dict]) -> Field[str]:
    """renewal if the insured holds an active policy on the same line whose expiration is within 60 days of
    target_effective_date (derived, cites policy id); else new (derived:'no active policy on this line')."""
    raise NotImplementedError


if __name__ == "__main__":
    # check: Schema.check on {"where": {"exposure_units.location.state": "CA"}} for Policy returns one
    # dot_path_through_array issue whose fixed_query uses $elemMatch; and estimate_premium with 2 comparables is a gap.
    raise SystemExit("TODO")
