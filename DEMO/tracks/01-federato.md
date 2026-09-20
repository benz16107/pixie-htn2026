# Federato: five-minute demo

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md)

## Context and angle

Federato is the underwriting-software audience. Focus on appetite, incomplete submissions and a controlled change to the guideline. The supplied dataset has no broker behaviour signal for a credible winnability model. Do not pitch the tenant app here unless asked about reuse.

Opening: "Before automating a decision, we show which missing fact could change it."

## Prepare

Open `/cases/138`, `/guideline` and `/backtest`. Reset the demo first. Check the current premium provenance. Keep the filed guideline and one scenario ready.

## Timed script

| Time | Show and say |
|---|---|
| 0:00-0:40 | Open case 138. Explain insured, broker, premium and TIV in one sentence. Point to the missing or estimated premium. |
| 0:40-1:40 | Show Score breakdown. Trace one fact to its source and one rule to its band. Explain why the interval crosses the decision boundary. |
| 1:40-2:35 | Move the premium slider into a filed acceptable band. Read the new result, then reset the slider. Explain that this asks for a confirmed hypothetical input. |
| 2:35-4:10 | Open Guideline. Select one preset, inspect its edits, apply it and read the measured case/rank diff. Open an affected case if time permits. Reset the guideline after showing the result. |
| 4:10-5:00 | Show the backtest headline and one known miss. Close: "A carrier can challenge the input, rule and result in the same workflow." |

## Service detail to know

The snapshot adapter preserves query and join provenance. Known, estimated and missing facts produce different possible bands. `guideline.py` validates edits before a whole-book rescore. The queue, waterfall and what-if use the same active rule. A bounded human override is separately labelled and requires a reason. Non-property lines route to another desk.

## Evidence

Website: `/cases/138`, `/guideline`, `/backtest`. Code: `api/src/atlas_api/federato.py`, `engine.py`, `guideline.py`. Tests: `test_guideline.py`, especially the shared-reader consistency test. Background: [Federato brief](../6-FEDERATO-BRIEF.md).

## Limitation to say

"This is your synthetic snapshot and a transcription of the supplied appetite rule. The backtest measures disagreement, not loss prevention. We do not model winnability."

## If it fails

Use the current case waterfall and saved backtest. A rule-editor outage does not justify pretending a preset description is a measured diff.

## Likely question

Why not one LLM? "A rule edit needs a reproducible effect across the book. Code supplies that; models investigate the missing evidence."
