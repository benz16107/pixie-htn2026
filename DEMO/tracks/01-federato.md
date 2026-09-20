# Federato: five-minute demo

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md) · [Underwriting background](../6-FEDERATO-BRIEF.md)

## The pitch

"A missing field should widen the decision, not quietly pass. Pixie shows the range, the source of every value, and the one fact that would settle the case."

Federato is one of the two main product demos. Stay in the commercial underwriter experience. The story is incomplete submissions, portfolio context, and a rule change an underwriter can inspect.

## What we built for this track

- A submission queue that puts unresolved cases first and explains what each one needs.
- A case view with known, estimated, and missing facts, each tied to its source field.
- A score interval that tests every plausible rule band when a field is missing.
- A what-if control that previews a confirmed answer without changing the filed submission.
- A 3D portfolio map where tower height is active total insured value in an H3 cell.
- An editable guideline with a measured whole-book diff and a reset.
- A small backtest that keeps sample size and known misses visible.

## What comes from Federato

Pixie reads the supplied Federato snapshot and schema, follows the actual joins between submissions, insureds, policies, locations, and losses, and keeps those source paths attached to the case. The adapter also supports checked queries for the Ask page. Pixie does not claim to call a hosted Federato production API.

## Why it fits Pixie

The risk engine cannot make an honest decision until the source data is hydrated correctly. Federato supplies the insurance-shaped records. Pixie adds uncertainty handling, rule execution, geographic portfolio context, and the review interface around them.

## Five-minute flow

| Time | Show and say |
|---|---|
| 0:00-0:35 | Open `/queue`. Point to the single unresolved submission and the reason it needs attention. |
| 0:35-1:45 | Open case 138. Trace one fact to its Federato source, then show the 30-75 interval crossing the referral line. |
| 1:45-2:25 | Move the premium what-if. Say that it previews a confirmed answer and never overwrites the case. |
| 2:25-3:20 | Open `/map`. Rotate the 3D exposure view, filter one peril, and explain that tower height is active insured value. |
| 3:20-4:25 | Open `/guideline`, apply one rehearsed scenario, and read the measured case and queue changes. Reset it. |
| 4:25-5:00 | Show the backtest sample size and one known miss. Close on the source, rule, and result being inspectable together. |

## Know these details

`federato.py` performs schema-aware loading and preserves provenance. `engine.py` computes score intervals. `portfolio.py` groups active exposure into H3 cells. `guideline.py` validates edits before rescoring the book. The map visualizes computed portfolio totals; the model does not create them.

## Say this limitation

"This uses Federato's supplied synthetic snapshot and our transcription of the supplied appetite rule. The backtest measures disagreement on a small sample. It does not prove loss prevention or model winnability."

## If it fails

Use case 138 and the saved backtest. If WebGL fails, the map keeps a geographic exposure fallback and the ranked concentration list. Do not describe a scenario label as a measured result unless the diff loaded.
