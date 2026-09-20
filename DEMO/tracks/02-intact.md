# Intact: five-minute demo

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md)

## Context and angle

The audience is consumer insurance. Start with the renter and show how a difficult quote reaches a human. This is a demo tariff, not an Intact underwriting or pricing integration.

Opening: "A renter gets an itemised quote, and a case we should not auto-price reaches an underwriter with the same receipt."

## Prepare

Open Expo Go on the address screen and `/intact` on the laptop. Use 180 Queen St W, Toronto. Keep `/intact/quotes` ready with one ready estimate and one basement referral. Rehearse the exact referral inputs and confirm the displayed decision before the judge.

## Timed script

| Time | Show and say |
|---|---|
| 0:00-0:30 | Start on `/intact`. Point to the separate Intact mode and say the renter journey has its own interface and rules. |
| 0:30-1:35 | Move to the phone. Enter the prepared address, inspect the Toronto block and answer the three coverage steps. Skip photo inventory for this track. |
| 1:35-2:45 | Open the quote receipt. Read the amount on screen and the largest receipt lines. Point out the source under one place factor and the exact-sum label. |
| 2:45-4:15 | Open the rehearsed basement referral, then refresh `/intact/quotes`. Open its Intact case page and show that the advisor receives the same receipt and applicant facts. |
| 4:15-5:00 | Use the top-left switch once to reveal the Federato handoff. Explain that interfaces and rules stay separate while provenance and rule execution share one engine. |

## Service detail to know

The Toronto data pack supplies local risk inputs. `tenant.py` applies separate tenant rules and computes the receipt in cents. The API persists the quote so the Expo app and Intact dashboard open the same case. `/intact/quotes` contains renter quotes only. A referral can continue into the Federato desk without changing the original receipt.

## Evidence

Code: `api/src/atlas_api/tenant.py`, `packs/toronto/`, `app/app/quote.tsx`. Tests: `test_tenant.py` and `test_queue_is_region_aware` in `test_app.py`. Read the receipt currently on the device.

## Limitation to say

"The rates are prototype rates. We have not validated them actuarially, assessed fairness, or issued a policy."

## If it fails

Show the saved phone receipt and its corresponding `/intact/cases/TQ-…` page. If the phone is in fixture mode, label it as a sample and do not claim it just created a server referral.

## Likely question

Why combine renter and commercial insurance? "The shared part is provenance, rule execution and referral handling. Their factors and tariffs are different."
