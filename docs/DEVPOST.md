# Devpost draft

## Pixie: insurance that shows its work

Pixie is a commercial underwriting desk and a native consumer insurance app. Both products keep facts, estimates, missing information, and source trails visible.

A commercial submission rarely arrives complete. Pixie preserves that uncertainty instead of turning a blank into zero. Its deterministic engine evaluates every valid band for a missing fact and returns a score interval. The Federato desk shows the underwriter which fact could change the decision, where each value came from, how similar cases were handled, and how much exposure already exists nearby.

Consumers see a simpler four-stage relationship in the Intact experience:

1. **Quote** prices a Toronto tenant scenario or compares three synthetic Auto listings.
2. **Decide** changes one choice at a time without overwriting the saved baseline.
3. **Protect** records home-prevention work or explains opt-in driving context.
4. **Recover** guides the customer through safety, an incident record, and a locally exportable recovery plan.

The Next.js Intact page explains the lifecycle. The Expo app is the working customer product.

## What we built

- A FastAPI risk engine with provenance, missing-value intervals, live guidelines, what-if analysis, sensitivity, bounded overrides, and a reproducible backtest.
- A Federato interface for queue triage, case review, portfolio exposure, natural-language Ask, guideline changes, and agent replay.
- An Intact lifecycle presentation plus an Expo Home and Auto app with four persistent Router tabs.
- A working Toronto tenant estimate with address search, an optional native map, five coverage choices, an itemized receipt, PDF sharing, and advisor referral.
- A deterministic Auto comparison across three bundled synthetic vehicles, with one driver profile held constant.
- Expo UI controls backed by SwiftUI on iOS and Jetpack Compose on Android.
- An iOS drive-context widget and Live Activity built with `expo-widgets`.
- Foreground location, haptics, reduced-motion support, on-device speech, print, sharing, and safe-area handling.
- A stateless driving-context service that separates behavior from synthetic route context, reports the source of each factor, and stores no coordinates.
- A first-party Pixie recovery flow with incident types, required safety confirmation, a record checklist, notes, and a recovery plan the customer can save or share as a PDF.
- A privacy-limited MCP server for estimate, comparison, draft, policy-summary, drive-context, and recovery tasks. It exposes no full customer profile and sends nothing on the customer's behalf.
- Six specialist agents that investigate commercial cases while typed tools retain control of scores, prices, thresholds, and totals.
- Elastic retrieval for precedent and concentration, plus Sentry traces and unsupported-number alerts.

## How it works

The model chooses what to inspect and explains returned evidence. Code owns insurance arithmetic. A numerical guardrail checks model-written numbers against tool output before the commercial interface displays them.

The same boundary applies on the phone. The shared API computes tenant estimates, Auto comparisons, and driving context. Expo owns navigation, permissions, native controls, and glanceable iOS surfaces. API-first flows have labelled bundled fallbacks for unreliable hackathon Wi-Fi.

Recovery remains customer-controlled. Pixie first asks what happened and requires confirmation that people are safe or help is coming. The customer then marks the records they have, adds optional notes, and builds a local plan with a reference number and next actions. Pixie can create a PDF for the system share sheet. It does not upload or inspect evidence, file a claim, decide fault, or submit an insurance application.

## What we learned

The difficult part was deciding which work belongs to AI. Models are useful for investigation, explanation, and guided interaction. They should not invent a premium, silently fill a missing fact, or turn a route into a judgment about a person. Deterministic calculations, explicit provenance, and narrow tools make the result easier to test and challenge.

The second lesson was that quoting works better as one stage in a longer relationship. A customer can compare a purchase before committing, understand how one choice changes an estimate, record prevention work, and prepare evidence after an incident without learning a new product each time.

## Limits

- Home pricing supports tenant insurance only. Pixie does not implement a homeowner tariff.
- Auto prices, vehicle listings, and route zones use synthetic demonstration data.
- Driving context is opt-in coaching. It cannot change a quote or premium, and the API stores no route coordinates.
- The widget, Live Activity, SwiftUI, and Jetpack Compose surfaces require native development builds. Expo Go shows the labelled foreground fallback.
- Pixie recovery prepares a local record and PDF plan. It does not upload files or submit a claim.
- Every displayed price is an illustrative Pixie estimate, not an Intact price or offer of insurance.

## Stack

Python, FastAPI, Pydantic, SQLite, MCP, Elasticsearch, Sentry, Next.js, React, TypeScript, Expo Router, Expo UI, `expo-widgets`, Expo Location, React Native, and Toronto open data.

## Recommended submission screenshots

Use the first image as the Devpost cover. Keep phone captures at one device size and hide development menus.

The finished files and copy-ready captions are in [`docs/assets/intact`](assets/intact/README.md). The Expo app captures use one 390 by 844 pixel size.

| Order | Capture | Caption |
| ---: | --- | --- |
| 1 | Intact connected system graph with all four lifecycle stages and proof nodes visible | **One insurance relationship, four useful stages.** Pixie connects the Expo app, deterministic services, MCP tools, and human review to working Home and Auto proof. |
| 2 | Expo Auto comparison with all three vehicles and a source label | **Compare the car and its cover together.** The driver scenario stays fixed while the selected vehicle changes. |
| 3 | Expo Decide with the baseline and one what-if result | **Change one choice without losing the truth.** A hypothetical distance, parking, or deductible never overwrites the confirmed profile. |
| 4 | Drive context beside an iOS widget or Live Activity capture | **Useful context outside the app.** Expo publishes opt-in coaching to native glance surfaces while keeping it separate from pricing. |
| 5 | Pixie recovery record checklist, followed by the ready plan | **Safety, record, plan.** The customer reviews the record and chooses whether to save or share the local PDF. |
| 6 | Tenant quote receipt or advisor referral | **A working tenant path with a visible next step.** Every line item keeps its source, and review cases preserve the original receipt. |

Do not use a code screenshot as the cover. If the native widget cannot be captured from a development build, use the foreground drive-context screen and omit the widget claim from that caption.

## 2 minute 40 second video storyboard

| Time | Picture | Voiceover |
| ---: | --- | --- |
| 0:00 to 0:12 | Intact lifecycle page. Select Auto and move across the four stages. | "Most insurance apps disappear after the quote. Pixie stays useful through Quote, Decide, Protect, and Recover." |
| 0:12 to 0:36 | Phone on Auto Quote. Open the three-vehicle comparison and select a different vehicle. | "Before buying a car, I can compare its payment and an illustrative insurance estimate under the same driver profile. The source label tells me whether the shared service or bundled demo answered." |
| 0:36 to 0:55 | Open Decide and change one scenario. | "Decide changes one input at a time. This is a what-if, so it cannot overwrite the facts I already confirmed." |
| 0:55 to 1:24 | Open Protect, start drive context, and advance through two route zones. | "Protect keeps the app useful between renewals. Pixie separates driving behavior from coarse route context, explains each factor, stores no route, and keeps coaching out of the premium." |
| 1:24 to 1:38 | Show the iOS widget and Live Activity, or the labelled foreground fallback. | "Expo turns that active context into a widget and Live Activity on a native iOS development build." |
| 1:38 to 2:03 | Open Recover, choose an incident, confirm safety, mark two record sections, and build the plan. | "After an incident, Pixie starts with safety. I mark what I recorded, add notes, and build a local plan that I can save or share. Pixie uploads nothing and submits no claim." |
| 2:03 to 2:24 | Switch to Home. Show the tenant receipt and one contents-coverage what-if. | "The same lifecycle supports a working Toronto tenant estimate. The itemized receipt and advisor handoff keep the source trail intact." |
| 2:24 to 2:40 | End on the web lifecycle with the Expo phone beside it. | "Models guide the investigation and explanation. Deterministic code owns the prices and scores. Pixie gives customers a clear next step without hiding the limits of the demo." |

Record taps slowly enough for labels to remain readable. Cut loading time. Keep the source badge and disclosure in frame whenever a number first appears.
