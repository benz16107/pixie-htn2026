# Intact: five-minute demo

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md)

## The pitch

"Most quote apps stop when the customer buys. Pixie stays useful through Quote, Decide, Protect, and Recover, with the same facts and source trail at every step."

Use the Intact web page as the presentation and the Expo app as the working customer product. Pick one route for the main story. Auto has the stronger visual sequence. Tenant has the stronger end-to-end pricing and advisor handoff.

## What we built for this track

- A four-stage Home and Auto consumer experience in Expo Router.
- A working Toronto tenant estimate with an address, optional map, five coverage choices, an itemized receipt, PDF sharing, and advisor referral.
- A working synthetic Auto comparison across a Corolla, CX-5, and IONIQ 5. The same profile stays fixed so the vehicle effect remains visible.
- Decide screens that change one input without overwriting the confirmed baseline.
- A reviewed room-inventory flow for tenant protection.
- A driving-context flow that combines driving events with coarse synthetic route zones. It reports separate behavior, route, and composite coaching scores with provenance.
- Native SwiftUI and Jetpack Compose actions through Expo UI.
- An iOS widget and Live Activity through expo-widgets. Expo Go uses a labelled foreground fallback.
- A recovery checklist and Pixie Recover handoff powered by the separate CrashClip prototype.
- Privacy-limited MCP tools for AI agents to estimate, compare, prepare a draft, read a limited policy summary, assess drive context, and prepare recovery.

## What comes from the Intact challenge

The track is called "The Quoting Interface of the Future." Its eligibility line asks for modern ways to get car insurance, tenant insurance, or both through AI. Judges want a working prototype where the user supplies relevant information and receives a recommendation, estimate, or next step. They also score user experience, accessibility, and documentation.

The brief says tenant insurance rather than general homeowner insurance. Pixie calls the route Home because the relationship continues into inventory, prevention, and recovery. The working property price remains tenant-only.

## Why this approach

A chatbot that repeats a quote form stops at the quote. Pixie uses the quote as the start of a continuous customer relationship:

1. Quote gathers only the facts required for the selected product.
2. Decide lets the customer test a car, deductible, or coverage choice before committing.
3. Protect records useful prevention work and gives context during a drive.
4. Recover carries policy facts and reviewed evidence into the next step.

The quote and coaching formulas remain deterministic. AI agents can call the MCP tools, but they cannot invent a price, fetch a full profile, or submit an application.

## Five-minute Auto flow

| Time | Show and say |
| --- | --- |
| 0:00-0:35 | Start on `/intact` with Auto selected. "The quote is one stage in a longer insurance relationship." Point to Quote, Decide, Protect, and Recover. |
| 0:35-1:35 | Open Expo Quote and compare the three vehicles. "I keep the driver scenario fixed, so the customer sees the insurance effect before buying the car." |
| 1:35-2:20 | Open Decide and change annual distance, parking, or deductible. "This is a what-if. It never overwrites the confirmed profile." |
| 2:20-3:35 | Open Protect and start drive context. Show behavior, route context, the composite, and each source. If using the native build, show the widget and Live Activity. |
| 3:35-4:30 | Open Recover. Build the evidence checklist, then open Pixie Recover. "CrashClip preserves independent footage and packages it for review. It does not decide fault." |
| 4:30-5:00 | Describe the MCP boundary. "An agent can compare cars or prepare an advisor draft. It cannot read a full profile or submit to an insurer." State the limitations below. |

## Five-minute tenant alternative

Use the same four-stage rail. In Quote, select a Toronto address and request the tenant estimate. In Decide, change contents coverage. In Protect, run the room-inventory review. In Recover, prepare the home evidence handoff. Finish in `/intact/quotes` with the preserved receipt and referral reason.

## Know these details

- `tenant.py` computes tenant prices in integer cents and applies referral rules.
- `consumer.py` computes Auto estimates and comparisons from the bundled synthetic table.
- `driving.py` keeps behavior and route context separate, then publishes a documented coaching composite.
- The driving endpoint accepts coordinates rounded to three decimal places, returns no coordinates, and stores nothing.
- The MCP server imports these same functions rather than duplicating the calculations.
- CrashClip is a separate deployed prototype. This repository contains screenshots and a launcher, not its source.

## Say these limitations

"Home pricing currently supports tenant insurance only. Auto prices, listings, and route zones are synthetic demonstration inputs. The driving score is coaching-only and does not change a premium. The widget and Live Activity require an iOS development build. CrashClip is a separate prototype. None of these prices are an Intact quote or offer."

## If it fails

- If the phone loses the API, use the bundled Auto and driving fallbacks. Say that the screen labels the source.
- If the native extension is unavailable, show the foreground drive screen and the widget code. Do not claim that Expo Go is running the Live Activity.
- If CrashClip is unavailable, use the embedded insurer screenshot and explain the capture, corroboration, and handoff.
- If tenant geocoding fails, use one of the bundled Toronto addresses.
