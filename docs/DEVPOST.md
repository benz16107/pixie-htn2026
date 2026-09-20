# Devpost draft

## Pixie: insurance that shows its work

Pixie is a consumer insurance app and a commercial underwriting desk built on the same rule: AI can choose what to inspect and explain what it found, while deterministic tools own prices, scores, and decisions.

For consumers, Pixie puts Home and Auto insurance in one Expo app. Customers can estimate tenant coverage, compare a car with its insurance cost before buying, test a different choice, record prevention work, measure an opt-in Drive Score, and organize a private recovery plan after an incident.

For commercial underwriters, Pixie preserves missing information instead of silently treating it as zero. It calculates the full score interval, identifies which missing fact could change the decision, retrieves similar cases, and shows nearby portfolio exposure.

The Intact web experience explains how Quote, Decide, Protect, and Recover connect to the phone, MCP tools, calculation services, and human review. The phone uses customer language: Home, Compare, Safety, and Help.

## What we built

- A consumer Expo app for Home and Auto with Home, Compare, Safety, and Help navigation.
- A complete Toronto tenant estimate with location-assisted address entry, neighbourhood context, five coverage choices, an itemized receipt, spoken summary, PDF sharing, and advisor referral.
- A three-car Auto comparison that keeps the driver profile fixed and places the illustrative payment beside the insurance estimate.
- A foreground Drive Score that measures GPS speed, derives speeding and hard-brake events, and explains driving behavior separately from coarse road context.
- An iOS Home Screen widget and Live Activity built with `expo-widgets` for the active score, speed, and area.
- A reviewed room inventory, prevention tasks, and a safety-first recovery plan that stays local until the customer saves or shares it.
- A live MCP interface for tenant estimates, vehicle comparisons, drive explanations, application drafts, limited policy summaries, and recovery tasks.
- An interactive MCP judging page that shows the selected tool, exact arguments, deterministic result, and source lines.
- A FastAPI risk engine with provenance, missing-value intervals, what-if analysis, bounded overrides, and a reproducible backtest.
- A Federato desk for queue triage, case review, portfolio exposure, guideline changes, and agent replay.

## The Drive Score

The customer starts and stops tracking from the Drive Score screen. Expo Location supplies foreground speed and position. Pixie uses the phone's reported speed when available and otherwise derives it from distance and time. A speeding event begins when the observed speed crosses the chosen road threshold by more than 5 km/h. A hard-brake event is a drop of at least 12 km/h within five seconds from a starting speed of at least 25 km/h.

Before the app sends the route, it rounds each point to three decimal places and keeps at most 50 points. The stateless service classifies coarse examples such as a school approach, downtown intersections, or a controlled-access corridor. It returns a behavior score and a road-context score. The coaching score weights them at 75% and 25%. The service stores no route, returns no coordinates, and never changes the insurance estimate.

## The agent interface

Pixie's MCP server exposes nine narrow tools. An agent can select a tool and explain the answer, but it cannot invent a price or send an insurance application. The `/intact/agent` page makes that boundary visible. A judge can change a tenant input, inspect the exact JSON arguments, run the real MCP call, and read the sourced result.

Project-aware MCP clients can load the repository's `.mcp.json` file. HTTP clients can connect to the running Streamable HTTP endpoint. Both transports call the same Python calculation functions used by the phone and web app.

## Why we built it this way

Insurance software often asks people to trust a number without showing how it was produced. Pixie keeps the receipt beside the result. It also keeps hypothetical choices separate from confirmed facts.

The same boundary applies to AI. Models help with tool choice, investigation, and explanation. Typed tools validate the inputs. Code calculates the number. The interface preserves source data and limitations so a customer or underwriter can challenge the result.

## Limits

- Home pricing currently supports tenant insurance only. Pixie does not implement a homeowner tariff.
- Vehicle listings, Auto estimates, and road-context examples are illustrative.
- Drive Score is opt-in coaching. It cannot change a quote or premium, and the service stores no route coordinates.
- The widget, Live Activity, SwiftUI, and Jetpack Compose controls require native development builds. Expo Go shows the shared foreground flow and the native-surface previews.
- Recovery creates a local record and PDF. It does not upload evidence or submit a claim.
- Every displayed price is an illustrative Pixie estimate, not an Intact price or offer of insurance.

## Stack

Python, FastAPI, Pydantic, SQLite, MCP, Elasticsearch, Sentry, Next.js, React, TypeScript, Expo Router, Expo UI, `expo-widgets`, Expo Location, React Native, Toronto open data, and OpenStreetMap.

## Recommended submission gallery

| Order | Capture | Caption |
| ---: | --- | --- |
| 1 | Connected Intact web diagram | **One insurance relationship, with every connection visible.** Quote, Decide, Protect, and Recover link to the phone, tools, services, and working proof. |
| 2 | Consumer phone Home screen | **Home and Auto in one consumer app.** Pixie presents customer tasks instead of internal insurance stages. |
| 3 | Three-car comparison | **See the car and its cover together.** The driver profile stays fixed while the vehicle changes. |
| 4 | Active Drive Score with native-surface previews | **Behavior and road context remain separate.** The widget and Live Activity carry the current score and speed outside the app. |
| 5 | Live MCP tenant result | **An agent request that shows its work.** The selected tool, exact inputs, calculated answer, and sources remain visible. |
| 6 | Tenant receipt or ready recovery plan | **A clear next step after the result.** The customer can listen, save, share, or ask for human help. |

## Two-minute, forty-second video

| Time | Picture | Voiceover |
| ---: | --- | --- |
| 0:00 to 0:18 | Connected Intact diagram | "Insurance is a relationship, not one quote form. Pixie connects getting covered, making a choice, reducing risk, and recovering after an incident." |
| 0:18 to 0:42 | Consumer Home and Auto comparison | "The phone stays simple. I can estimate tenant coverage or compare a car payment with its illustrative insurance cost before I buy." |
| 0:42 to 1:13 | Active Drive Score | "During an opt-in drive, Pixie measures speed changes and hard braking. It evaluates coarse road context separately, explains both scores, and stores no route." |
| 1:13 to 1:28 | Widget and Live Activity | "Expo publishes the active score, speed, and area to an iOS widget and Live Activity in the native development build." |
| 1:28 to 2:02 | Live MCP tenant request | "An AI agent can request the same estimate through MCP. The page shows the tool, every argument, the deterministic answer, and the source behind each line." |
| 2:02 to 2:25 | Recovery plan | "After an incident, Pixie starts with safety and builds a local record. The customer chooses whether to save or share it." |
| 2:25 to 2:40 | Return to the connected diagram | "Models choose and explain. Typed tools calculate. Customers and underwriters can see what happened and what to do next." |

Keep the first number and its disclosure in the same frame. Describe the widget and Live Activity as previews until the development build is installed and captured on an iPhone.
