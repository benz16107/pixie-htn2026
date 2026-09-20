# Handoff

Written 2026-09-20 to continue Pixie in a fresh session. Read `DEMO/README.md` first if the job is
to demo it; read this if the job is to change it.

> Status marker: this file is written while two lanes are still in flight. The section "Open at
> handoff" at the bottom says what was unfinished and is updated when they land.

## 1. Where everything is

| Thing | Where |
|---|---|
| The repo | `~/Code/hackathons/htn-2026/atlas` on **macserver**. No suffix |
| GitHub | `github.com/benz16107/pixie-htn2026`, private. `main` plus every lane branch |
| `atlas-a1` … `atlas-a7` | Git worktrees used to run agents in parallel. Scratch. Nothing of Ben's lives there |
| Runs on | macserver only. Ben demos from his laptop and phone over Tailscale |

**Do not move the project to the laptop.** Everything (recorded agent runs, the hazard cache, the
briefings, the Elastic indices, every key) lives here.

## 2. Bringing it up

    ~/Code/hackathons/htn-2026/atlas/start.sh

Starts what is down, leaves what is up alone, keeps macserver awake, warns on battery, checks the
tunnel through Cloudflare's resolver (this network will not resolve `trycloudflare.com` even when
the tunnel is healthy), and prints every URL.

| Piece | Port | Reached at |
|---|---|---|
| API | 8000 | `http://macserver:8000`, publicly `https://macserver.tailb51682.ts.net` (Tailscale Funnel, permanent) |
| Web | 3100 | `http://macserver:3100` |
| Expo | 8081 | `exp://100.95.223.110:8081` |

Tests: `cd api && SENTRY_DSN_API= uv run pytest -q`. Build: `cd web && npm run build`.
Always serve the production build, never `next dev` — cross-origin `/_next/*` breaks hydration.

## 3. What the product is

A commercial property submission arrives from Federato's API. A deterministic engine scores it
against a written guideline (`rules/property_2025.yaml`) and produces a **score interval, not a
number**, because facts are missing. Public hazard data and portfolio concentration move the
interval. If it crosses a decision line, six agents work out what would settle it, argue against
their own draft, and hand the underwriter a case with the reason, the counter-argument and a
drafted broker email. The same engine with a different rules file prices a renter's policy in an
Expo app.

**The six invariants** every change must keep (`AGENTS.md`):
1. No number comes from a model. Code computes; the model writes prose.
2. Missing is never a pass. An unknown fact widens the interval.
3. Provenance on every value.
4. External lookups cached to disk. The demo runs offline.
5. The engine is region-agnostic; regions live in `packs/`.
6. Secrets only in `.env`.

`verify_numbers` enforces (1) by string-checking every model sentence against tool-computed values
before it is shown. It runs as a real OpenAI Agents SDK output guardrail, and on its first live run
it caught the Lead quoting $35,716,000 that no tool had produced.

## 4. The code

    api/src/atlas_api/
      case.py         facts with provenance (Known / Estimated / Missing), data-defect detection
      engine.py       assess(): bands -> interval, hard-fail cap, thresholds, explain()
      guideline.py    the live-editable guideline; every reader calls guideline.active()
      explain.py      waterfall, what-if, sensitivity, the 3D decision surface
      override.py     the bounded human adjustment (±5)
      desk.py         the six agents, the event ledger, replay, verify_numbers guardrail
      precedent.py    Elastic hybrid search + reranker, with an in-memory twin
      portfolio.py    concentration within 30 km, Elastic or in-memory
      tenant.py       the renter quote; packs/toronto is its data
      actions.py      broker email, the reply loop, calendar, sheets, tickets (Composio)
      linq_routes.py  iMessage digest, tapbacks, receipt images, in-thread quote
      gemini_routes.py photo inventory, Maps grounding, TTS, code-execution check
      memory.py       Backboard assistant memory, RAG, System One judgements
      briefing.py     ElevenLabs audio with per-sentence timing marks
      app.py          the FastAPI shell and the view builders

    web/    Next.js 16. The shipping design is the "trading desk" direction (was lane/d1)
    app/    Expo SDK 57, the renter side
    packs/  us (hazard layers), toronto (open data + invented pricing constants)
    eval/   the pre-registered backtest and the per-model eval
    rules/  property_2025.yaml, the guideline the engine reads

50 API routes. Key ones beyond CRUD: `/cases/{id}/explain`, `/whatif`, `/sensitivity`, `/surface`,
`/precedent`, `/briefing`, `/memory`, `/override`, `/guideline` (GET/PUT), `/guideline/reset`,
`/composio/cases/{id}/broker-reply/check`, `/demo/reset`.

## 5. Things that will bite you

- **`rules/property_2025.yaml` is loaded in seven places.** All of them must call
  `guideline.active()`, or the queue and the case page will disagree after an edit. There is a test
  for this; do not weaken it.
- **Thresholds are not constants.** They come from the live guideline. Anything hardcoding 45/70
  is a bug (this was found and fixed once already).
- **`ATLAS_ACTIONS=live` is set.** Gmail and Linq really send from this machine. Set `dry` to rehearse.
- **`demo_reset` must undo everything a judge can do**: human decisions, overrides, applied broker
  replies, guideline edits. Every new mutating feature needs a line here, and a test.
- **Replay must never look live.** Anything with a recorded path returns `path: "replay"` and the UI
  badges it. This is the project's whole posture; do not soften it.
- **`cache/layers/`, `var/` and `data/federato` are gitignored.** A fresh clone will not run. Copy
  them from macserver (commands in `docs/RUNBOOK.md`).
- **The Playwright MCP browser is shared.** Parallel agents hijack each other's navigation. Give
  each its own port and its own browser context.
- **`pkill -f next-server` kills every lane's server.** Use `lsof -ti tcp:<port>`.

## 6. Documents

- `DEMO/` — six files, the whole demo: how it works, what to open, the questions, per-track, recovery,
  the Federato brief. This is the one to read standing up.
- `docs/README.md` — the index of everything else.
- `docs/TRACKS.md` — per sponsor, what was built and **what is verified versus not**. The thing that
  stops a false claim on stage.
- `docs/DEVILS-ADVOCATE.md` — the five hardest objections and the honest answers.
- `docs/research/` — the capability studies, plus three deep research passes on Federato's product, the
  competitive market, and the evidence and regulation. Every claim carries a URL.
- `docs/RUNBOOK.md`, `docs/ARCHITECTURE.md` + `docs/diagrams/`, `docs/PITCHES.md`.

## 7. What is honest and what is not

Known weak spots, all documented:
- The renter prices are invented and say so on their face.
- The backtest is 27 policies. B3 came back zero and the null result stayed on the page.
- The Challenger is not independent, so it is not "effective challenge" in the model-risk sense.
- The adversarial critic pattern is published (arXiv 2602.13213); do not claim it as novel.
- The genuinely novel piece is the interval that widens because named facts are missing.
- Backboard's guideline citation does not work; their chat 401s on a key in their own dashboard.

## 8. Open at handoff

To be filled in when the two in-flight lanes land.
