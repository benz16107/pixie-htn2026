# Atlas: rules for every coding agent (Claude Code, Codex)

**Product name: Pixie** (user-facing everywhere: UI, app, pitches, Devpost). The repo and code keep the internal name `atlas`.


Atlas is a multi-agent underwriting desk (Federato challenge) plus a consumer quote app (Intact challenge) on one shared risk engine. Plan: docs/PLAN.md (tasks T1-T13, W1-W8, C1-C8, E1-E5). Design and type contracts: docs/DESIGN.md and docs/sketch/. Hack the North 2026, solo build.

## Invariants (do not break; tests enforce them)
1. **No number comes from a model.** Scores, premiums, estimates, hazard factors, and portfolio totals are computed in code. LLMs plan queries, choose what to investigate, and write prose from already-computed values. Any explanation text is checked so that every number in it appears in the computed factor list.
2. **Missing is never a pass.** A missing field is `unknown`, shown as a gap, and never counted as meeting a rule.
3. **Provenance on every value.** Each case field carries where it came from (`Policy.premium`, `estimated from N comparables`, `missing`).
4. **External lookups are cached to disk** (`cache/`), keyed by inputs. The demo must run from cache with the network off.
5. **Region-agnostic engine.** No state, city, ticker, or dataset name in engine code; regions live in `packs/us` and `packs/toronto`.
6. **Secrets live only in `.env`** (gitignored). Never print or commit keys.

## Layout
- `api/`: Python 3.12, FastAPI (uv). Engine, desk, actions, HTTP API.
- `web/`: Next.js app router (underwriter desk UI, map, backtest).
- `app/`: Expo (Expo Go) consumer app for Intact.
- `packs/`: region data packs (US hazards; Toronto open data).
- `data/federato`, `docs/federato`: symlinks to the pulled Federato data and docs.

## Evidence logs (sponsor judging)
- `CODEX.md`: every task Codex did, with the PR/commit link (OpenAI prize).
- `INCIDENTS.md`: every time Sentry data changed a decision, with a link (Sentry prize). Only real incidents.
