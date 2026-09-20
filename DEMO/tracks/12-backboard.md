# Backboard: five-minute demo

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md)

## Context and angle

The story is persistent provider memory and typed System One judgements. Pixie already has its own local cross-case memory, so make the provider boundary visible instead of claiming every recall comes from Backboard.

Opening: "Memory can improve the next question without becoming an unverified premium or risk score."

## Prepare

Open `/cases/141` and its Memory tab. Open `/api/atlas/cases/141/memory` and prepare `/api/atlas/cases/141/memory?live=true`. Inspect `sources.backboard.queried`, source/detail and recalled-line labels. Keep the verified System One response from scripts/backboard_check.py ready. Do not run the whole diagnostic script unexamined; it can create and delete provider test memory.

## Timed script

| Time | Show and say |
|---|---|
| 0:00-0:40 | Show the related submissions 126 and 141. Explain the value of retaining insured identity and a duplicate-account issue across cases. |
| 0:40-1:40 | Show default memory. Point at Pixie recall and the provider queried flag. State that the local result is not a Backboard call. |
| 1:40-2:55 | Open the prepared live=true response. Show exactly which lines came from Backboard, whether they were cached, and any detail/error field. Do not hide an empty result. |
| 2:55-4:15 | Show a real saved System One typed judgement. Explain intent/duplicate classification and the model probability label. Contrast it with the engine-computed score. |
| 4:15-5:00 | Discuss the indexed guideline document and its current citation failure. Close on advisory memory with explicit provenance. |

## Service detail to know

`memory.py` scopes an assistant per underwriter, writes identity/issue memos and retrieves relevant provider memory. `openai_routes.py` separates desk and Backboard sources. System One uses `typesafe/jev-1.13.0` in the recorded verification; the parser reads choice/noul/score from typed answers. Probabilities may inform routing, never directly supply the commercial score or a confirmed premium. A guideline document reaching INDEXED does not mean a cited paragraph was retrieved.

## Evidence

[Backboard verification](../../docs/BACKBOARD.md), `api/src/atlas_api/memory.py`, `openai_routes.py`, `scripts/backboard_check.py`. Prior verification on 2026-09-20 covered memory write/search/delete, indexed upload and typed System One answers. This website audit did not repeat paid provider calls.

## Limitation to say

"Default cross-case recall can come entirely from Pixie's SQLite session. Backboard document citations are not reliable yet. We only claim provider memory when the response identifies it."

## If it fails

Show the captured provider response and local recall separately. If provider search fails, explain the fallback and skip the citation demo. Do not call `queried:false` a successful provider retrieval.

## Likely question

Can remembered information change a decision? "It can change what the desk investigates. Confirmed facts and code still determine the scored result; a recalled narrative or probability is not a fact override."
