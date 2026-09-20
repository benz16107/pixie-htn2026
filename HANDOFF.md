# Handoff

Updated 2026-09-20 after the product and track cleanup.

## Current product

Pixie has two intentionally separate front ends over one risk engine:

- Federato is the commercial underwriter desk. Its five-minute path is the one unresolved queue row, case 138, then either the portfolio or validation as supporting proof.
- Intact is the renter operations view. Its main path is Intact overview, the three-stage Expo quote, and an optional referral into the underwriter desk.

The top-left product switch changes the complete web experience. The Expo app uses Intact styling and a three-stage Address, Coverage, Estimate flow. The neighbourhood map is optional.

The Federato interface has a larger reading scale, a one-row default review queue, a consistent case-score baseline, and a bundled geographic fallback when the external basemap fails. The Expo app has no 390 px horizontal overflow, moves focus to an invalid address, and exposes source links as separate screen-reader targets.

## Intact direction under consideration

The exact Intact brief asks for new AI-based ways to get car insurance, tenant insurance, or both. The leading next concept is a life-change insurance assistant: import the current policy once, read a lease or rental listing, compare car listings with one saved profile, and return a combined monthly estimate plus an advisor-ready package.

An Insurance Passport and MCP server can expose privacy-limited estimate and quote-preparation tools to other AI agents. It should not expose a full profile tool or submit an application without explicit consent. CrashClip remains the post-incident evidence service. It should connect after purchase rather than become an underwriting or driving-score input.

## Start and verify

Run `./start.sh` from this repository. It starts the API on 8000, the web production build on 3100, and Expo on 8081. Use a reachable `EXPO_PUBLIC_API_URL` for a physical phone.

Verification commands:

```bash
cd api && SENTRY_DSN_API= uv run pytest -q
cd web && npm run build
cd app && npx tsc --noEmit
```

Use [docs/RUNBOOK.md](docs/RUNBOOK.md) for recovery steps and [DEMO/README.md](DEMO/README.md) for the pitch.

## Important code

| File | Responsibility |
| --- | --- |
| `api/src/atlas_api/case.py` | Facts, provenance, missing values, and data defects |
| `api/src/atlas_api/engine.py` | Bands, intervals, caps, thresholds, and explanations |
| `api/src/atlas_api/guideline.py` | Active editable commercial guideline |
| `api/src/atlas_api/desk.py` | Six agent roles, replay, budget, and number verification |
| `api/src/atlas_api/tenant.py` | Toronto renter quote and itemized receipt |
| `api/src/atlas_api/memory.py` | Number-free local recall across cases |
| `api/src/atlas_api/precedent.py` | Elastic precedent retrieval with memory fallback |
| `api/src/atlas_api/portfolio.py` | Concentration calculations |
| `api/src/atlas_api/app.py` | HTTP routes and response builders |
| `web/src/components/live/LiveDesk.tsx` | Short commercial presentation sequence |
| `app/app/quote.tsx` | Mobile quote result, speech, PDF, share, and referral |

## Invariants to preserve

- Do not hard-code the 45 and 70 commercial thresholds. Read the active guideline.
- Replay must remain visibly labelled and must not call a model.
- A hypothetical what-if value must never overwrite a confirmed fact.
- A human override requires a reason, stays within five points, and does not rewrite the engine result.
- The renter price is illustrative and must remain labelled that way.
- Demo reset must undo stored human changes and guideline edits.
- `cache/layers`, `var`, and `data/federato` are machine-local or gitignored.

## Active demo tracks

Federato, Intact, Rox, Sentry, Elastic, and Expo have dedicated stories. OpenAI, Huawei, and Backboard are not judging tracks. The agent runtime remains an internal part of the Federato workflow.
