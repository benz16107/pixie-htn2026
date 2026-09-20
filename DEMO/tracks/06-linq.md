# Linq: five-minute demo

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md)

## Context and angle

The service-specific story is work inside an iMessage conversation: outbound digest, case receipt and inbound command. A rendered phone in the website is only a mirror. The actual handset thread and delivery response are the evidence.

Opening: "The underwriter can receive a case, inspect its receipt and respond from the conversation they already have open."

## Prepare

Open the actual Pixie thread on the phone and `/live` on the laptop. Check the current PUBLIC_URL and webhook. Use the prepared digest rather than sending several duplicates. Sending from the UI is real when actions are live.

## Timed script

| Time | Show and say |
|---|---|
| 0:00-0:40 | Show the handset thread and explain the underwriter workflow. |
| 0:40-1:40 | Show an existing delivered digest, or intentionally send one with **Send the digest**. Read status instead of treating HTTP success as delivery. |
| 1:40-2:45 | Show a receipt image and its corresponding case in the desk. Explain the public media URL and how the image uses the computed receipt. |
| 2:45-4:10 | Using your own phone, send the rehearsed typed command such as `why 1`. Show the response and event update if it arrives. Do not start `run 1` unless you have time for a multi-minute run. |
| 4:10-5:00 | Explain message-id association, deduplication, signature checking and fallback. Name the tapback limitation, then close on reducing app switching. |

## Service detail to know

`linq_routes.py` accepts digest commands and records actions in the case store. Receipt images are content-addressed files served under PUBLIC_URL. The sender polls message delivery status instead of assuming read-webhook delivery. Re-runs can show typing activity and send a text-only fallback if media fails. A reset clears local digest association and deduplication.

## Evidence

[Linq verification record](../../docs/LINQ.md), `api/src/atlas_api/linq.py`, `linq_routes.py`, `receipt.py`. `GET /api/atlas/linq/digest/status` reads the last digest status. A past verified renter message was $186.86 for its recorded inputs; do not generalise that price.

## Limitation to say

"Outbound messages and receipt delivery have been verified. Signed simulated tapback payloads work downstream, but actual handset reaction delivery has not been verified. Group chat and the separate renter reply path remain unverified live."

## If it fails

Show the existing delivered thread and the signed-webhook test. Label simulated inbound events. Do not silently inject a webhook and act as if a physical tap caused it.

## Likely question

Does a thumbs-up approve a policy? "The handler can record a human demo decision on the associated digest case. This is not a production policy-binding system, and handset tapback delivery still needs verification."
