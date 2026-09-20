# Pixie

Pixie is one inspectable risk engine presented as two products.

The Federato desk scores commercial property submissions as intervals, records the source of every fact, and lets specialist agents investigate the cases that need judgment. The Intact experience follows the consumer through Quote, Decide, Protect, and Recover. Its Expo app contains a working Toronto tenant estimate, deterministic synthetic Auto comparisons, prevention records, driving-context coaching, and a locally exportable recovery plan.

Pixie was built for Hack the North 2026. The repository retains the internal package name `atlas`.

## Demo

Read [DEMO/README.md](DEMO/README.md) before presenting. It links the five-minute base script and one focused card for each active track.

The web app has a product switch:

- Federato opens the commercial queue, case analysis, guideline editor, portfolio map, Ask, and backtest.
- Intact opens a Home or Auto lifecycle presentation and sends the presenter to the Expo app for each working customer flow.

The Expo app has four persistent stages:

- Quote collects tenant or Auto inputs and produces a sourced estimate.
- Decide tests one change without overwriting confirmed facts.
- Protect records prevention work and can run a coaching-only driving-context demo.
- Recover guides the customer through safety, incident records, and a recovery plan they can save or share.

The iOS development build adds a home-screen widget and Live Activity for drive context. Expo Go and the web build show the same foreground flow with a labelled fallback.

## Run it

Use [docs/RUNBOOK.md](docs/RUNBOOK.md). The standard stack is:

- FastAPI on port 8000
- Next.js production server on port 3100
- Expo on port 8081

The optional MCP server runs over standard input/output by default. See [mcp/README.md](mcp/README.md).

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
| `app/` | Expo Home and Auto consumer app |
| `mcp/` | Privacy-limited consumer-insurance MCP server |
| `packs/` | US and Toronto risk data |
| `rules/` | Commercial and renter guidelines |
| `eval/` | Pre-registered backtest and model checks |
| `DEMO/` | Current booth script and per-track cards |
| `docs/` | Architecture, runbook, evidence, and limitations |

The active sponsor stories are Federato, Intact, Rox, Sentry, Elastic, and Expo. Expo is the mobile implementation of the Intact product rather than a separate product experience.

Home pricing currently means renter or tenant insurance. Pixie does not claim a homeowner tariff. Auto rates, vehicle listings, and route zones are synthetic demo inputs. Every price is an illustrative Pixie estimate, not an Intact price or an offer of insurance.
