# Elastic in Pixie

`scripts/load_elastic.py` loads two indices into the live Elastic serverless project
(credentials in `.env`: `ELASTIC_URL`, `ELASTIC_USERNAME`, `ELASTIC_PASSWORD`, `ELASTIC_KIBANA_URL`):

- **`pixie-exposure`** — one doc per active-policy location, any line: `policy_id`, `insured`,
  `line`, `state`, `geo_point`, `tiv` (summed from that location's buildings), `perils` (from the
  location's hazard tags), `protection_class`, and two keyword H3 cells, `h3_r5` and `h3_r7`.
  122 docs.
- **`pixie-toronto`** — one doc per Toronto break-and-enter point (2023 onward): `geo_point`,
  `date`, `h3_r9`. 23,641 docs, bulk loaded from `packs/toronto/raw/break_and_enter_2023_onward.geojson`.

Run it with `cd api && uv run python ../scripts/load_elastic.py`. Doc ids are deterministic
(`{policy_number}:{location_id}` for exposure, the event's own `EVENT_UNIQUE_ID`/`OBJECTID` for
Toronto), so re-running overwrites in place.

## ES|QL: the concentration table

Paste into Kibana (Elastic_KIBANA_URL) → Dev Tools or the ES|QL tab. Reproduces the same top-cell
ranking `api/src/atlas_api/portfolio.py`'s `ElasticIndex.book()` serves to `/map/book`:

```
FROM pixie-exposure
| STATS tiv = SUM(tiv) BY h3_r5
| SORT tiv DESC
```

Top 3 cells by TIV on the live index (2026-09-19):

| h3_r5 | tiv | locations |
|---|---|---|
| `85264d13fffffff` | $258,654,000 | 6 |
| `852832b3fffffff` | $186,458,000 | 9 |
| `85441a8ffffffff` | $177,813,000 | 4 |

Note: don't reach for the same ranking via a `terms` aggregation with `order` set to a sub-metric
(`{"terms": {"field": "h3_r5", "size": 3, "order": {"tiv": "desc"}}}`) — on a multi-shard index
that's only approximate, since each shard pre-prunes to its own top `size` candidates by a
different heuristic before the global sum is known, and can drop the true top cell (it did here:
it dropped `852832b3fffffff`, actually the #2 cell). ES|QL's `STATS`/`SORT` computes the exact sum
per group before sorting, and `ElasticIndex.book()` sidesteps the same trap by requesting every
bucket (`size: 10_000`, well over the ~40 real cells) and sorting client-side in Python.

## geo_distance: the 30 km neighbourhood

The same filter `ElasticIndex.impact()` uses for the portfolio agent's concentration tool —
active property locations within 30 km of a case's site, excluding the case's own insured:

```
GET pixie-exposure/_search
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "term": { "line": "property" } },
        { "geo_distance": { "distance": "30km", "geo_point": { "lat": 40.73, "lon": -73.99 } } }
      ],
      "must_not": [ { "term": { "insured": "<insured id>" } } ]
    }
  },
  "aggs": {
    "near_tiv": { "sum": { "field": "tiv" } },
    "cells": {
      "terms": { "field": "h3_r5", "size": 1000 },
      "aggs": { "tiv": { "sum": { "field": "tiv" } } }
    }
  }
}
```

## What Elastic does in Pixie (booth pitch)

Every underwriting case runs a Portfolio agent whose one tool, `concentration()`, asks Elastic how
much property TIV the carrier already holds within 30 km and in the same H3 resolution-5 cell as
the new submission — a geo_distance filter plus a terms aggregation with a `sum(tiv)` sub-metric,
computed server side against the live `pixie-exposure` index, not pre-baked. The same index backs
the desk's concentration map (`/map/book`): a terms aggregation on `h3_r5`/`h3_r7` grouped by peril,
recomputed per request. `ExposureIndex` (`api/src/atlas_api/portfolio.py`) is one protocol with two
implementations — `ElasticIndex` and `InMemoryIndex` — and `open_index()` prefers Elastic and falls
back to the in-memory index silently if the project is unreachable, so the demo never blanks out if
the booth Wi-Fi drops. `pixie-toronto` holds all 23,641 Toronto break-and-enter points at H3
resolution 9 for the consumer tenant-quote map. Every desk event that used Elastic says so —
`[elastic]` or `[memory]` — in the portfolio finding's own text, visible on the live desk lane and
the case page.
