# Rox: five-minute demo

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md)

## Context and angle

Use the business-data investigation angle in the supplied track notes: agents that can work through imperfect enterprise records. There is no Rox SDK integration to claim. Check the actual judging brief before describing this as a required-service entry.

Opening: "The desk finds the record defect before it gives the underwriter a confident answer."

## Prepare

Open cases 126 and 141 side by side, plus `/ask`. Read their named insured, broker and issue labels. Prepare one canned query; do not improvise a complex query as the opening.

## Timed script

| Time | Show and say |
|---|---|
| 0:00-0:40 | Show the two submissions. Explain why a duplicate insured submitted through different brokers can create operational confusion. |
| 0:40-1:50 | Point to the actual duplicate-account and provenance evidence. Distinguish a detected issue from an upstream correction. |
| 1:50-3:00 | Run the prepared Ask query. Show query text, returned rows and the live/cached label. Explain that code executes the query against the available data. |
| 3:00-4:15 | Return to the second case, open Memory and event evidence. Show how a prior case changes the next investigation, with source labels. |
| 4:15-5:00 | Close: "The useful output is a traceable issue and a next action, not another plausible summary." Name the repair limitation. |

## Service detail to know

`federato.py` normalises fields, enforces joins and lints the supported query subset. `ask.py` caches by question and exposes how the result was obtained. Numeric formatting preserves IDs and years. Desk memory contains case identity and issue information; it cannot supply a risk price. Filing a defect is a separate Composio workflow and needs a connected toolkit.

## Evidence

Code: `api/src/atlas_api/federato.py`, `ask.py`, `openai_runtime.py`. UI: `/cases/126`, `/cases/141`, `/ask`. Use the visible issue count, not the old claim of 16 out of 22 rows.

## Limitation to say

"We detect and explain these defects. We do not repair Federato upstream, and this is not a Rox product integration."

## If it fails

Show the source rows and the recorded query. State cached status. Skip the defect-ticket action if its toolkit is not connected.

## Likely question

How do you know the defects are real? "They arise from consistency checks over the supplied snapshot. We can point to the conflicting records rather than a model assertion."
