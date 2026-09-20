# Intact: asynchronous judging guide

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md)

## The pitch

"Most quote apps stop when the customer buys. Pixie stays useful through Quote, Decide, Protect, and Recover, with the facts and source trail visible at every step."

The Intact web page is the visual overview. The Expo app is the working customer product. Lead with Auto because its vehicle comparison, driving context, native widget, and recovery flow form the strongest visual sequence. Use Home to prove the complete priced tenant path and advisor referral.

## What the judge should understand

| Stage | Customer value | Working proof |
| --- | --- | --- |
| Quote | See the car payment and insurance estimate before choosing a vehicle, or price a Toronto tenant scenario | Three-vehicle Auto comparison and itemized tenant estimate |
| Decide | Test one choice without changing confirmed facts | Auto distance, parking, and deductible scenarios; tenant contents coverage |
| Protect | Keep useful records and understand opt-in driving context | Home inventory, prevention checklist, drive screen, iOS widget, and Live Activity |
| Recover | Organize the next actions without uploading evidence | Required safety confirmation, incident record, local reference, and recovery-plan PDF |

The challenge asks for a modern way to get car insurance, tenant insurance, or both through AI. Judges need to see a working input, recommendation or estimate, next step, usable interface, accessibility, and clear documentation. Pixie addresses the brief without claiming a carrier-approved price.

## Why this approach

The quote starts the relationship rather than ending it. Customers can compare a purchase, understand one trade-off, take prevention steps, and prepare evidence after an incident in the same product.

The pricing and coaching formulas are deterministic. AI agents can use narrow MCP tools to compare cars, estimate scenarios, prepare a draft, read a limited policy summary, assess drive context, or prepare recovery. They cannot fetch a full customer profile, invent a price, submit an application, or send a recovery request.

## Recommended screenshot sequence

Capture these after resetting the app to the stated stage. Use short captions because judges may only scan the gallery.

| Order | Capture | Caption |
| ---: | --- | --- |
| 1 | `/intact`, Auto selected, stage rail and proof visible | **Quote is one part of the relationship.** Pixie keeps Quote, Decide, Protect, and Recover in one customer journey. |
| 2 | Expo Auto comparison with three vehicles | **See insurance before choosing the car.** The same driver profile makes the vehicle difference legible. |
| 3 | Expo Decide after selecting a different scenario | **A what-if stays hypothetical.** Pixie changes one input and preserves the confirmed baseline. |
| 4 | Drive context with factor list and source disclosure | **Behavior and route context stay separate.** Coaching is explained, opt-in, and excluded from pricing. |
| 5 | iOS widget and Live Activity in one composed image | **Drive context at a glance.** Native Expo surfaces carry the active coaching state outside the app. |
| 6 | Recovery record checklist, then the ready plan | **Safety, record, plan.** Pixie creates a local summary the customer can save or share and submits nothing automatically. |
| 7 | Tenant receipt or referral page | **The Home route has a working tenant estimate.** The original itemized receipt survives an advisor referral. |

The first and fifth images are the strongest cover candidates. Use the first if the gallery accepts only one landscape cover.

## 2 minute 35 second video

| Time | Action | Script |
| ---: | --- | --- |
| 0:00 to 0:15 | On `/intact`, select Auto and point across the stage rail. | "Pixie treats insurance as four connected jobs: get a quote, understand the choice, reduce preventable loss, and recover with better evidence." |
| 0:15 to 0:42 | Open Expo Quote. Compare the Corolla, CX-5, and IONIQ 5. | "I am shopping for a car. Pixie keeps one synthetic driver scenario fixed and puts the vehicle payment beside an illustrative insurance estimate before I buy." |
| 0:42 to 1:00 | Open Decide and select the lower-distance scenario. | "This changes one assumption. It is visibly hypothetical and does not rewrite my saved profile." |
| 1:00 to 1:32 | Open Protect and start drive context. Advance to a second zone and show the factors. | "During a drive, Pixie separates behavior from coarse route context. The factors are visible, no coordinates are stored, and the result cannot change my premium." |
| 1:32 to 1:45 | Show the iOS widget and Live Activity. | "The native development build publishes that active context through Expo's widget and Live Activity support." |
| 1:45 to 2:10 | Open Recover. Choose Collision, confirm people are safe, mark two record sections, and build the plan. | "Recovery starts with safety. I mark what I have recorded, add notes, and build a local plan with a reference and next actions. Pixie never uploads my evidence." |
| 2:10 to 2:26 | Switch to Home and show the tenant receipt or contents what-if. | "Home uses the same lifecycle with a working Toronto tenant estimate, an itemized receipt, and advisor review when the rules require it." |
| 2:26 to 2:35 | Return to the four-stage web view. | "The models guide the experience. Deterministic code owns the numbers, and every estimate keeps its limits visible." |

## Details to know

- `tenant.py` computes tenant estimates in integer cents and applies referral rules.
- `consumer.py` computes Auto estimates and comparisons from the bundled synthetic table.
- `driving.py` keeps behavior and route context separate, then publishes the documented coaching composite.
- The driving endpoint receives coordinates rounded to three decimal places, returns no coordinates, and stores nothing.
- The recovery screen requires a safety confirmation, records which information the customer has, and prepares a local PDF plan. It does not upload or inspect evidence or file a claim.
- The MCP server imports the same calculation functions instead of reimplementing them.

## Required disclosures

Say or show this before the video ends:

"Home pricing currently supports tenant insurance only. Auto prices, listings, and route zones are synthetic demonstration inputs. Drive context is coaching-only and cannot change a quote or premium. The widget and Live Activity require an iOS development build. Recovery creates a local record but uploads and submits nothing. These are illustrative Pixie estimates, not Intact prices or offers of insurance."

## Capture fallbacks

- If the phone loses the API, keep recording with the labelled bundled Auto and driving fallbacks.
- If the native extension is unavailable, show the foreground drive screen. Omit the widget screenshot and do not say Expo Go ran a Live Activity.
- If tenant geocoding fails, use a bundled Toronto address.
- If PDF sharing is unavailable, end on the ready recovery plan. State that the record remains local and no claim was submitted.
