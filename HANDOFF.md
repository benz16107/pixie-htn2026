# Handoff

Updated 2026-09-20 after the product and track cleanup.

## Current product

Pixie has two intentionally separate front ends over one risk engine:

- Federato is the commercial underwriter desk. Its main path is queue, case 138, guideline scenario, and backtest.
- Intact is the renter operations view. Its main path is Intact overview, Expo quote, and optional referral into the underwriter desk.

The top-left product switch changes the complete web experience. The Expo app uses Intact styling and no longer contains a photo-inventory branch.

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
| `api/src/atlas_api/memory.py` | Backboard memory and labelled model judgments |
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

Federato, Intact, Rox, OpenAI and Codex, Sentry, Elastic, Expo, and Backboard have dedicated stories. Huawei remains a conditional explanation of the collaboration design. The removed sponsor integrations have no API routes, UI controls, dependencies, fixtures, or current documentation.
