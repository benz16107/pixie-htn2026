# Pixie

Pixie is one risk engine presented as two products.

The Federato desk scores commercial property submissions as intervals, records the source of every fact, and lets specialist agents investigate the cases that need judgment. The Intact renter experience uses the same engine with Toronto data and a separate rules file to produce an itemized quote in an Expo app. A renter case that should not be auto-priced can move into the underwriter desk without changing its original receipt.

Pixie was built for Hack the North 2026. The repository retains the internal package name `atlas`.

## Demo

Read [DEMO/README.md](DEMO/README.md) before presenting. It links the five-minute base script and one focused card for each active track.

The web app has a product switch:

- Federato opens the commercial queue, case analysis, guideline editor, portfolio map, Ask, and backtest.
- Intact opens the renter operations view and sends the presenter to the Expo app for the quote flow.

The Expo flow is Address, Coverage, and Estimate. The customer can skip the optional map, review five prefilled choices on one screen, inspect the itemized receipt, save a PDF, share it, or open the advisor handoff.

## Run it

Use [docs/RUNBOOK.md](docs/RUNBOOK.md). The standard stack is:

- FastAPI on port 8000
- Next.js production server on port 3100
- Expo on port 8081

Replay is the default for the commercial live desk. It streams a recorded run without spending tokens or depending on venue Wi-Fi. A deliberate "Run live" action starts the model-backed desk.

## Core rules

1. Commercial score inputs and quote arithmetic come from code.
2. A missing field stays unknown and widens the score interval.
3. Every displayed fact carries its source.
4. External risk lookups are cached for an offline demo.
5. Region data lives in `packs/`; the engine contains no city-specific rules.
6. Secrets remain in gitignored environment files.

Model outputs are labelled. Agent prose is not presented as a confirmed fact or commercial score. `verify_numbers()` checks numbers in agent explanations against tool outputs and falls back to a deterministic explanation when the check fails.

## Repository map

| Path | Purpose |
| --- | --- |
| `api/` | FastAPI, the risk engine, case model, agent desk, quote API, and persistence |
| `web/` | Federato and Intact web experiences |
| `app/` | Expo renter quote app |
| `packs/` | US and Toronto risk data |
| `rules/` | Commercial and renter guidelines |
| `eval/` | Pre-registered backtest and model checks |
| `DEMO/` | Current booth script and per-track cards |
| `docs/` | Architecture, runbook, evidence, and limitations |

The active sponsor stories are Federato, Intact, Rox, Sentry, Elastic, and Expo. Expo is the mobile implementation of the Intact product rather than a separate product experience.
