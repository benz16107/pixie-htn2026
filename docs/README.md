# Which document to read

## Tomorrow, in this order

1. **[RUNBOOK.md](RUNBOOK.md)** — where it runs, what to open, what to do when something breaks,
   and the answers to the questions judges ask. Read this one first.
2. **[PITCHES.md](PITCHES.md)** — twelve five-minute pitches, one per sponsor, every number sourced.
3. **[TRACKS.md](TRACKS.md)** — one row per track: what we built, why, and what is verified versus
   what is not. Read the last column before claiming anything on stage.
4. **[DEVILS-ADVOCATE.md](DEVILS-ADVOCATE.md)** — the five hardest objections and the honest answers.
5. **[ARCHITECTURE.md](ARCHITECTURE.md)** — the diagrams. Renders are in `diagrams/`.
6. **[DEVPOST.md](DEVPOST.md)** — the submission copy, ready to paste.

## Outside this folder, and worth knowing

- **[../README.md](../README.md)** — what Pixie is, for someone opening the repo cold.
- **[../AGENTS.md](../AGENTS.md)** — the six invariants every coding agent had to obey. This is the
  honesty claim in writing: no number comes from a model, missing is never a pass, provenance on
  every value.
- **[../packs/toronto/PRICING.md](../packs/toronto/PRICING.md)** — every invented pricing constant,
  named. The answer to "are these real prices".
- **[../eval/BACKTEST.md](../eval/BACKTEST.md)** — B1 to B4 defined and committed before the first
  run, so the metrics could not be tuned after seeing them.

## Per feature, if a judge goes deep

[GUIDELINE.md](GUIDELINE.md) — the live guideline: editing the carrier's appetite and watching the
book re-score (our answer to Federato's Control Tower). [OVERRIDE.md](OVERRIDE.md) — the
underwriter's bounded nudge of the engine's interval.

## Per sponsor, if a judge goes deep

[SENTRY.md](SENTRY.md) · [ELASTIC.md](ELASTIC.md) · [COMPOSIO.md](COMPOSIO.md) · [LINQ.md](LINQ.md) ·
[EXPO-GEMINI.md](EXPO-GEMINI.md) · [OPENAI.md](OPENAI.md) · [BACKBOARD.md](BACKBOARD.md)

## Working notes, not needed for the demo

`AUDIT.md` (the state of things at 18:50 Saturday and the plan that followed), `PLAN.md`,
`DESIGN.md`, `INTEGRATIONS.md`, `NOTES.md`, `arena/` (the two candidate designs that were merged
into one), `research/` (the capability studies each integration was built from), `sketch/`.

The three alternative designs live on their own branches, not on main: `lane/d1`, `lane/d2`,
`lane/d3`, each with a `docs/DESIGN-D*.md`.
