# Intact: asynchronous judging guide

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md)

## The pitch

"Pixie gives customers one clear place to get insurance, understand a choice, reduce risk, and recover after an incident. The web diagram explains the system. The Expo app proves the customer experience. The MCP server lets an AI agent use the same narrow, sourced insurance tools."

This submission is judged from the Devpost page. The first image and first 15 seconds must explain the whole product without narration.

## The story to tell

The web page shows four connected insurance jobs: Quote, Decide, Protect, and Recover. Each job connects directly to its Home proof, Auto proof, deterministic service, and MCP role. Clicking a node opens its evidence.

The phone uses consumer language instead. Its tabs are Home, Compare, Safety, and Help. Home and Auto share the same app but show different tools. This keeps the pitch architecture out of the customer's way.

| Customer need | Working proof |
| --- | --- |
| Get covered | Toronto tenant estimate and three-car Auto comparison |
| Understand the choice | Itemized receipt and one-change-at-a-time comparisons |
| Reduce risk | Room inventory, prevention tasks, and foreground Drive Score |
| Get help | Safety-first incident record and local recovery-plan PDF |
| Ask through an agent | Live MCP tenant estimate, car comparison, and drive explanation |

## Why the Drive Score is different

The phone measures speed and hard braking during an explicit foreground session. The service evaluates road context separately. Driving near a school or dense intersection can lower the context score because the route needs more attention. That does not label the driver as unsafe. The final coaching score shows both parts, stores no coordinates, and stays outside pricing.

## Live MCP demo

Open `/intact/agent`. Use **Tenant estimate** first.

1. Change the address or contents amount.
2. Point to the selected tool and the exact arguments.
3. Click **Run live agent request**.
4. Show the itemized result and its sources.
5. Switch to **Explain a drive** to show the behavior score beside the road-context score.

Say: "The model can choose a tool and explain the answer. The MCP server validates the input. Deterministic code owns the price and score."

The repository contains `.mcp.json`, so project-aware agents can start the stdio server. Other MCP clients can use `http://macserver:8010/mcp` while the HTTP process is running. The server exposes nine tools and needs no API key.

## Devpost gallery

1. Connected web diagram with Quote, Decide, Protect, Recover, MCP, Expo, and proof nodes visible.
2. Consumer phone Home screen.
3. Three-car comparison.
4. Active Drive Score and the widget or Live Activity.
5. Live MCP request with a sourced tenant result.
6. Tenant receipt or ready recovery plan.

## Two-minute, forty-second video

| Time | Action | Script |
| ---: | --- | --- |
| 0:00 to 0:18 | Show the connected web diagram. | "Getting insurance is one moment in a longer relationship. Pixie connects quoting, decisions, prevention, and recovery to one phone app and one set of controlled tools." |
| 0:18 to 0:42 | Show the phone Home and Auto comparison. | "The phone speaks in customer tasks. I can estimate tenant coverage or compare the cost of a car and its insurance before I buy." |
| 0:42 to 1:15 | Run the Drive Score sample. | "During an opt-in drive, Pixie measures speed changes and hard braking. It evaluates coarse road context separately, explains both scores, and stores no route." |
| 1:15 to 1:30 | Show widget and Live Activity proof. | "Expo keeps the active score visible on the Home Screen, Lock Screen, and Dynamic Island in the native development build." |
| 1:30 to 2:05 | Open the live MCP page and run the tenant request. | "An AI agent can ask for the same estimate through MCP. You can see the tool, every argument, the deterministic answer, and the source behind each line." |
| 2:05 to 2:27 | Show Help and create a recovery plan. | "After an incident, Pixie starts with safety, organizes the record locally, and lets the customer decide whether to share it." |
| 2:27 to 2:40 | Return to the diagram. | "Models choose and explain. Typed tools calculate. Customers can see what happened and what to do next." |

## Required disclosure

"Pixie currently prices tenant insurance, not homeowner insurance. Vehicle listings, Auto prices, and route contexts are illustrative. Drive Score is coaching only and cannot change a premium. Native widgets and Live Activities require an iOS development build. Pixie does not submit an insurance application or claim."

If the API is unavailable, use the labelled illustrative estimates. If Apple signing is unavailable, show the foreground Drive Score and the in-app native-surface previews. If geocoding fails, use one of the provided Toronto addresses.
