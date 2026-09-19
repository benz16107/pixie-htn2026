"""Federato client, schema graph, query builder, fetch planner.

Owns every Federato wire detail. Nothing outside this module sees the
{"action": ..., "payload": ...} envelope, a JWT, or a "[CODE] message" string.

Callers:
    snap = Snapshot.load_or_fetch(client, planner, cache=Path("cache/federato"))
    graph = SchemaGraph.from_schema(client.schema())
    paths = graph.paths("Submission", "Building.tiv")   # candidate reference paths, shortest first
    q = QueryBuilder(graph).fetch(paths[1], where={"id": 138})
    rows = client.query(q)                                 # QueryResult | raises FederatoError (typed)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Literal

AUTH_URL = "https://auth.product.federato.ai/oauth/token"
AUDIENCE = "https://product.federato.ai/core-api"
HANDLER_URL = "https://product.federato.ai/integrations-api/handlers/federato-hack-north?outputOnly=true"


# ---------- errors: parsed from "[CODE] message {json}" -------------------------------------------

class FederatoErrorCode(str, Enum):
    VALIDATION = "VALIDATION_ERROR"
    AUTH = "AUTH"            # 401 -> re-mint once, then raise
    NOT_FOUND = "NOT_FOUND"
    UNKNOWN = "UNKNOWN"


@dataclass(frozen=True)
class FederatoError(Exception):
    code: FederatoErrorCode
    message: str
    details: dict[str, Any]
    payload: dict[str, Any]          # the query that failed, for the Intake lane and Sentry breadcrumbs

    @staticmethod
    def parse(raw: str, payload: dict[str, Any]) -> "FederatoError":
        # TODO: regex r"^\[(\w+)\]\s+(.*?)(\s+(\{.*\}))?$"; unknown prefix -> UNKNOWN
        raise NotImplementedError


# ---------- schema graph --------------------------------------------------------------------------

@dataclass(frozen=True)
class FieldInfo:
    resource: str
    path: str                      # "dates.effective", "exposure_units"
    type: Literal["string", "number", "boolean", "array", "object", "reference"]
    optional: bool
    ref: str | None = None         # target resource when type == "reference"
    many: bool = False             # cardinality many => array boundary ($elemMatch / unwind needed)


@dataclass(frozen=True)
class Hop:
    field: FieldInfo               # a reference hop: Submission.insured -> Insured


@dataclass(frozen=True)
class RefPath:
    """Submission -insured-> Insured -hq-> Location -buildings[]-> Building . tiv"""
    start: str
    hops: tuple[Hop, ...]
    leaf: FieldInfo
    crosses_array: bool            # True if any hop is many (needs unwind for per-row, $elemMatch for filters)

    def describe(self) -> str:     # "Submission -> insured -> hq -> buildings[] -> tiv" for the Intake lane
        raise NotImplementedError


@dataclass
class SchemaGraph:
    fields: dict[str, dict[str, FieldInfo]]   # resource -> path -> info

    @staticmethod
    def from_schema(raw: dict[str, Any]) -> "SchemaGraph":
        # TODO: flatten nested "object" fields to dot paths; references become FieldInfo(ref=..., many=...)
        raise NotImplementedError

    def paths(self, start: str, target: str, max_hops: int = 4) -> list[RefPath]:
        """All reference paths from `start` to `target` ("Resource.field"), BFS, shortest first.
        Also walks reverse references (Policy.submission -> Submission) because Submission has no
        policy field: the bound path is Submission <-submission- Policy -exposure_units[]-> ..."""
        raise NotImplementedError

    def summary(self) -> str:
        """Compact text for LLM prompts: one line per resource, refs marked '->R' and arrays '[]'."""
        raise NotImplementedError


# ---------- query builder --------------------------------------------------------------------------

@dataclass(frozen=True)
class LintIssue:
    kind: Literal["array_dot_path", "unexpanded_reference", "unknown_field", "unknown_operator"]
    at: str
    fix: str                       # machine-applicable hint shown in the Intake lane


class QueryBuilder:
    def __init__(self, graph: SchemaGraph) -> None:
        self.graph = graph

    def fetch(self, path: RefPath, where: dict[str, Any] | None = None) -> dict[str, Any]:
        """Payload that returns the leaf values along `path`: expand chain for every hop,
        unwind at array hops, select the leaf. Never emits a dot-path through an array."""
        raise NotImplementedError

    def lint(self, payload: dict[str, Any]) -> list[LintIssue]:
        """Static checks against the schema BEFORE calling the API (pitfalls 4 and 5 in their guide)."""
        raise NotImplementedError


# ---------- client -----------------------------------------------------------------------------------

@dataclass(frozen=True)
class QueryResult:
    resource: str
    total: int
    rows: list[dict[str, Any]]     # "results" or "groups", normalised
    ms: int


class FederatoClient:
    """httpx client. Token cached to .token, re-minted at 3h50m or on 401 (once).
    Every call is a Sentry span 'federato.query' with the payload hash; results cached by payload hash
    under cache/federato/q/, so replay and the backtest never hit the network."""

    def __init__(self, client_id: str, client_secret: str, cache: Path) -> None:
        raise NotImplementedError

    def schema(self) -> dict[str, Any]:
        raise NotImplementedError

    def query(self, payload: dict[str, Any], *, use_cache: bool = True) -> QueryResult:
        raise NotImplementedError


# ---------- fetch planner: rules -> required facts -> paths -> queries -----------------------------

@dataclass(frozen=True)
class FetchPlan:
    fact: str                      # "tiv", "premium", "loss_5yr", ...
    candidates: list[RefPath]      # in preference order; Intake may reorder with a reason
    reason: str                    # "rule 'tiv' needs Building.tiv; open submissions have no Policy"


def plan_fetch(required: dict[str, str], graph: SchemaGraph, start: str = "Submission") -> list[FetchPlan]:
    """`required` comes from the rules file: fact name -> "Resource.field" (e.g. tiv -> Building.tiv).
    This is the 'templating layer that translates appetite rules into queries' their guide asks for."""
    raise NotImplementedError


@dataclass
class Snapshot:
    """Immutable pull of all 12 resources, keyed by id. Built through planner queries plus a
    paginated full pull per resource; saved to cache/federato/*.json. World indexes it."""
    records: dict[str, dict[int, dict[str, Any]]] = field(default_factory=dict)
    fetched_at: str = ""
    queries: list[dict[str, Any]] = field(default_factory=list)   # for the "queries the desk ran" panel

    @staticmethod
    def load_or_fetch(client: FederatoClient, cache: Path) -> "Snapshot":
        raise NotImplementedError


if __name__ == "__main__":
    # Check: graph finds both TIV paths and the builder never dot-paths an array.
    # g = SchemaGraph.from_schema(json.load(open("data/federato/../schema.json"))["output"][0]["data"])
    # ps = g.paths("Submission", "Building.tiv"); assert any("hq" in p.describe() for p in ps)
    # assert not QueryBuilder(g).lint(QueryBuilder(g).fetch(ps[0]))
    # assert QueryBuilder(g).lint({"resource": "Policy", "where": {"exposure_units.location.state": "CA"}})[0].kind == "array_dot_path"
    pass
