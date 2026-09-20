# Gemini: five-minute demo

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md)

## Context and angle

The service-specific value is translating a room photo into editable inventory and explaining local context with citations. The quote engine remains deterministic, but model-generated item values are real inputs and must be described honestly.

Opening: "Gemini turns a room photo into a contents estimate the renter can inspect and edit before code computes the quote."

## Prepare

Open the Expo inventory flow with an exact previously warmed photo. Keep a completed quote with its context card, citations and arithmetic-check control ready. New photo/address inputs need a working Gemini key, model and network. Do not change model ids minutes before the booth.

## Timed script

| Time | Show and say |
|---|---|
| 0:00-0:35 | Show the photo and ask how a renter would estimate replacement value without listing every item. |
| 0:35-1:50 | Run or reopen the inventory. Show item, quantity, low/high estimate and source. Edit or remove an item before accepting the contents amount. |
| 1:50-2:50 | Open the quote and context card. Follow an actual Maps citation. Distinguish a grounded place description from the risk calculation. |
| 2:50-4:15 | Use the arithmetic-check control on the prepared receipt. Show returned code/tool output if available, then explain that the displayed match is determined by the server's own sum. Mention quote speech only if time remains. |
| 4:15-5:00 | Close: "We use the model where perception helps, expose its estimate, and retain a reproducible price calculation." |

## Service detail to know

`gemini_routes.py` has inventory, context, speech and verify routes. Inventory uses a response JSON schema, bounded quantities and item-value ranges. Python sums and clamps the contents suggestion. Context uses Maps grounding and location configuration. Speech caches WAV output. Verify exposes model code-execution output, while the server computes the match flag independently. Inspect the current constants for the configured model ids; provider availability is separate from code configuration.

## Evidence

Code: `api/src/atlas_api/gemini_routes.py`, `app/app/inventory.tsx`, `app/app/quote.tsx`. Tests: `api/tests/test_gemini_routes.py` use a fake client and prove response handling, not current provider availability. Existing cache hits are provider output reuse, not fresh calls.

## Limitation to say

"The inventory values are Gemini estimates, not insured valuations. The renter reviews them. This audit did not make fresh Gemini calls; a cached card is labelled evidence of a prior result."

## If it fails

Use the exact cached photo/context or the saved recording. Manual questions still produce a quote. Do not replace a failed provider response with invented items and call it live.

## Likely question

Why use code execution if Python already sums the receipt? "It is an inspectable secondary explanation. The application's pass/fail must remain independent of the model's statement."
