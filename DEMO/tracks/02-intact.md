# Intact: five-minute demo

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md)

## Context and angle

The audience is consumer insurance. Start with the renter and show how a difficult quote reaches a human. This is a demo tariff, not an Intact underwriting or pricing integration.

Opening: "A renter gets an itemised quote, and a case we should not auto-price reaches an underwriter with the same receipt."

## Prepare

Open Expo Go on the address screen and `/queue?view=consumer` on the laptop. Use 180 Queen St W, Toronto. Rehearse an upper-unit quote and a basement/claims referral; confirm the displayed decision before the judge.

## Timed script

| Time | Show and say |
|---|---|
| 0:00-0:35 | Name the renter problem: choosing coverage without understanding the price. |
| 0:35-1:40 | Enter the prepared address and answer the coverage questions. Explain contents value, unit level and claims without opening every optional tool. |
| 1:40-2:50 | Open the quote receipt. Read the actual annual amount and the largest factors. Show their source or explanation. Do not recite an old $214.80 figure. |
| 2:50-4:15 | Use the rehearsed referral inputs. Open the resulting case id in the desk or refresh the consumer queue. Show the same answers and receipt on both devices. |
| 4:15-5:00 | Explain the separate tenant rules and shared API. Close with the next validation step: test comprehension and referral handling with renters and underwriters. |

## Service detail to know

The Toronto data pack supplies local risk inputs. `tenant.py` applies separate tenant rules and computes the receipt in cents. The API persists the quote so both clients open the same case. Open-queue referrals appear after commercial cases; approved tenant quotes belong in the consumer view. Gemini inventory is optional and editable, not required to get a quote.

## Evidence

Code: `api/src/atlas_api/tenant.py`, `packs/toronto/`, `app/app/quote.tsx`. Tests: `test_tenant.py` and `test_queue_is_region_aware` in `test_app.py`. Read the receipt currently on the device.

## Limitation to say

"The rates are prototype rates. We have not validated them actuarially, assessed fairness, or issued a policy."

## If it fails

Show the saved phone receipt and its corresponding desk case. If the phone is in fixture mode, label it as a sample and do not claim it just created a server referral.

## Likely question

Why combine renter and commercial insurance? "The shared part is provenance, rule execution and referral handling. Their factors and tariffs are different."
