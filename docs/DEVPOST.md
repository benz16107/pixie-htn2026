# Devpost submission copy

Paste-ready. Every number below comes from a repo doc or from the running system. Where something
is unverified, it says so rather than being dropped quietly.

Tagline: **Pixie reads an insurance submission, scores it in code, argues with itself, and shows you
where every number came from.**

---

## Inspiration

Federato's challenge ships a real underwriting data model, and the first thing you notice reading it
is how much of a submission is missing. A premium is absent. A roof year is blank. The same insured
arrives twice from two brokers. The obvious hackathon move is to hand all of that to a language
model and let it produce a price, and that is exactly the thing an insurer can never ship, because
nobody can defend a number a model invented.

So we inverted it. The model never produces a number. Code computes every score, premium, hazard
factor and portfolio total, and the agents decide what is worth looking up and write the prose. Then
a check reads the prose back and rejects any sentence containing a number the code did not compute.

The second half came from Intact's side of the problem. A renter buying tenant insurance gets a
single price and no reasons. The same engine that scores a $2M commercial property can price a
Toronto renter policy, itemise every dollar with its source, and refer a risk it should not
auto-price to a human instead of silently declining it.

## What it does

Pixie is two products on one risk engine.

**The underwriter desk (web).** A submission enters the queue. A deterministic engine scores it
against a guideline file into an interval rather than a point, because a missing fact widens the
answer instead of being counted as a pass. If the interval straddles a decision threshold, the case
is open, and the facts that could settle it are named along with who can supply them.

A six-agent desk then works the open cases: a lead planner, intake, hazard, portfolio, appetite and
a challenger. Intake writes the Federato query. Hazard picks which cached layers are worth reading
for this address. Portfolio asks the exposure index what is already held nearby. The challenger
argues against the desk's own draft decision, and the lead has to answer the challenge before the
decision is final. A case with nothing to resolve gets no model call at all. Case 138 closes in 16
model calls, $0.07 and 59 seconds.

Everything the desk does lands in an append-only event log, which is what the queue, the case view,
the score waterfall and the agent swimlanes all read. The case page shows how the score was built,
one bar per rule with its rule text and source, a what-if slider that recomputes from a changed
fact, the challenger's objections, and a verified badge next to the explanation.

The decision then leaves the building. A broker email, a calendar hold for the referral review, an
audit row, a data-quality ticket, and a morning digest by iMessage. The underwriter replies "1" to
the text, and that reply is written into the same event log as a human decision with their name on
it, which re-scores the case.

**The renter app (Expo).** An address, a map of the hex the apartment sits in, three questions, and
a quote receipt where every line carries its own source. Photograph the room and Gemini reads a
contents value out of it, which then goes through the same deterministic engine as a typed answer.
A basement unit inside a flooding study area with no sewer backup coverage is referred, not priced,
and that referral appears in the underwriter's queue as a case that renders on the same page as a
commercial one.

The renter price is illustrative. The label is in code, the receipt prints it, and every pricing
constant is documented in `packs/toronto/PRICING.md`.

## How we built it

One risk engine, two rules files. `engine.assess()` is called by the commercial path with
`rules/property_2025.yaml` and by the tenant path with `rules/tenant.yaml`. There is no second
scorer. No state, city or dataset name appears in engine code; regions live in `packs/us` and
`packs/toronto`, which is what made the Toronto renter product possible on the last day.

Every scalar on a case is a `Known`, an `Estimated` or a `Missing`, each carrying a source string.
`evaluate()` gives a missing fact every band at once, so a gap widens the interval. When a premium
is absent, comparables from bound policies produce a range, and the case says the number is an
estimate and how it was made.

The six agents run on the OpenAI Agents SDK with a typed pydantic output per role. A hook mirrors
every tool call into the event log. `verify_numbers()` checks each model sentence against the
strings the tools returned and substitutes a deterministic template when it fails, and raises a
Sentry error carrying the offending sentence. The desk is capped at 22 model calls and 85 seconds
per case.

Data comes from Federato's snapshot: 12 resources, 2,264 records, 158 submissions, pulled through an
OAuth client with a query linter that rejects an array dot-path before the call rather than after.
Hazard enrichment is 350 prefetched files covering 70 locations from five public sources, read from
disk during a run. Toronto is five real open-data layers turned into 5,691 resolution-9 hex cells
with neighbourhood shrinkage and per-peril caps. Elastic holds the carrier's own book: exposure with
a geo-distance filter and H3 terms aggregation, and precedent as reciprocal rank fusion over BM25
and semantic search wrapped in a reranker, plus significant-terms over past declines. Every Elastic
query has an in-memory twin with the same math, and the answer carries a backend field the UI prints
as `[elastic]` or `[memory]`.

The whole thing was built by one person with AI coding agents, on git worktree lanes. `main` is the
trunk and `lane/a1` through `lane/a7` are separate worktrees of the same repo. One agent per lane,
lanes scoped by subsystem rather than by file, merged into `main` at each milestone and merged back
out before continuing. `AGENTS.md` is the contract: six invariants that every agent in every lane
has to obey, enforced by tests. That file is the reason seven parallel agents produced one system.
`CODEX.md` logs each task Codex did with its commit.

## Challenges we ran into

**Proving a model did not invent a number.** Checking model prose against computed facts sounds
simple and is not. Numbers appear formatted differently in prose than in the fact list, intervals
get restated, and a strict check fires on sentences that are fine while a loose one misses the
sentence that matters. The version that shipped compares against the exact strings the tools
returned and falls back to a template rather than to the model's judgment.

**The pre-registered backtest came back zero.** We committed the four metrics before the first run
so we could not tune them afterwards. B3, the enrichment effect, measured decision-tier changes and
returned 0, because the property declines are structural hard fails on state, building age and loss
history that no external hazard layer can move. Rather than quietly swap the metric, the zero stays
with its reason, and four sub-metrics were added underneath it and labelled as added after the fact.

**Silent degradation is a feature and a trap.** Elastic falls back to memory, layers fall back to
cache, Gemini returns a clean unavailable state. That is what keeps a booth demo alive on dead
Wi-Fi, and it is also how you end up showing `[memory]` while saying "Elastic". The fix was to print
the backend on every panel and to say it on stage.

**Composio's default-account routing.** Executing a tool without an explicit `connected_account_id`
silently routes to the default connected account, which means a broker email quietly sent from the
wrong address. Every call now passes the account id explicitly.

**Two tests fail from a fresh clone.** `cache/layers` is gitignored, so the backtest tests fail
until `packs/us/prefetch.py` has run. We left the failure visible rather than skipping the tests.

## Accomplishments that we're proud of

- **No number in the product comes from a model, and it is checked, not asserted.** The strongest
  test is the Gemini one: the model's own output text says "Equals 999.00: False" and the route
  still returns `matches: True`, because our Python did the arithmetic.
- **The score is inspectable end to end.** Every bar on the waterfall names its rule and its source,
  the what-if slider recomputes from a changed fact, and the interval reconciles with the steps.
- **A pre-registered backtest with the misses printed.** 27 bound property policies. The one policy
  the desk would have accepted went on to produce $629,200 in claims against a $58,800 premium, a
  loss ratio of 10.70, and that row is on the page. The 26 the desk would have declined carry a
  combined loss ratio of 1.81.
- **The challenger actually changes decisions.** It argues against the desk's own draft and the lead
  has to answer it before the case closes.
- **One engine really does move.** The Toronto renter quote is the same `assess()` with a different
  rules file and a different region pack, and its referral lands in the same queue.
- **143 of 145 tests pass**, and the two that fail fail for a reason we can name.

## What we learned

- Deciding what to look up is a good job for an agent. Deciding what the answer is, is not. That one
  split removed most of the safety argument from the product.
- An interval is a more honest output than a number. Once a missing fact widens the answer instead
  of defaulting to zero, "go get this fact" becomes the obvious next action rather than a nag.
- Pre-registering a metric costs nothing before the run and is the only reason the zero result was
  reportable. Having to publish a zero is the point of doing it.
- Parallel agents need a contract, not supervision. Six invariants in one file, enforced by tests,
  did more for consistency across seven lanes than any amount of reviewing diffs would have.
- Integration count is not a product. We applied one test to each service: does removing it break
  something a user does? The ones that fail that test are named as such in `docs/TRACKS.md`.

## What's next

- **Ship the rules file as the product.** A guideline editor that diffs a proposed band change
  against the last twelve months of decisions, so an underwriter tunes the appetite and sees what
  would have changed.
- **The ablation.** The same 21 cases with one prompt, with five agents, and with the challenger
  removed, scored against the answer key. The answer key exists; the run has not happened.
- **The measurement that would falsify the idea.** Time-to-decision with and without the desk, on
  the same cases, with a real underwriter. If they reach the same decision in the same time, the
  desk is decoration.
- **Run the backtest on a real book.** Nothing in the engine depends on the data being synthetic.
- **The fairness audit on the renter price.** Break-in density correlates with income. Every
  location factor is capped and shrunk, and nobody has checked what the cap does across the city.
- **Finish the parts that exist as endpoints.** The spoken briefing has audio and per-sentence timing
  marks and no web player. The desk has run on 6 of 21 cases.

## Built with

Read off `api/pyproject.toml`, `web/package.json` and `app/package.json`.

**Languages and runtimes:** python (3.12), typescript, node.js

**API:** fastapi, uvicorn, pydantic, httpx, uv, pytest, pyyaml, python-dotenv, h3, pillow

**Web:** next.js (16.3), react (19.2), tailwindcss (4), maplibre-gl, deck.gl, eslint

**Phone:** expo (57), expo-router, react-native (0.86), react-native-reanimated, react-native-maps,
react-native-gesture-handler, react-native-svg, expo-image-picker, expo-location, expo-audio,
expo-print, expo-haptics, expo-blur, expo-speech, @gorhom/bottom-sheet

**AI and agents:** openai, openai-agents, google-genai (gemini-3.6-flash,
gemini-2.5-flash-preview-tts), backboard-sdk

**Services:** federato, elasticsearch (9.x), kibana, composio (gmail, google calendar, google
sheets, linear, notion), linq, sentry, backboard.io, elevenlabs (called over HTTP, no SDK)

**Data:** federato snapshot, fema flood, usgs earthquakes, usfs wildfire, open-meteo, nominatim,
city of toronto open data, toronto police open data, openfreemap, openstreetmap

## Prizes this submission ticks

One line each on why it qualifies. The verified-versus-unverified detail for every row is in
`docs/TRACKS.md`, which is worth reading before any of these is claimed out loud.

- **Federato.** The whole spine: an OAuth client against core-api, a schema graph that finds paths
  by BFS over reference fields, a query linter that rejects an array dot-path before the call, a
  cached snapshot of 12 resources and 2,264 records, and every case scalar carrying its source.
- **Intact.** A Toronto tenant quote from the same engine, an integer-cent receipt where every line
  names its source, a basement-plus-flood-area referral rule that sends a risk to a human instead of
  declining it silently, and a disclaimer that lives in code rather than in the pitch.
- **Rox (data quality).** Four defect detectors over Federato's own delivered data: duplicate
  account, stale submission, limit versus TIV, missing roof year. Each cites the records involved,
  raises the desk's review depth, and can file a ticket back at the carrier's data.
- **OpenAI and Codex.** Six agent roles on the Agents SDK with a typed output per role, a call and
  time budget, an output guardrail that rejects any sentence containing an uncomputed number, and
  `ask.py` turning plain English into a linted Federato query. `CODEX.md` logs each Codex task with
  its commit.
- **Huawei openJiuwen (multi-agent).** Addressed specialist-to-specialist asks capped at two rounds,
  one append-only event log per case with content-hash ids, conflicts computed from typed outputs
  rather than from prose, and a depth floor that code sets and the lead may raise but never lower.
- **Linq.** The morning digest, tapbacks and typed commands (`approve 1`, `why 2`, `run 1`) that
  write a human decision into the event log, a renter quote thread, a rendered receipt card, and
  HMAC webhook verification checked against a genuine inbound webhook Linq sent.
- **Sentry.** One root span per decision carrying depth, models, verdict, interval, calls, tokens
  and cost, structured logs keyed by case, masked session replay on the web, and the unusual one:
  an error-level alert fires with the offending sentence when an agent states a number the code
  never computed.
- **Composio.** Seven tool slugs across Gmail, Calendar, Sheets, Linear and Notion, every call
  carrying an explicit connected account id, an outbox row per (case, action, facts) that makes
  actions idempotent, and a broker-reply reader that only accepts a value the model can quote
  verbatim from the email.
- **Elastic.** Five live indices. Exposure as geo-distance plus H3 terms with TIV sums, precedent as
  RRF over BM25 and semantic search wrapped in a reranker, significant-terms over past declines,
  percentile ranks for TIV, and Toronto flood and fire lookups in ES|QL. Every query has an
  in-memory twin and the UI prints which one answered.
- **Expo.** Seven screens on Expo Router with location, a hex map, a photo inventory, PDF export and
  share, haptics, and reduce-motion honoured in three places, which is the accessibility setting a
  judge is most likely to have on at a booth.
- **Google Gemini.** Four routes: room photos read under a JSON schema into itemised low and high
  values that Python sums and clamps, Maps grounding for a cited "what is around you" card, TTS for
  the quote read aloud, and code execution re-adding the receipt where the tick the UI shows is
  computed by our Python and not by the model.
- **ElevenLabs.** The case read aloud with per-character timestamps mapped to one mark per sentence,
  anchored to the part of the screen being discussed, composed only from the case's computed fields.
  Seven briefings are generated and cached; the web player that consumes the marks is not built, so
  today this is an endpoint rather than a button.
- **Backboard.** Cross-case memory scoped to an assistant, holding what the desk learned about a
  broker, a peril and a region across cases, with a hard boundary: nothing memory returns enters the
  fact list the number check reads, so a remembered number cannot reach the ledger. Live calls were
  confirmed on 2026-09-19 until the account credit ran out mid-verification.

Not claimed: Shopify, Baseten, Browserbase, Tiger Data, MongoDB, Huawei OMNI, RBC and Zip are ticked
on the Devpost draft and have no code in this repo. Untick them.
