# Atlas execution plan, candidate 2 (solo + 3 coding agents, Sat 17:45 to Sun 08:00)

Design: `DESIGN.md` and `sketch/`. The case file is the trace; every screen is a fold over one event ledger. Repo: `/Users/ben/Code/hackathons/htn-2026/atlas`.

Lanes: **Ben** (keys, answer key, integration tests on real providers, review, demo), **A** = Claude Code backend (engine, desk, actions, HTTP), **B** = Claude Code web (Next.js desk UI, map, backtest page, ask box), **C** = Codex (packs and ETL, tests, backtest harness, Expo app, docs drafts). Every Codex task is logged in `CODEX.md` with the commit hash the moment it merges (OpenAI evidence). Every Sentry-driven change is logged in `INCIDENTS.md` when it happens, not at 07:00.

Rules for all agents (already in `AGENTS.md`): no number from a model, missing is never a pass, provenance on every value, every lookup cached to disk, no region names in engine code, secrets only in `.env`.

---

## 1. Hour-by-hour timeline

| Time | Ben | A (backend) | B (web) | C (Codex) | Milestone / done when |
|---|---|---|---|---|---|
| 17:45-18:30 | Setup checklist (section 3): Linq signup FIRST, Composio Gmail auth, Elastic trial, Sentry x3, OpenAI model id check, Gemini, ElevenLabs, cloudflared tunnel, Expo Go on phone. Commit `.env.example` | A1 `case.py` + SQLite store + fixture ledger; A2 `federato.py` client + schema cache + `check()` | B1 web shell, tokens, `/cases/[id]` renders the fixture as swimlanes from `api.ts` types | C1 Toronto downloads kicked off (TPS x3, address points, fire stations, hydrants, basement study, TRCA floodline) into `packs/toronto/raw/`; C2 `evals/test_fold.py` against the fixture | **M0 18:30** `uv run pytest` green; one live Federato query returns rows; the fixture swimlane renders 5 lanes |
| 18:30-19:45 | Write `evals/answer_key.yaml` (10 cases, section 4) BEFORE the engine scores anything | A3 `CaseBuilder` both hydration paths + `estimate_premium` + `infer_business_type`; A4 `appetite.py` + `packs/us/appetite.yaml`; A5 `Desk.run_deterministic` + `/queue` + CLI table | B2 `/queue` table (rank, verdict badge, factor chips, estimated badge, gaps count) | C3 `evals/test_answer_key.py`, `test_query_check.py`; C4 `packs/us/warm.py` warms the hazard cache for all 70 locations (FEMA, USGS, USFS, Open-Meteo, Nominatim at 1 req/s) | **M1 19:45** all 158 ranked deterministically with templated explanations; answer-key tests run (failures allowed, listed). Federato MVP met |
| 19:45-21:30 | Prompt files `api/prompts/*.md` (5 agents); tune on cases 126, 138, 143 | A6 `desk.py`: roster, tool closures, depth policy, conflicts gate, numbers check, SSE tail; A7 `Intake.ask` with retries | B3 live swimlane via SSE (arrows from `refs`, query JSON viewer, retry badge, conflict card with resolution); B4 ask box showing `attempts[]` | C5 Toronto ETL to `hex_scores.json` (res 9, shrinkage, percentiles, multipliers) + `zones` + `assets`; C6 Elastic loaders for `atlas-locations` and the Toronto indexes | **M2 21:30** `POST /cases/sub-126/run` streams 5 lanes live; ask box answers "Florida property over $50M TIV with no sprinklers" showing the query and one retry |
| 21:30-22:00 | Dinner while A/B/C run. Check M2 output on 3 cases for hallucinated numbers | A8 `risk.py` US pack over the warmed cache + `portfolio.py` (Elastic, fallback in-memory) wired into the desk | B5 map page (MapLibre + deck.gl H3HexagonLayer): portfolio hexes, case pin, what-if chip, before/after score chip | C7 `backtest.py` + `latest.json` v1 | |
| 22:00-23:00 | Read the backtest numbers; decide the stage sentence; write demo script v1 | A9 Sentry: spans on `federato.query`, `hazard.<lookup>`, `elastic.<op>`, `desk.run`; logs for cache misses and query retries; first INCIDENTS.md entry from a real trace | B6 backtest page (recall by reason, loss ratio by bucket, enrichment moved N) | C8 `evals/test_receipt_sums.py`, `test_numbers_check.py`; precompute script `scripts/precompute.py` | **M3 23:00** enrichment visibly moves rank on >= 3 open cases; map shows hexes; backtest page shows real numbers |
| 23:00-00:30 | Live tests: Composio email lands in the broker mailbox; Linq digest arrives on Ben's phone; reply "approve 2" updates the web queue | A10 `actions.py`: Composio request_info, Linq digest + webhook + ack, idempotency | B7 action buttons + status chips; queue live update on `decision` events; `underwriter` lane | C9 Expo app: `quote/index` (address search), `quote/map`, `quote/questions`, `quote/[caseId]` receipt, list-only path, VoiceOver labels, 44 pt targets. Uses `api.ts` and mock JSON until A11 lands | **M4 00:30** Federato complete incl. two live actions; `demo-safe-1` tag |
| 00:30-02:15 | Run the app on the phone via the tunnel; walk the list-only path with VoiceOver; fix copy | A11 `Consumer.quote`, `packs/toronto/tenant.yaml`, `/geocode` over address points, `/quote`, Toronto pack lookups, `hexes()` polygons | B8 `/cases/[id]` handles `region=toronto` (three lanes, receipt panel, "Open on phone" QR); privacy + terms pages | C10 Expo polish: reduced-motion, dynamic type, aria-live summary; `app/README.md` | **M5 02:15** address -> hexes -> 3 questions -> decision -> receipt -> "View as underwriter" opens the same case on web |
| 02:15-02:45 | **Feature freeze.** `scripts/precompute.py` runs the desk on all 21 open cases (live LLM) and the backtest; commit `demo-safe-2`; export DB copy `var/atlas-demo.sqlite` | A12 fix list from Ben only | B9 fix list only | C11 (overnight, branches only) Gemini places card + ElevenLabs briefing behind flags; README + Devpost drafts; CODEX.md fill-in | |
| 02:45-05:45 | **Sleep 3 h** | idle | idle | branches only, no merges | |
| 05:45-06:45 | Review C11 branches; merge if tests green; rehearsal 1 with a timer; record backup video (screen + phone) | Gemini/Eleven merge fixes | Screenshot pass for Devpost | Devpost text polish | **Code freeze 06:45** |
| 06:45-07:30 | README (Intact criterion 4), INCIDENTS.md, CODEX.md, Devpost form, repo public, prize list ticked | | | | **Submitted 07:30**; 07:30-08:00 buffer for Devpost edits only |
| 08:00-09:45 | Rehearse x3 (5-min and 60-s per booth); mint Federato token at 09:30; start API from `atlas-demo.sqlite`; phone charged, tunnel up, Expo Go open; warm one live case | | | | |

---

## 2. Task list per lane

Format: inputs -> outputs; acceptance test.

### Lane A (backend, Claude Code)
- **A1 case.py + store.** In: `sketch/case.py`. Out: `atlas/case.py`, `evals/fixtures/case_sub126.json`. Test: `python -m atlas.case` asserts hard_fail, points <= 30, one `target_vs_fail` conflict, 3 lanes; `post()` twice with the same key leaves one event.
- **A2 federato.py.** In: `.env`, `docs/federato/*.txt`, `schema.json`. Out: client with token refresh, `Schema.fetch`, `check()`, `run()`, `Snapshot.load`. Test: `check()` rewrites `where.exposure_units.location.state` to `$elemMatch`; a forced 401 re-mints once; `[VALIDATION_ERROR]` parses into code + message; live `Policy limit 5` returns 5 rows.
- **A3 CaseBuilder.** In: Snapshot. Out: `from_snapshot(id)` for all 158. Test: sub-126 tiv == 35,716,000 cited to 3 building ids; premium is `estimated` with >= 3 comparables; sub-1 premium is `api:Policy.premium#1001`; a submission whose insured holds an active same-line policy expiring within 60 days of target date is `renewal (derived)`.
- **A4 Appetite.** In: `packs/us/appetite.yaml`. Out: `evaluate()`, `missing_required()`, `deterministic_verdict()`. Test: `evals/test_answer_key.py` verdict + top_factor for the 10 cases; a Case with premium missing yields band `unknown`, never `acceptable`.
- **A5 run_deterministic + /queue + CLI.** Out: `atlas-api rank` prints 158 rows; `GET /queue`. Test: 158 rows, non-property rows carry `out_of_guideline`, every row has a templated explanation whose numbers pass `check_numbers`.
- **A6 desk.py.** In: `sketch/desk.py`, prompts. Out: `Desk.run` with SDK agents as tools, depth policy, conflict gate, numbers check, timeouts, SSE. Test: on sub-126 the ledger contains `plan`, >= 1 `query` from intake, 8 appetite findings, >= 1 hazard finding, 1 portfolio finding, all conflicts resolved, exactly one `decision`; `run()` twice yields the same event count.
- **A7 Intake.ask.** Test: "Florida property over $50M TIV with no sprinklers" returns rows > 0 within 3 attempts and `attempts[]` shows the query JSON; an unknown-field question shows the `unknown_field` issue and a corrected attempt.
- **A8 risk.py + portfolio.py.** In: warmed cache from C4, Elastic index from C6. Out: `assess()`, `hexes()`, `impact()`. Test: with the network unplugged, `assess('us', tampa)` returns from cache; a lookup exception lands in `skipped`; `impact()` over 76 active policies returns `over=True` for at least one open case; Elastic down -> in-memory backend, same numbers.
- **A9 Sentry.** Out: `sentry_sdk.init(traces_sample_rate=1, enable_logs=True)`, spans named as above. Test: one `desk.run` shows agent + tool + generation spans in Sentry; `INCIDENTS.md` gets its first real entry (expected: the 70 s Nominatim warm-up or a slow FEMA span justifying the cache).
- **A10 actions.py.** Test: `request_info` on sub-126 sends one email to the broker mailbox with the estimate and the missing fields; second click sends nothing; Linq digest arrives; webhook stores raw, parses "approve 2", posts `decision(by=underwriter)`, acks.
- **A11 Consumer + Toronto pack.** Test: `/quote` for 3 scripted addresses returns in < 300 ms from cache; receipt lines sum exactly; a basement unit in a study area adds the sewer line and x1.10; a floodline address returns `refer`; `/cases/{caseId}` renders it.
- **A12 freeze fixes only.**

### Lane B (web, Claude Code)
- **B1 shell + swimlane from fixture.** Test: 5 lanes, events ordered by seq, arrows for `refs`.
- **B2 queue table.** Test: sort by rank, verdict badge colours are not the only encoding (icon + text), estimated badge on premium.
- **B3 live swimlane.** Test: SSE reconnects with `after=seq`; conflict card shows resolution text; query event opens a JSON viewer; `query_retry` shows the fix line.
- **B4 ask box.** Test: attempts render one per row with the error text; final rows table.
- **B5 map.** Test: hexes coloured by tiv (single-hue), case pin, what-if chip toggles `with=case_id`, before/after score chip reads `enrichment_delta`.
- **B6 backtest page.** Test: reads `latest.json`; shows recall by reason as a table, loss ratio by bucket as bars, the `note` verbatim.
- **B7 actions + live queue.** Test: buttons disabled when provider unavailable; queue row updates within 1 s of the webhook decision.
- **B8 toronto case view + legal pages.** Test: `region=toronto` shows 3 lanes and the receipt; `/privacy` and `/terms` exist (design-tells trust gaps).
- **B9 freeze fixes only.**

### Lane C (Codex)
- **C1 downloads.** Out: raw files with a `SOURCES.md` (dataset, URL, licence, date). Test: row counts within 5% of GEO-PLAN's.
- **C2 test_fold.py.** Test: fails when `view()` stores a score or drops a lane.
- **C3 answer-key + query-check tests.** Test: they import only public names from `atlas.*`.
- **C4 warm.py.** Out: `packs/us/cache/*.json` for 70 locations x applicable lookups. Test: re-run makes zero network calls (Sentry log count 0).
- **C5 Toronto ETL.** Out: `hex_scores.json`, `zones.geojson`, `assets.geojson`, `PRICING.md` constants table. Test: multiplier range [0.92, 1.10]; a known Trinity Bellwoods cell has break-in percentile > 50.
- **C6 Elastic loaders.** Test: `terms` on `hex5` returns buckets with `sum(tiv)`; if the trial rejects it, the loader writes `ELASTIC_FALLBACK=1` to `.env` and A8's fallback kicks in.
- **C7 backtest.** Test: byte-identical `latest.json` on two runs; `decline_recall[1] == 11`.
- **C8 unit tests.** Receipt sums; `check_numbers` catches "$36M" when the factor says 35,716,000 (rounding table on).
- **C9 Expo app.** Test: runs in Expo Go over the tunnel; every control has `accessibilityLabel`; list-only path completes a quote without the map; polygons come from `hexes`, no h3-js import.
- **C10 Expo polish.** Test: `prefers-reduced-motion` disables the fly-to; dynamic type at 200% keeps buttons on screen.
- **C11 overnight branch.** Gemini places card (deep tier only, points 0, sources shown under the text), ElevenLabs briefing to `artifacts/briefing.mp3` with cached fallback, README and Devpost drafts. No merges until Ben reviews.

### Lane Ben
- **Ben1** setup (section 3). **Ben2** answer key. **Ben3** prompts. **Ben4** hallucination read on 3 cases (any number not in the factor list is a bug in `check_numbers`, file it). **Ben5** backtest stage sentence. **Ben6** live provider tests (email, Linq round trip). **Ben7** phone run + VoiceOver walk. **Ben8** precompute + tag. **Ben9** sleep. **Ben10** branch review + rehearsal + backup video. **Ben11** docs + submit. **Ben12** morning rehearsal + warm-up.

---

## 3. Setup checklist (17:45-18:30, in this order)

1. **Linq**: sign up at `linqapp.com/s/events/hack-the-north` first (approval can lag). On approval: `LINQ_TOKEN`, sandbox chat id; register webhook `https://<tunnel>/webhooks/linq`; send one message from `curl`; reply from the phone; confirm the raw payload logged. Budget 10 min; if approval has not arrived by 23:00, fall back to section 6's Linq fallback.
2. **Tunnel**: `cloudflared tunnel --url http://localhost:8000` (no account, prints a `trycloudflare.com` URL). Same URL is `API_URL` for the Expo app and the Linq webhook. Restart resets the URL: write it to `.env` and `app/app.json extra`.
3. **Composio**: `composio login`; Gmail auth config; connect Ben's Gmail; note `connected_account_id`; send a test email to the "broker mailbox" (a second Gmail Ben controls, opened on the demo laptop's second tab). `COMPOSIO_API_KEY`, `COMPOSIO_USER_ID`, `COMPOSIO_GMAIL_ACCOUNT_ID`.
4. **OpenAI**: `OPENAI_API_KEY`, `OPENAI_MODEL` from the dashboard picker (do not hardcode `gpt-6-astra`); set a spend cap; 21 cases x 5 agents x ~4 calls x 2 retries is the budget envelope.
5. **Sentry**: three projects (python, nextjs, react-native); DSNs in `.env`, `web/.env.local`, `app/app.json extra`. Enable Logs and Tracing; AI agent monitoring appears automatically with `openai-agents` installed.
6. **Elastic**: Cloud trial; `ELASTIC_URL`, `ELASTIC_API_KEY`; run the licence check (`terms` on a keyword field with `sum`) before C6 starts.
7. **Gemini**: `GEMINI_API_KEY`, `GEMINI_MODEL` from the picker; one Maps-grounded call from this network to confirm availability in Canada.
8. **ElevenLabs**: `ELEVENLABS_API_KEY`, a voice id; one 200-character convert to confirm API access on the tier; if blocked, keep the cached-mp3 path only.
9. **Expo Go** installed on the iPhone; `npx expo start --tunnel` once to confirm the phone loads the template.
10. **Caching**: `packs/us/cache/`, `packs/toronto/cache/`, `cache/federato/` gitignored but copied into `var/demo-cache.tgz` at freeze. `ATLAS_OFFLINE=1` makes every client raise on a cache miss instead of calling out; the rehearsal runs with it on.
11. `.env.example` lists every key above with a comment; `AGENTS.md` unchanged.

---

## 4. Test and eval plan

**Unit checks** (each module's `__main__` plus `evals/test_*.py`, run by `uv run pytest` in under 10 s):
- `test_fold.py`: fixture ledger -> expected `Score`, lanes, conflicts; posting the same key twice does not duplicate.
- `test_query_check.py`: dot-path rewrite, unknown field, reference without expand, error string parse.
- `test_answer_key.py`: 10 cases (below).
- `test_numbers_check.py`: rejects a number absent from factors; accepts rounded forms in the table ($35.7M for 35,716,000).
- `test_receipt_sums.py`: lines sum to total for 20 random answer sets; multipliers within caps.
- `test_idempotent_actions.py`: perform twice -> one provider call (provider mocked).

**Answer key** (Ben writes by hand from the guideline before A4 exists; expected shape, Ben fills the exact expectation):
| id | Case | Expected |
|---|---|---|
| 138 | Lumen Data Works, FL property, 2023 masonry non-combustible, $2.1M, tags hurricane/flood/wind, no premium | state target, age target, construction acceptable, tiv acceptable, premium unknown -> refer with `request_info`; flood lookup likely lowers points |
| 143 | Aperture Cloud, WA property, 2010 steel, $26.3M | state not_acceptable (hard fail) with age/construction/tiv fine -> decline; one `target_vs_fail` conflict the Lead must resolve |
| 126 | Lakeside Medical, TX property, 1948/1975/1998, $35.7M | state fail, age fail -> decline; premium gap; a duplicate open submission (141) for the same insured, Portfolio names it |
| 141 | same insured, TX property, $2M requested | same fails; Portfolio flags the duplicate |
| 134 | Willowbrook Stores, TX property, 1997 JM, $24.3M | state fail only -> decline with a "would be acceptable in a target state" contradiction line |
| 133 | Merrin Hale, IL property, 1955 wood / 1949 MNC | state, age, construction fails -> decline |
| 115 | declined property, human reason loss_history | appetite.loss_value warn/block from the insured's prior claims -> lane hit |
| 129 | declined health, cat_exposure_aggregation | out_of_guideline for the line, but portfolio/hazard warn -> lane hit |
| 1 | bound property CA, premium $619,900 (over $175K) | human bound it; the guideline says premium not_acceptable. Report as an honest disagreement on the backtest page, not a bug |
| 154 | declined auto, cat_exposure_aggregation | portfolio or hazard warn -> lane hit |

**Backtest metrics** (`BacktestReport`, section in `sketch/backtest.py`): decline recall over 11 scorable declines with per-reason breakdown; false declines among bound property policies; loss ratio by points tercile over bound policies; number of cases whose rank moved >= 3 with enrichment on vs off; answer key pass count. The stage sentence uses only these measured numbers.

**Edge cases exercised on stage or in tests**: missing premium (estimate + request), missing roof year (unknown, never pass), a non-property line (out_of_guideline), a dot-path query (retry), a forced 401 (re-mint), Elastic down (fallback), a hazard endpoint down (skipped, listed), a second click on an action (no duplicate), Linq text the parser does not understand (ack with the verbs).

**Accessibility (Intact criterion 3)**: axe on `/quote` web mirror; VoiceOver walk of the list-only path on the phone; 44 pt targets; dynamic type 200%; reduced motion; single-hue hex scale with numeric legend.

---

## 5. Track-by-track checklist

| Track | Component (file) | What the judge sees | 60-second booth pitch | Evidence |
|---|---|---|---|---|
| Federato | `desk.py`, `federato.py`, `appetite.py`, backtest | Queue, live 5-lane run on an open case, ask box with query + retry, before/after enrichment chip, backtest page | "Five agents, one case file. Intake writes the queries from your schema and repairs its own dot-path mistake; Appetite scores your 2025 guideline in code; Hazard picks which lookups are worth running and FEMA turns a 'flood' tag into zone AE; Portfolio says we already hold $41M in that cell; the Lead has to resolve every contradiction before it may decide. Then we backtested it against your underwriters' 14 real declines: N of 11 caught, by reason." | README section "Federato tiers", backtest page |
| Intact | `Consumer.quote`, `tenant.yaml`, Expo app | Phone: address, hexes, 3 questions, instant approve/refer, receipt with dollar lines and sources, "View as underwriter" | "Same engine, facing the customer. Type an address, three questions, an instant decision, and a receipt where every dollar names its data and its cap. The location factor never moves more than 25%, and the fairness page shows the correlation with income. Tap 'View as underwriter' and the same case appears on the desk." | `README.md` (criterion 4 outline in section 7), `PRICING.md`, fairness page |
| Rox | provenance `Field`, `estimate_premium`, `check()` retries, `conflicts()`, actions | Estimated badges, gaps, conflict cards, the broker email, the Linq decision loop | "Real messy data: 21 open submissions with no premium, 26 buildings with no roof year, a guideline that covers one line of seven, coordinates we verify against the address. The desk estimates with cited comparables, refuses to treat missing as pass, records every contradiction as data, and then acts: it emails the broker and texts the underwriter." | Case page conflict + gap panels |
| OpenAI + Codex | Agents SDK roster, structured outputs, `Intake.ask` | Lanes with model reasoning notes; `CODEX.md` | "All five agents run on the Agents SDK with structured outputs, and the model never produces a number: a checker rejects any figure not in the factor list. Codex built the Toronto ETL, the backtest harness, the answer-key tests and the Expo app while Claude Code built the engine; here is the log with commits." | `CODEX.md` with >= 8 entries and hashes |
| Huawei openJiuwen | `Desk(roster, policy)`, event protocol, conflict gate, ask/answer | Swimlanes with arrows; a Lead `ask` answered by Hazard; a `plan` raising depth | "Genuine collaboration, not a chain: specialists run concurrently on a shared case file, the Lead delegates with questions, code detects contradictions and the Lead must resolve them in the open. The desk is reusable: the consumer quote is the same desk with a second roster and no LLM." | `desk.py` docstring, README "Reuse the desk" |
| Linq | `actions.notify_digest`, `inbound_linq` | The judge's own phone receives the top-3 digest; "approve 2" updates the queue live | "Underwriters live in messages. The desk texts the top three each morning; reply 'approve 2' and the decision is written with your name on it. Nothing to install." | Sandbox logs; `inbound` events in the ledger |
| Sentry | spans + logs + AI agent monitoring; `INCIDENTS.md` | Sentry trace of one `desk.run` with agent and tool spans; the incidents log | "Three products: tracing on every desk run with per-agent spans, logs on cache misses and query retries, AI agent monitoring on the SDK. It changed the build twice: [entry 1], [entry 2]." | `INCIDENTS.md` with real links |
| Composio | `actions.request_info` | The email arriving in the broker mailbox with the estimate and missing fields | "The agent's first real-world action: it knows what it could not find, estimates it, and asks the broker for the truth through Gmail via Composio, idempotently." | The sent mail; `action_result` event |
| Elastic | `portfolio.py`, Toronto indexes | Portfolio hexes on the map; what-if chip; Toronto hex scores behind every quote | "Elastic is the geo layer: 76 active policies aggregated per H3 cell with a terms aggregation, and 6,000 Toronto cells of loss-matched incidents behind the consumer price. The Portfolio agent's tool is an Elastic query." | Index mappings in README |
| Expo | `app/` | The phone demo | "Expo Router, react-native-maps in Expo Go, polygons computed server-side, VoiceOver-complete list path, reduced motion respected." | `app/README.md` |
| Gemini (MLH) | `actions.places_card` | The "around this address" card with Maps citations on a deep-tier case | "Maps grounding gives the underwriter what a satellite view would: the fuel depot next door, the creek behind the lot, with Google Maps citations. It never scores; it informs." | Card on the case page |
| ElevenLabs (MLH) | `actions.briefing` | Play the 40-second morning briefing | "The same digest, spoken, for the underwriter's commute." | `artifacts/briefing.mp3` |

---

## 6. The 5-minute demo script

| Time | Beat | Live dependency | Fallback |
|---|---|---|---|
| 0:00-0:25 | "158 submissions. Underwriters check three things: appetite, outside risk, what we already hold. Atlas is a desk of five agents that show their work in one case file." Open `/queue`. | API from `atlas-demo.sqlite` | none needed |
| 0:25-1:35 | Click Lumen Data Works (sub-138). Press Run. Lanes fill: Intake's query JSON and its `$elemMatch` repair; Appetite's table (state target, age target, premium unknown -> estimated $X from N comparables); Lead raises depth ("$2M but Florida hurricane tags"); Hazard picks FEMA and Open-Meteo with reasons, skips USGS with a reason; Portfolio: "$Y already in this cell"; Lead resolves the conflict and decides refer + request_info. | OpenAI, cache | `ATLAS_OFFLINE=1` replays the precomputed ledger with the same animation (the SSE tail replays events with 300 ms spacing) |
| 1:35-2:10 | Map: hexes, drop the case, what-if chip; before/after enrichment chip shows the FEMA finding moving the score. | Elastic | in-memory backend, identical view |
| 2:10-2:40 | Ask box: "Florida property over $50M TIV with no sprinklers". Show attempt 1's error, attempt 2's query, the rows. | OpenAI + Federato | replay the saved `AskResult` JSON |
| 2:40-3:15 | Backtest page: "Of the 11 declines your underwriters made for underwriting reasons, the desk's lanes caught N; loss ratio bottom bucket vs top; enrichment moved M rankings." | none (static JSON) | none |
| 3:15-4:05 | Phone: type an address (Queen and Ossington), hexes rise, three questions, approve, receipt lines light the hexes, tap "View as underwriter" and the same case opens on the laptop. | tunnel, Expo Go | the web mirror at `/quote` on the laptop; backup video as last resort |
| 4:05-4:50 | Actions: click Request from broker, the email appears in the broker tab. The judge's phone (or Ben's) shows the Linq digest; reply "approve 1"; the queue row flips with "by underwriter". | Composio, Linq | a pre-sent email in the tab; replay a saved Linq payload via `curl` to the webhook |
| 4:50-5:00 | "Every number came from code, every decision is one ledger, and the consumer app is the same desk with a different roster." | | |

Booth variants: each track's 60-second pitch (section 5) starts from its own screen, with the queue open as the fallback screen.

---

## 7. Write-ups

**Devpost outline** (`README.md` top section doubles as it):
1. One line: a desk of five agents plus a consumer quote on one risk engine.
2. Problem (Federato's three checks; personal lines decide at quote time).
3. What we built: the ledger, the roster, the packs, the actions; screenshots of lanes, map, backtest, phone.
4. How it thinks: schema discovery, self-repairing queries, depth policy, conflict gate, numbers check.
5. Backtest results (the measured numbers, and the honest disagreements like sub-1's premium).
6. How each sponsor is load-bearing (one line each, from section 5).
7. Codex: three concrete things it did (ETL, backtest harness, Expo app) with commits.
8. Sentry: the two incidents.
9. Limits: property-only guideline; estimated premiums; Toronto-only consumer pack; illustrative prices.
10. Run it: `uv run atlas-api`, `npm run dev`, `npx expo start --tunnel`.

**Intact README outline** (criterion 4, verbatim headings):
1. The problem being solved (location is the coarsest rating input in Ontario; quotes hide the why).
2. How AI is used (the model writes words and chooses lookups; the price is code; the checker; what the AI does not do).
3. The user journey and key features (address, hexes, 3 questions, decision, receipt, "what would change my price", View as underwriter, list-only path, fairness page).
4. Assumptions, limitations, future improvements (invented base and constants in `PRICING.md`, Toronto only, offset crime points, no age/sex/credit, floodline refers, what a real flow would collect).
Plus: accessibility statement, data sources with licences and dates, privacy and terms.

---

## 8. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Linq sandbox approval late or webhook shape differs | medium | loses the reply loop beat | Signup first; raw payload logged; `curl` replay of a saved payload; outbound digest alone still demos |
| OpenAI cost or latency on 21 live runs | medium | precompute takes too long | `mode=fast` (25 s budget, standard depth); precompute with concurrency 3 at 02:15; demo replays the ledger |
| Hazard endpoints slow or blocked at the venue | medium | Hazard lane empty | C4 warms the cache by 19:45 from the hotel/venue network; `ATLAS_OFFLINE=1` in rehearsal |
| Elastic trial licence error on the aggregation | low-medium | map and portfolio | in-memory backend with identical output; Elastic still holds the Toronto pack |
| h3-js in Expo Go | avoided | | polygons come from the server |
| Expo tunnel flaky on venue Wi-Fi | medium | phone beat fails | phone hotspot; web mirror of the quote; backup video |
| Numbers check too strict (rejects rounded prose) | medium | Lead loops on decisions | rounding table; after 2 rejections the templated explanation stands with a note |
| Feature creep on the map | high | M4/M5 slip | map has three features (hexes, pin, what-if); nothing else |
| Solo fatigue | high | mistakes after 01:00 | sleep 02:45-05:45 is fixed; overnight work is branches only |
| Token expiry at judging | low | live query fails | mint at 09:30; auto re-mint on 401 |

---

## 9. Scope tiers and cut order

**MUST** (Federato + the multi-agent proof): A1-A9, B1-B6, C2-C4, C7; the backtest; the ask box; enrichment before/after.
**SHOULD** (money and interviews): A10 Composio + Linq, B7; A11 + C9 consumer app + B8 (Intact, Expo); Elastic (C6) with fallback; Sentry incidents.
**COULD**: Gemini card, ElevenLabs briefing, the fairness scatter page, "what would change my price" actions, French strings.

Cut order when late (first cut first): ElevenLabs -> Gemini -> fairness scatter -> Elastic (fallback already identical) -> Linq inbound (keep outbound digest) -> Expo polish C10 -> Expo app (web `/quote` mirror stays, Intact still submittable) -> map what-if chip. **Never cut**: the ledger and lanes, deterministic scoring, enrichment before/after, the backtest, the ask box, Composio email.

---

## 10. How Intact slides over without breaking Federato

- **One store, one fold.** A consumer quote is a `Case(region="toronto")` with `answer:` sources in the same SQLite file; `/cases/{id}` renders it with the same `view()`. "View as underwriter" is a link, not a feature.
- **Region packs are the only seam in the engine.** `RiskEngine.assess(region, point)` reads `packs/<region>/manifest.yaml`; the US pack returns points, the Toronto pack returns multipliers; both are `RiskFactor` with cap, evidence, source, hex_ids. Engine code contains no region name (AGENTS.md invariant 5, enforced by a grep in CI: `grep -rE "Toronto|Florida|\bTX\b" atlas/*.py` must be empty).
- **Appetite is data.** `packs/us/appetite.yaml` and `packs/toronto/tenant.yaml` share the `Guideline` schema; `refer` is just another `other:` outcome. The receipt block only exists in the tenant file.
- **The roster is the second seam.** `CONSUMER_DESK` posts the same event kinds under the same actors with `uses_llm=False`; no code path in `Desk.run` is consumer-specific.
- **The HTTP contract is one file** (`api.ts`); the Expo app uses `quote`, `geocode`, and a link; the web app uses the rest. Nothing in the desk API changes when the consumer side lands at 00:30, which is why A11 can start after M4 without touching A1-A10.
- **Fairness guardrails live in the pack**: loss-matched perils only, per-factor caps, the total clamp, and the audit join to neighbourhood profiles are Toronto ETL outputs (`PRICING.md`), not engine rules, so the US side cannot accidentally inherit consumer constants or the reverse.
