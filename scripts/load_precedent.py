#!/usr/bin/env python3
"""Load `pixie-precedent`: one doc per bound policy, for the hybrid precedent search behind
`GET /cases/{id}/precedent`.

    cd api && uv run python ../scripts/load_precedent.py

Idempotent: the doc id is the policy number, so a re-run overwrites in place. The endpoint falls
back to the same scoring in memory when Elastic is unreachable, so this is a sponsor-path upgrade,
never a demo dependency.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "api" / "src"))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(ROOT / ".env")

from elasticsearch import helpers  # noqa: E402

from atlas_api.case import World  # noqa: E402
from atlas_api.explain import PRECEDENT_INDEX, precedent_docs  # noqa: E402
from atlas_api.portfolio import _elastic_client  # noqa: E402

MAPPING = {
    "mappings": {
        "properties": {
            "policyNumber": {"type": "keyword"}, "caseId": {"type": "keyword"},
            "insured": {"type": "text"}, "line": {"type": "keyword"}, "state": {"type": "keyword"},
            "construction": {"type": "keyword"}, "tivBand": {"type": "keyword"},
            "perils": {"type": "keyword"}, "status": {"type": "keyword"},
            "tiv": {"type": "double"}, "premium": {"type": "double"}, "incurred": {"type": "double"},
            "lossRatio": {"type": "double"},
            "summary": {"type": "text"},
        }
    }
}


def main() -> int:
    client = _elastic_client()
    if client is None:
        print("no Elastic connection (ELASTIC_URL / credentials); the endpoint uses the in-memory fallback")
        return 1
    if not client.indices.exists(index=PRECEDENT_INDEX):
        client.indices.create(index=PRECEDENT_INDEX, **MAPPING)
    docs = precedent_docs(World.load())
    helpers.bulk(client, [{"_index": PRECEDENT_INDEX, "_id": d["id"], "_source": d} for d in docs])
    client.indices.refresh(index=PRECEDENT_INDEX)
    print(f"loaded {len(docs)} bound policies into {PRECEDENT_INDEX}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
