# Elastic: five-minute demo

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md)

## Context and angle

Focus on retrieval and aggregation over the insurance book. The service is doing work that the model cannot reliably reproduce from prose: nearest precedent, geographic exposure and cohort comparisons.

Opening: "Before we write another risk, we retrieve similar decisions and compute how much exposure we already have nearby."

## Prepare

Open `/cases/138`, `/queue`, `/map` and `/api/atlas/cases/138/precedent`. Confirm the current backend is `elastic`. A memory result is a fallback demonstration. Keep the index/query definitions ready in docs/ELASTIC.md.

## Timed script

| Time | Show and say |
|---|---|
| 0:00-0:35 | State the two questions: what happened on comparable risks, and how concentrated are we near this location? |
| 0:35-1:50 | On the case sidebar, show precedent hits and actual outcomes. Point at the Elastic badge and explain the hybrid retrieval query. |
| 1:50-2:55 | Open Portfolio. Hover a cell and select a peril. Explain the H3 aggregate and nearby active-policy TIV. Show the matching case pins. |
| 2:55-4:15 | Show the queue insights and case percentile. Explain significant_terms versus raw frequency, then explain how numerical aggregation remains outside the LLM. |
| 4:15-5:00 | Show the response backend and query evidence. Close on a sourced underwriting context, with a local fallback that identifies itself. |

## Service detail to know

The precedent index uses lexical BM25 and semantic retrieval combined with reciprocal rank fusion. Reranker configuration exists, but do not claim every nested reranking path was proven live. Geographic queries use distance filtering; portfolio code excludes the current insured and sums active-policy TIV. H3 cells group exposure. significant_terms compares declined/loss-making cohorts with the book; percentile queries place the case in context. ES|QL and Agent Builder tool definitions are supporting work, not necessary to cram into five minutes.

## Evidence

[Elastic implementation](../../docs/ELASTIC.md), `api/src/atlas_api/precedent.py`, `portfolio.py`, `insights_routes.py`, `scripts/load_precedent.py`. Endpoints: `/api/atlas/cases/138/precedent`, `/api/atlas/cases/138/percentile`, `/api/atlas/insights/declines`.

## Limitation to say

"The historical sample is small. Similarity and significant terms do not establish causal risk. If the badge says memory, this request did not use Elastic."

## If it fails

Continue with the labelled local backend and show the real saved Elastic response/query. The map tiles can fail independently of the aggregation.

## Likely question

Why Elastic instead of a vector database? "This workload combines text relevance with filters, geospatial sums and cohort statistics. We need more than nearest-text retrieval."
