> Current judging scripts and verified caveats are in [DEMO](../DEMO/README.md). This document preserves earlier implementation notes; do not use its old timings, counts or live-status claims as the booth script.

# Pixie: sponsor pitches

Eleven 5-minute pitches for Sunday judging. Every number below was read off a source in this repo
or off the running system on 2026-09-19, and the source is named. Sources of truth:
`docs/TRACKS.md` (verified vs unverified per track), `docs/ARCHITECTURE.md`, `docs/SENTRY.md`,
`docs/ELASTIC.md`, `docs/LINQ.md`, `docs/COMPOSIO.md`, `docs/EXPO-GEMINI.md`, `docs/OPENAI.md`,
`docs/BACKBOARD.md`, `docs/RUNBOOK.md`, `docs/DEVILS-ADVOCATE.md`, `eval/backtest.json`,
`eval/model_eval.json`.

There are no placeholders left in this file. If a number is not here, it is because nothing in the
repo backs it. Do not add one from memory at the booth.

---

## Cut order

Cut from the bottom of the route, in this order, one at a time:

1. **Huawei openJiuwen.** Its screen is the same `/live` lanes Federato and OpenAI already showed,
   and its reuse beat does not run (see section 5).
2. **Expo.** It needs the phone, the tunnel and `EXPO_PUBLIC_API_URL` pointed at it. Most rig for
   the time.
3. **Gemini.** One card, three minutes.
Never cut Federato, Intact, Rox or OpenAI.

---

## Pitch map

| # | Sponsor | Angle | The number, with its n | Opening screen | Slot |
|---|---|---|---|---|---|
| 1 | Federato | One real case, walked the way an FDE would | 17 of 27 bound property policies fail the 2025 guideline on premium alone (n=27) | `/cases/138` | 09:45 |
| 2 | Intact | The judge types their own Toronto address | The receipt is 5 lines and they sum exactly to $214.80 a year | Expo app, address screen | 09:53 |
| 3 | Rox | Five real defects in Federato's data, and what the desk did about each | 16 of the 22 queue rows carry at least one data defect | `/queue` | 10:01 |
| 4 | OpenAI + Codex | The guardrail that caught a real bug | The engine matches the hand-written answer key 8 of 8 with no model call (n=8) | `/openai/runtime` next to `/cases/138` | 10:09 |
| 5 | Huawei openJiuwen | Six agents, read off the event log | The Challenger changed the verdict on 2 of the 6 cases the desk has run | `/live`, lanes on 138 | 10:17 |
| 6 | Linq | Laptop closed, the judge holds the phone | A renter quote sent and delivered inside iMessage: $186.86 a year for 1100 Queen St W | iPhone, Messages | 10:25 |
| 7 | Sentry | The DSN that pointed at nothing | One desk run put 53 transactions into `atlas-api`, the first that project ever received | Sentry, `atlas-api` traces | 10:33 |
| 8 | Composio | One click, one email, and why that email | The broker is asked for 2 facts out of the 8 on the case | `/cases/138` actions + broker inbox | 10:41 |
| 9 | Elastic | Live ES\|QL that matches the agent's number | `pixie-precedent` holds 127 docs, 14 of them declines | `/cases/138` precedent panel | 10:49 |
| 10 | Expo | Mobile craft, with VoiceOver on | Reduce Motion is honoured in 3 places, not one | Expo app, VoiceOver on | 10:57 |
| 11 | Gemini | The one card on the page that is not our arithmetic | Fire Station 332, 260 Adelaide St W, with a Google Maps citation | `/gemini/context` card | 11:05 |
| | Buffer | Return to anyone who was busy, answer follow-ups | | | 11:13-11:45 |

---

## Route rules

- Each stop gets 8 minutes: 5 to pitch, 3 to walk and reset. Eleven stops use 88 of 120 minutes.
- If a queue is longer than 8 minutes at a top-4 sponsor, take the next stop and come back.
- **Reset between stops.** `curl -X POST localhost:8000/demo/reset` puts the queue back to its
  opening state (`docs/RUNBOOK.md`). The outbox is idempotent, so a second click on 138 sends
  nothing, which looks like a dead button if you have not reset.
- **`.env` sets `ATLAS_ACTIONS=live`.** Gmail and Linq really send from this laptop. Rehearse with
  `ATLAS_ACTIONS=dry`.
- Send each Linq digest just before its pitch, not in advance.
- Before 09:30, work the checklist in `docs/RUNBOOK.md` section 5: tests, production web build,
  demo reset, phone on the same Wi-Fi, backup video on the laptop.

---

## Universal rules

1. **Start on a live screen.** No slides. The first thing a judge sees is the product doing
   something.
2. **Replay is the default, and say so.** `/live` opens on **Run the demo**, which replays a
   recorded run with no model calls. Say "this is the recorded run, want me to run one live?" and
   then do it if they say yes. A live run of 138 took 15 model calls, $0.057 and 55 seconds.
3. **Show where every number comes from.** Hover the provenance badge, open the source line, point
   at the n. If you cannot show the source, do not say the number.
4. **Point at the backend badge.** Elastic-backed answers print `[elastic]` or `[memory]`. The
   fallback is silent, so it is possible to show `[memory]` while saying Elastic. Read the badge.
5. **Say the limitation before the judge finds it.** Each section below names one. The longer
   answers are in `docs/DEVILS-ADVOCATE.md`.
6. **Stop at 4:30** and invite a question. Every beat after 3:00 is cuttable.
7. **Name what was built by agents.** One person, three coding agents, 112 commits, and `CODEX.md`
   lists Codex's five tasks with what each produced. Never claim more.

---

## 1. Federato

**What they asked for.** An AI agent that thinks like an underwriting professional: ingest
submissions, enrich them with real-world risk data, produce insights against a carrier's appetite
guidelines, and make them explainable and actionable. Their rubric rewards traceable agentic
reasoning, analysis that deepens on high-value cases, explained contradictions and an actionable UI.

**The one thing only Pixie can say.** The score is an interval, not a number, and the desk only
spends agent time where a missing fact could move that interval across a decision line.

**The screen.** `/cases/138`, the whole page.

**The number.** 17 of 27 bound property policies would be declined by the 2025 guideline on premium
alone. n=27, printed next to the figure on `/backtest`, pre-registered at commit `5351f234` before
the first run.

**The limitation I say first.** The desk has only run on 6 of the 22 rows in the queue. Clicking a
routed row shows a rules-only decision with no agent lanes.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:35 | "Submission 138. Florida, masonry non-combustible, built 2023, $2,073,000 insured value. It looks like a yes, and it has no premium. Premium is a guideline factor, so what does an underwriter do?" | `/cases/138`: facts panel, premium shown as estimated $6,038-$9,869 | Local, from SQLite |
| 0:35-1:10 | "The guideline scores it 30 to 75. 45 is the refer line, so the interval straddles it and the case stays open. This is the whole score, factor by factor, and the footer says the steps reconcile with it." | Score waterfall, 10 bars, hover one for its rule and source | Local |
| 1:10-1:45 | "Drag this. Premium at or above $50,000 flips decline to accept. That is computed, not a guess, and it is why the only thing the desk wants is one number from the broker." | What-if slider, the $50,000 marker | Local |
| 1:45-2:45 | "Here is the desk working it. Intake found the insured value through the headquarters, because an open submission has no building link, and estimated premium from comparable bound policies. Hazard read FEMA and skipped earthquake and wildfire, with a reason for each skip. Portfolio asked Elastic what we hold nearby: $57,354,000 within 30 km. The interval moved from 30-92 at triage to 30-75." | `/live`, lanes on 138, replay at 2x | Replay is the default |
| 2:45-3:15 | "Then a sixth agent argues against the draft, and the Lead has to answer every risk by name before the decision stands. On 126 and 143 that argument changed the verdict." | The case-against panel on 138, then 126's | Local |
| 3:15-3:50 | "What is left, only the broker knows, so the Lead emails for those two facts and nothing else." | Actions panel, then the broker inbox tab | Email already in the tab |
| 3:50-4:40 | "The backtest, pre-registered before the first run. Enrichment changed 0 decision tiers, moved 38 of 38 intervals, a median of 7.2 points, and reranked 5 of the 6 open cases. And 17 of your 27 bound property policies fail the guideline on premium alone, so your underwriters write off-guideline often, and the desk shows where." | `/backtest`, n printed next to each figure | Static page |
| 4:40-5:00 | Closing line | Back to `/cases/138` | |

**Opening line.** "Submission 138 looks like a yes, and it has no premium."

**Closing line.** "Every submission is scored as a range, agent time goes only where a missing fact
could move that range across a line, and every number on screen traces back to your schema or a
public source."

**Likely questions.**
- *Is this just rules?* The scoring is your guideline in a YAML file, on purpose, because an
  underwriter has to audit it. The agents decide where to look: which schema path, which hazard
  layer, which conflict matters, whether to write to the broker. 15 model calls on 138. No number
  comes from a model, and an output guardrail rejects any sentence that states one.
- *This is synthetic data.* It is your sample, so the n is small: 27 bound property policies, 11
  human declines, 3 of those excluded because the broker withdrew. I committed the method before
  running it, and every figure prints its n. The one accept in the book lost $629,200 against
  $58,800 of premium, and that is printed as a known miss rather than buried.
- *How would this deploy at a carrier?* Three inputs change: the rules file, the region pack, and
  the schema the query planner reads. The engine names no state and no dataset.

---

## 2. Intact

**What they asked for.** A prototype that reimagines how people obtain car or tenant insurance: a
flow where a user gives relevant information and gets a recommendation, estimate or next step,
judged on user experience and accessibility, with a README on the problem, the AI, the journey and
the limitations.

**The one thing only Pixie can say.** Every dollar on the receipt has a source you can tap, the
lines sum exactly to the total, and the whole quote works without the map.

**The screen.** The Expo app in the judge's hand, address screen first.

**The number.** The receipt for 565 McRoberts Ave is 5 lines, and they sum exactly to $214.80 a
year. The break-in line cites 18 break-and-enter events 2023-2026 within one cell ring.

**The limitation I say first.** The price is invented. The base is $150 a year for $20,000 of
contents, `packs/toronto/PRICING.md` documents every constant, and the app prints "Illustrative. Our
documented model, not an Intact price or offer" on every quote.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:25 | "Type an address you know in Toronto." Hand over the phone. | Expo app, address screen | Pre-filled demo address |
| 0:25-1:10 | "That is your block, scored from City of Toronto and Toronto Police open data. 'Skip the map' is always there. Then three questions: where your unit is, what your things cost to replace, and your deductible and liability." | Hex map, then the three questions | "Skip the map"; hotspot if the tunnel dies |
| 1:10-2:15 | "Your decision and your receipt. Base rate $150. Contents $30,000 adds $40 at $4 per $1,000. Break-ins near you take off 42 cents, from 18 events within one cell ring. Fire protection adds $5.69, nearest hall 1.5 km. Basement flooding adds $19.53, study area BFA3. $214.80 a year, and the lines sum exactly." Let the judge tap a line. | Quote screen, receipt, one line expanded | Recorded clip |
| 2:15-2:45 | "This one came back as refer, not a price. It is in a basement flooding study area with no sewer backup cover, so it goes to a person with the reason attached instead of guessing." | The refer state and its reason | Pre-run `TQ-*` case |
| 2:45-3:25 | "Accessibility. VoiceOver completes the quote without the map, the full receipt always renders inline in the scroll view so the accessible path never depends on the bottom sheet, and Reduce Motion turns off the map camera, the sheet and every entrance animation." | VoiceOver on, swipe the receipt | Describe it and show the list path |
| 3:25-4:20 | "Tap 'View as underwriter'. The referral is a case on the same desk, on the same page that scores commercial property, with the same waterfall and the same source on every line. One engine, two rules files." | Laptop opens `/cases/TQ-79375e16` | Open the URL by hand |
| 4:20-5:00 | "What it does not use: no age, sex, income, ethnicity or credit, and no assault or robbery data, because those are not the covered loss. Every location factor is capped and small cells are pulled toward the neighbourhood average." Closing line. | About screen: sources, fairness, limits | |

**Opening line.** "Type an address you know in Toronto."

**Closing line.** "Instant, sourced line by line, capped, usable without the map, and when it is not
sure it hands you to a person instead of guessing."

**Likely questions.**
- *Where is the AI?* The price and the approve-or-refer call are code, on purpose, so they are
  instant and auditable. Gemini reads a room photo into an itemised contents estimate that you edit
  before it counts, and Gemini writes the "what's around you" note. We chose not to let a model set
  a price.
- *Is neighbourhood pricing redlining with a map?* That is the risk, so the guardrails are in the
  product. Only peril-matched data, so break-ins count for contents and assault does not. Each
  factor has its own floor and cap in `packs/toronto/pack.yaml`, break-ins between x0.92 and x1.10
  and the whole location part between x0.85 and x1.25, and small cells are shrunk toward the
  neighbourhood mean with a prior weight of 20. No demographic inputs. We have not run
  the correlation audit against neighbourhood income, and that is the next thing I would build.
- *Do the agents review the referral?* Not yet. The referral lands on the desk as a case and renders
  on the same page, but the six-agent desk has not been run against a tenant case. Its lane count on
  that page is zero and you can see that.

---

## 3. Rox

**What they asked for.** Agents that operate on real-world messy data and take meaningful actions:
unstructured information, incomplete datasets, conflicting sources, noisy data, multi-source
resolution, error handling, decisions under uncertainty. Agents that do not just work in clean demos.

**The one thing only Pixie can say.** A missing fact gets every band at once, so the answer widens
instead of quietly passing, and the agent's last move is going to fetch the fact.

**The screen.** `/queue`, then the issue badges.

**The number.** 16 of the 22 rows on the queue carry at least one data defect: duplicate account,
stale submission, limit far below TIV, missing roof year. All of them are in Federato's sample as
delivered.

**The limitation I say first.** Detection is code, not an agent. A duplicate account is a fact, not
an opinion. What the agents decide is what to do about it.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:35 | "126 and 141 are the same insured, Lakeside Medical Group Group, through two different brokers, both $35.7M at stake. Which broker owns it? Pixie flags the duplicate, cites both records, and will not score either as clean. That duplicated word in the name is in Federato's own `Insured.json`. We print what they sent." | `/queue`, the DUP badges, then 126 | Local |
| 0:35-1:15 | "Defect two: every open submission is missing its premium. Pixie does not call that zero and does not call it a pass. It estimates $6,038 to $9,869 from comparable bound policies, marks it estimated, and keeps the score as a range. That is why 138 is the one row still open." | `/cases/138`, premium fact and the interval | Local |
| 1:15-1:50 | "Defect three: 143 came in stale, and the broker has an open question about whether it duplicates a bound policy. Four: 134 asks for a limit far below its $24.3M insured value. Five: roof year missing on five rows." | The STALE, LIMIT and ROOF? badges | Local |
| 1:50-2:35 | "The agents make their own mess too. A bad Federato query comes back as a code and a message, the client parses it and Intake rewrites. And a number a model states that no tool computed trips an output guardrail: the run posts a guardrail event, Sentry gets an error, and the deterministic template replaces the sentence." | `/ask` attempts list, then `/openai/runtime` | Test output in the terminal |
| 2:35-3:25 | "It caught a real one. On the first live run of case 141 the Lead quoted $35,716,000 in its plan. The guardrail was right: that number came from our own triage digest, which had never been registered as a computed fact. The fix was one line in `Desk._plan`, and the re-run was clean." | `docs/OPENAI.md`, the verified section, then the commit | The doc alone |
| 3:25-4:20 | "Then it acts. The broker gets one email asking for the two facts that could change 138, not the twenty a form would ask for. The underwriter gets the triage by iMessage and decides by replying." | Broker inbox tab, then the phone | Pre-sent email; the saved payload |
| 4:20-5:00 | Closing line | `/queue` | |

**Opening line.** "126 and 141 are the same insured, sent by two different brokers."

**Closing line.** "Bad data widens the answer instead of hiding in it, every value keeps its source,
and the last step is going out to fix the gap."

**Likely questions.**
- *Did you plant these?* No. The duplicate, the stale submission, the limit gap and the missing
  premiums are all in Federato's sample as delivered. The only planted number is in the guardrail
  test.
- *Is this validation rules with extra steps?* Detection is rules, deliberately. The agents decide
  which schema path to query next, which conflict matters for this decision, and whether it is worth
  a broker email. A blocking issue also raises the depth floor, and the Lead can raise that floor but
  never lower it.
- *What if the broker never replies?* The case stays open, ranked by value at stake, and appears in
  the digest with the missing fact named. The underwriter can refer it by text.

---

## 4. OpenAI + Codex

**What they asked for.** What you built with the OpenAI API and how creatively it powers the
experience, plus how Codex meaningfully supported planning, implementation, testing, debugging or
iteration. Show the working product, explain the API use, and give one concrete Codex outcome.

**The one thing only Pixie can say.** `verify_numbers` is a real Agents SDK output guardrail, and on
its first live run it caught a genuine bug in our own code.

**The screen.** `/openai/runtime` beside `/cases/138`.

**The number.** The deterministic engine agrees with the hand-written answer key on 8 of 8 cases
with no model call, in under a second (`eval/model_eval.py --engine-only`, n=8). Putting
`gpt-5.6-luna` on top of it cost $0.0102 and 55.8 seconds for two cases.

**The limitation I say first.** A tripped guardrail loses that turn's token usage, because the SDK
raises instead of returning a result, so the cost meter undercounts on a tripped turn.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:40 | "Six agent roles on the Agents SDK, each returning a typed pydantic object, and each one carries an output guardrail. The guardrail reads every prose field and checks every number in it against the strings the tools actually returned." | `/openai/runtime`: the role table and the guardrail description | Local |
| 0:40-1:30 | "The concrete one. On the first live run of case 141 the Lead wrote $35,716,000 into its plan. Tripwire. The guardrail was right, and it was right about us: that figure came from our own triage digest, which we had never registered as a computed fact, so code's own number was not on the whitelist. One line in `Desk._plan` fixed it." | `docs/OPENAI.md` next to the diff | The doc alone |
| 1:30-2:10 | "Effort goes where judgement is. Low on the four lookup roles. High on the Challenger, the final verdict and the Lead's answer to the challenge. Those settings ride into the trace metadata, so a trace shows what each turn was allowed to spend." | The role table, then `platform.openai.com/traces` filtered to `pixie-case-138` | The table alone |
| 2:10-2:50 | "Memory across cases, strictly advisory. Run 126, then 141. The second run opens with a recall event naming 126, its broker and its data issue. It reaches the planning prompt and never the fact list, so a number that exists only in memory fails the guardrail if a model repeats it." | `GET /cases/141/memory` | The JSON |
| 2:50-3:40 | "The eval. Engine only: 8 of 8 against a key I wrote from the guideline text, no model, under a second. Add a tier and you see what a model changes: which option inside the allowed set gets picked, how deep it digs, and what it costs. On 126 the cheap tier conceded to the Challenger and moved off decline, which is why the shipped default puts the expensive model on the lead roles." | `eval/model_eval.py` output | `docs/OPENAI.md` table |
| 3:40-4:30 | "Codex owned the data and proof lane, in its own git worktree: the Toronto layer fetcher, the US hazard prefetch, 5,691 H3 risk cells, the tenant quote engine, and the pre-registered backtest. The prefetch is the one to point at: 350 cache files across 70 locations and five sources, so the whole demo runs with the Wi-Fi off." | `CODEX.md`, then `git log --oneline` | `CODEX.md` alone |
| 4:30-5:00 | Closing line | `/openai/runtime` | |

**Opening line.** "The number check is a real SDK guardrail, and the first time it ran for real it
caught a bug in my code, not the model's."

**Closing line.** "The model chooses where to look and writes the prose, code owns every number, the
SDK enforces that split, and Codex built the data layer underneath it in its own lane."

**Likely questions.**
- *Why structured outputs?* Every agent result feeds code: the scheduler, the conflict check, the
  guardrail. A typed object fails loudly. Prose fails silently.
- *Why not the Evals API?* It goes read-only on 2026-10-31 and shuts down on 2026-11-30, so a demo
  built on it would be a demo of something that is gone. The eval is local and in the repo.
- *Could one agent do this?* One agent with the specialists as tools is simpler, but then
  specialists cannot ask each other anything and the Lead serialises every step. 138's log has three
  addressed asks and three answers between specialists.
- *What did Codex get wrong?* Two `eval/test_backtest.py` tests fail in a fresh clone, because the
  350 prefetched hazard files are gitignored. 143 of 145 pass. I would rather say that than run
  pytest in front of you and be surprised.

---

## 5. Huawei openJiuwen

**What they asked for.** Genuine agent collaboration: task decomposition, communication, tool use
and coordination, rather than chaining LLM prompts. Judged on collaboration quality, scenario
creativity, demo completeness, technical implementation and reusability.

**The one thing only Pixie can say.** A sixth agent argues against the Lead's own draft, the Lead
must answer every risk by name, and on 2 of the 6 cases the desk has run that argument changed the
verdict.

**The screen.** `/live`, lanes on 138, paused on an ask arrow.

**The number.** 52 events on case 138: 12 tool calls, 3 addressed asks with 3 answers, 2 conflicts
with 2 resolutions, and a challenge the Lead answered. Seven lanes, one append-only log.

**The limitation I say first.** This is not JiuwenSwarm or WorkSwarm. It is a small scheduler on the
OpenAI Agents SDK, because I had one night and already knew that SDK.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:35 | "This arrow is the Hazard agent asking the Portfolio agent a question, addressed to it by name. No prompt chain passes it along. Every lane is an agent and they share one append-only log." | `/live`, 138 lanes, paused on an ask arrow | Replay |
| 0:35-1:15 | "Decomposition. Code triages the case first and sets a depth floor. The Lead reads that triage and writes one to three addressed briefs. It can raise the floor and never lower it, so a model cannot talk the desk out of doing the work." | The Lead's plan card | Local |
| 1:15-1:55 | "Communication and tool use. Specialists run in parallel, post findings, and ask each other questions mid-run. Twelve tool calls on this case, each one openable to its JSON." | Resume at 1x, open a tool chip | Replay |
| 1:55-2:40 | "Coordination. When two specialists disagree, code detects it from their typed outputs, not from prose. Here: Appetite fails on premium while Hazard finds the site below average risk. The Lead may only resolve from a list the guideline allows, and if it picks outside that list code substitutes the first allowed option." | The conflict card and the resolution | The event JSON |
| 2:40-3:40 | "Then the Challenger. It argues against the draft, sizes each risk from the case's own numbers, and says what would change its mind from the sensitivity analysis. The Lead answers each risk by name, and the gate records any risk it did not answer. On 126 and 143 the Lead conceded and moved from decline to refer with subjectivity. The queue row shows both: what the rules said and what the desk said." | 126's case-against panel, then the queue row | Local |
| 3:40-4:20 | "It adapts. Fifteen of the twenty-two rows are lines the property guideline does not cover, so they are routed with a reason and get no agent time at all. Agent time goes where information can change an outcome." | `/queue`, the routed rows | Local |
| 4:20-5:00 | "Reusability, honestly. The engine already runs a second domain: a Toronto tenant quote against a different rules file, and it lands on this same page. The desk itself has not been run against a tenant case, and that lane count is zero on screen." Closing line. | `/cases/TQ-79375e16` | |

**Opening line.** "This arrow is the Hazard agent asking the Portfolio agent a question, directly."

**Closing line.** "Agents that plan, ask each other by name, get checked by code when they disagree,
and have one of their own arguing against the answer."

**Likely questions.**
- *Why not JiuwenSwarm?* One night, and I already knew the Agents SDK, so I wrote a small scheduler
  on it rather than learn a framework under time pressure. The pieces map across: addressed asks, a
  shared event log, a lead with bounded authority. Porting the scheduler is the first thing I would
  try with your team.
- *Is this a pipeline with extra steps?* A pipeline has a fixed order. Here code sets a depth floor,
  the Lead chooses which specialists run, specialists ask each other mid-run, and fifteen rows get no
  model call at all. The logs have different shapes for different cases.
- *How do you stop them arguing forever?* Asks are capped at two rounds, conflicts resolve from an
  allowed set, and the whole case has a budget of 22 model calls and 85 seconds. On exhaustion the
  deterministic verdict stands.

---

## 6. Linq

**What they asked for.** New utilities and experiences brought directly into iMessage, tasks done
without opening another app, and the annoying tasks that could be easier through messaging.

**The one thing only Pixie can say.** Replying "run 1" to a text starts a real multi-agent desk run,
the thread shows typing while it actually thinks, and the new decision comes back with a rendered
receipt.

**The screen.** The iPhone, Messages, the digest thread. Laptop closed.

**The number.** A full Toronto tenant quote, sent and delivered inside iMessage: 1100 Queen St W,
upper unit, $25,000 contents, $186.86 a year, with the receipt image attached.

**The limitation I say first.** Nobody has physically tapped a reaction on a real phone. The tapback
path was proven with a signed payload built by hand and posted to the live server. Whether Linq's
sandbox fires `reaction.added` for a real thumbs-up is still unconfirmed.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:30 | "Do not look at my laptop. The underwriter's morning is on this phone." Hand it over. "Top open submissions, one line each on why." | iPhone, digest thread | Digest sent on the walk over |
| 0:30-1:10 | "Reply 'why 1'." Judge types. "It comes back with the case's own explanation and a rendered receipt card: insured, decision, score interval, and the two or three numbers that actually moved it. Every number on that card is computed by code." | The reply and the image | Show a previous reply in the thread |
| 1:10-2:00 | "Now 'approve 1'." Judge types. Open the laptop. "The queue row flipped, and the case file records who approved it, when, and from which message. A tapback does the same thing: thumbs-up approves, thumbs-down refers, question mark asks why." | Queue row flips, then the case audit trail | Replay the saved signed payload, labelled "simulated" on screen |
| 2:00-2:50 | "'run 1' is the one I like. It starts a real desk run in iMessage. Typing appears the moment the run starts and stops right before the decision posts. I ran that live last night and watched case 138's score move." | The thread, typing indicator | The server log of the run |
| 2:50-3:40 | "And it works for a renter. 1100 Queen St W, upper unit, $25,000 of contents: $186.86 a year with the receipt image, entirely in iMessage. No portal, no login, same engine the underwriter desk runs on." | The renter thread | The saved transcript |
| 3:40-4:30 | "What was hard. Linq's first fetch of a brand new media URL can take over thirty seconds to validate and mirror, and one attempt timed out and genuinely never sent. Media parts now get a 75-second timeout and fall back to text if the image still fails. I also found our own base URL env var was misspelled, so every live call had been falling back to a wrong default." | `docs/LINQ.md` | |
| 4:30-5:00 | Closing line | Phone | |

**Opening line.** "Do not look at my laptop. The underwriter's morning is on this phone."

**Closing line.** "Three replies cover the whole triage, one of them starts a real agent run, and
every decision lands in the system of record without opening an app."

**Likely questions.**
- *Can anyone text "approve"?* The webhook verifies Linq's HMAC signature against a real inbound
  payload Linq sent us, which is in the repo as a fixture. Mapping handles to underwriters and a
  confirm step above an authority limit is not built.
- *What if they mistype?* Parsing is tolerant of case and spacing. If it cannot parse an action it
  sends nothing and logs the raw payload. It never guesses.
- *What is not tested?* Group threads. The code is written to the documented shape and never fired,
  because this lane only ever had one real phone number.

---

## 7. Sentry

**What they asked for.** At least two products beyond error monitoring, and evidence that
observability actually shaped what you built, not just that the SDK is installed.

**The one thing only Pixie can say.** The first thing Sentry told us was that Sentry was not on. The
API DSN pointed at a project id that does not exist in the org, so for most of the build every trace,
log and error went nowhere.

**The screen.** Sentry, the `atlas-api` project, Explore, Traces, filtered on
`op:pixie.underwrite_case`.

**The number.** One desk run put 53 transactions into `atlas-api`. That is the first data that
project has ever received.

**The limitation I say first.** `INCIDENTS.md` is empty. Nothing broke badly enough at 4am to be
worth a story, and I am not going to invent one.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:45 | "Here is my honest observability story. `SENTRY_DSN_API` pointed at project 4512115040845824, which is not a project in this org. The SDK was happy, the app booted fine, and nothing ever arrived. I found it by reading the project keys back out of the API. One desk run after the fix: 53 transactions." | The `atlas-api` transactions list | Screenshot |
| 0:45-1:45 | "Every underwriting decision is one trace. Root span `pixie.underwrite_case`, carrying depth, both model ids, the verdict, the score interval, model calls, tokens in and out, and the dollar cost. Under it, the OpenAI Agents integration adds one span per agent turn and one per tool call, with model, tokens and Sentry's derived cost." | One trace open, root span attributes, the waterfall expanded | Screenshot |
| 1:45-2:40 | "The alert I care about is not a crash. When an agent states a number the engine did not compute, `verify_numbers_alert` fires an error-level event tagged `pixie.alert=verify_numbers`, carrying the sentence, the case, the agent and the fact list it was checked against. That alert has fired for real: the Lead quoting $35,716,000 on case 141." | The issue, then the workflow rule | `docs/SENTRY.md` |
| 2:40-3:20 | "Creating that rule was its own story. Sentry retired the per-project rules API and it now answers 410. Issue alerts live in the workflow engine, so `scripts/sentry_setup.py` was rewritten against `POST /organizations/{org}/workflows/` and is idempotent by workflow name. There is also an uptime monitor on the tunnel's health check every 300 seconds." | The workflow and the uptime monitor | Screenshot |
| 3:20-4:20 | "Four products beyond error monitoring on the API alone: AI agent monitoring, tracing, structured logs, and a cron monitor on the nightly backtest. The cron monitor earned its keep on its first run: it sent an in-progress check-in and then an error check-in on a missing hazard cache fixture. Web has session replay with everything masked and a feedback widget, and the Expo app reports JS errors." | Logs filtered on `case_id`, then the cron monitor | Screenshots |
| 4:20-5:00 | "What is not there: no web project, so web events land in the API's project. No error boundary in the Next app. And `/ops/ask`, which puts Sentry's MCP server in an agent's hands, has never been run end to end, so I will show you the code and not claim a live answer." Closing line. | `ops.py` | |

**Opening line.** "The first thing Sentry showed me was that Sentry was not on."

**Closing line.** "One trace per decision with its real dollar cost, structured logs per case, a cron
monitor that already caught something, and an alert that fires when a model's words do not match the
engine's numbers."

**Likely questions.**
- *Which products beyond error monitoring?* AI agent monitoring through the OpenAI Agents
  integration, tracing, structured logs, crons, uptime, and session replay on the web.
- *Do agent-to-agent asks show as spans?* The integration promises agent invocations, tool calls and
  token counts. Our agents talk through our own event log, so those are events, not spans.
- *Would you have found the DSN bug without Sentry?* No, and that is the point. The absence of data
  was the signal, and I only went looking because I wanted to show you a trace.

---

## 8. Composio

**What they asked for.** The most creative, ambitious and genuinely useful use of the platform, and
what agents can really do when you give them the right tools.

**The one thing only Pixie can say.** The agent's last move is an action, and the reply comes back
in: a broker's number is accepted only if the model can quote it verbatim from the email, the quote
is re-checked against the raw text, and then it becomes a Known fact with the message id as its
source.

**The screen.** `/cases/138` actions panel beside the broker inbox tab.

**The number.** The email asks the broker for 2 facts. The case has 8. The two are the only ones
whose resolution can move the interval across a line.

**The limitation I say first.** One toolkit is connected today: Gmail. Calendar, Sheets and Linear
compose the call, write the outbox row and the event pair, and return `not_connected` instead of
sending. `GET /composio/status` says so in one call, and I will show you that first.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:30 | "Watch this inbox. One click." Click "Request from broker" on 138. The email lands. | Actions panel + inbox tab | Pre-sent email in the tab |
| 0:30-1:15 | "Read it. It greets the broker contact from Federato's own data and asks for two things: business type and premium. Not the twenty a form would ask for, because only those two can move the decision." | The email open | Same |
| 1:15-2:00 | "Under it: Composio's Gmail tool with an explicitly named connected account, because with two connections on one toolkit the default routing will silently send from the wrong one, and this project's entity already has five Instagram accounts under one user id. And an outbox row keyed on case, action and facts, so a double click sends once." | `GET /composio/status`, then the outbox row | Show the outbox row |
| 2:00-2:50 | "Now the half that matters. When the broker replies, `GMAIL_FETCH_EMAILS` pulls it, a strict structured read takes only the facts we asked for and only values it can quote verbatim, the quote is re-checked against the raw email, and the case re-scores itself. The lane shows a finding sourced to the message id, then an assessment narrowing the interval, with nobody re-running anything." | The broker-reply check, then the case lane | The test output |
| 2:50-4:10 | "Why did the agent send that email at all? Because 138 straddles 45 and premium is the only unresolved fact that crosses it. The desk investigated everything it could reach itself: Intake estimated from comparables, Hazard read FEMA, Portfolio asked Elastic. What is left, only the broker knows. And the choice is an agent's: a three-tool agent reads the case and picks email, calendar hold or defect ticket, and every tool refuses anything not already true of the case." | `/live` lanes, ending on the Lead's action event | Replay |
| 4:10-5:00 | "Honest scope: Gmail is connected, the other three are composed and refused. The defect ticket is the one I would connect next, because it points at the carrier's own data team rather than the broker." Closing line. | `/composio/status` | |

**Opening line.** "Watch this inbox. I am going to click one button."

**Closing line.** "The agent works out exactly what it needs to know, Composio goes and asks, and the
answer comes back in as a sourced fact rather than a note."

**Likely questions.**
- *Why not more toolkits live?* Four are written and three need an OAuth click I did not get to.
  `GET /composio/status` reports which, in one call, rather than failing silently at the booth.
- *Does it email real brokers?* No. Federato's contact emails are synthetic, so it sends to a demo
  inbox with the real contact name in the greeting.
- *What stops duplicate sends?* One outbox row per case, action and fact set, or per message id for
  the reply. A retry or a repeated click is a no-op, and that path is tested.
- *Why a poll instead of a trigger?* A real Gmail trigger exists and polls every two minutes, but
  wiring it needs a public webhook or a listener alive for the whole demo. `check_broker_reply`
  keeps its contract, so swapping the button for a webhook changes only the caller.

---

## 9. Elastic

**What they asked for.** Data turned into something a person or agent can act on, and agentic
systems that reason over your data, decide what to retrieve, call tools and trigger actions, with
Elasticsearch as the context layer. They name aggregations, ES|QL, geo and time-series queries.

**The one thing only Pixie can say.** "Have we written this risk before" is a question about the
book, not a question for a model, and the answer is a hybrid retriever with a reranker whose every
returned number is copied out of the index.

**The screen.** The precedent panel on `/cases/138`, then Kibana.

**The number.** `pixie-precedent` holds 127 docs, 14 of them declines. Among the declines, Steel
Frame construction is the most over-represented fact in the whole book: 4 of 14 declines against 8
of 127 book-wide, significance score 1.01.

**The limitation I say first.** Every Elastic path has an in-memory twin that runs the same math, and
the fallback is silent. So the badge matters: `[elastic]` or `[memory]` on every answer, and I will
point at it before I say the number.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:40 | "The Portfolio agent says two active property locations hold $57,354,000 within 30 km of this site. The badge says elastic. Let's check it." | `/cases/138`, portfolio line with the `[elastic]` badge | Local |
| 0:40-1:25 | Type it live: `FROM pixie-exposure \| STATS tiv = SUM(tiv) BY h3_r5 \| SORT tiv DESC`. "Same top cells as the map: $258,654,000 across 6 locations in the leading cell. And a note on that query: do not get this ranking from a terms aggregation ordered by a sub-metric. On a multi-shard index it is approximate, and here it dropped the true number two cell." | Kibana ES\|QL, then `/map` | Saved query in a Kibana tab |
| 1:25-2:20 | "Precedent. One retriever: BM25 and a semantic retriever over the same `semantic_text` field, fused with `rrf`, wrapped in a `text_similarity_reranker` against the Jina v3 reranker. The Hazard agent calls it once per deep dive and posts a finding where every figure is copied from the index doc, which also puts it on the guardrail's whitelist." | The precedent panel, then the raw retriever in Dev Tools | The panel |
| 2:20-3:10 | "And `significant_terms`, not `terms`, over the declines. That is a different question from a frequency count: a peril that is common in declines and equally common book-wide does not rank. Steel Frame scores 1.01, California 0.94, wildfire 0.49." | `/queue` declines panel, then the DSL in Dev Tools | The panel |
| 3:10-4:00 | "Elastic is load-bearing on the consumer side too. Toronto's basement flooding study areas are a `geo_shape` index and the fire halls are `geo_point`. The renter quote runs `ST_INTERSECTS` and `ST_DISTANCE` against the exact address, instead of the H3 cell centre the local pack used to answer with." | The ES\|QL pair against a Toronto point | The receipt lines with their `[elastic]` tags |
| 4:00-5:00 | "Three Agent Builder tools are registered, so you can run concentration, declines and the TIV percentile in Kibana yourself and get the number this page shows. Honest scope: `pixie-toronto` has 23,420 break-in points loaded and no code reads it yet, and there is no Workflow." Closing line. | Agent Builder, Tools, click Run | The tool list |

**Opening line.** "The Portfolio agent says $57,354,000 sits within 30 km of this site. Let's check
it in Kibana."

**Closing line.** "Elasticsearch is the desk's memory of what the carrier already wrote, the agent
decides when to ask it, and every answer says which backend answered."

**Likely questions.**
- *Why Elasticsearch for 122 exposure docs?* At this size memory works, and a test proves the two
  agree. A real book is millions of units with live updates, and geo aggregation is what this is
  built for.
- *Is it agentic or a lookup?* The lookup is deterministic. The choice to run it belongs to the
  agent, and on the fifteen routed rows it never runs.
- *Why the reranker on top of rrf?* Our research session confirmed the reranker over a plain
  retriever, not nested on rrf. Nesting is standard retriever composition and it ran correctly
  against our data, and that live check is the one piece I verified myself rather than inherited.

---

## 10. Expo

**What they asked for.** The best mobile experience: an app that is beautiful, feels truly native,
and is a joy to use, with whatever parts of Expo get you there.

**The one thing only Pixie can say.** A full insurance quote, camera, maps, gestures, blur, haptics,
audio and a PDF export, all running in Expo Go with no custom dev client.

**The screen.** The phone, VoiceOver on, in the judge's hand.

**The number.** Reduce Motion is a real state in three separate places: the map camera animation,
the bottom sheet, and every entrance animation. Each one checks `useReducedMotion()` and degrades to
the same content with no motion.

**The limitation I say first.** Expo Go only. There is no `eas.json` and no native project, so there
is no native crash reporting and no mobile session replay, and shared element transitions are gated
behind a build-time native flag Expo Go cannot set. I skipped them rather than ship them broken.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:30 | "I am turning on VoiceOver. The map is optional. Try it." Hand over the phone. | The app with VoiceOver on | Show the list path without VoiceOver |
| 0:30-1:20 | Let the judge swipe address, three questions, receipt. "Every control has a label, the full receipt always renders inline in the scroll view, and text follows their size setting." | The app | |
| 1:20-2:10 | VoiceOver off. "Now the craft. The factor breakdown opens in a real gesture-driven bottom sheet, but it is strictly additive, so the accessible path never depends on it. Every screen has a floating frosted bar that content scrolls under. Haptics on every slider detent, on the decision, and on each inventory line." | Quote screen, pull up the sheet | "Skip the map" |
| 2:10-3:00 | "Photograph your apartment. The native picker, up to four photos, and it comes back as an itemised list with a value range and a confidence word per line. Nothing writes to the contents value without a tap, and code sums the dollars, not the model." | Inventory screen | The exported screens |
| 3:00-3:40 | "The receipt becomes a real shareable PDF with `expo-print` and `expo-sharing`, with the same sourcing and the same illustrative label, and no server round trip. And the quote reads itself aloud with `expo-speech`, offline and free." | The PDF share sheet | Describe it |
| 3:40-4:30 | "Behind it is the same engine that underwrites commercial property. The quote is instant because it is code. 'View as underwriter' opens the same case on the desk." | "View as underwriter" | Laptop case page |
| 4:30-5:00 | "What I could not verify without this phone: how the haptics and the sheet actually feel. The bundle exports clean with 1,942 modules and the types are clean, and that is not the same as touching the screen." Closing line. | The app | |

**Opening line.** "I am turning on VoiceOver. The map is optional. Try it."

**Closing line.** "One Expo Router app, built overnight, that gets a person from an address to an
explained quote whether or not they can see the map."

**Likely questions.**
- *Why not a dev build?* No native build step during the night and instant reloads over the tunnel.
  The cost is no custom native modules, which is why maps are `react-native-maps` and the H3 maths is
  on the server.
- *Which Expo pieces?* Expo Router, expo-location, expo-image-picker, expo-haptics, expo-blur,
  expo-image, expo-print, expo-sharing, expo-speech, expo-audio, expo-web-browser, Reanimated,
  Gesture Handler, and Sentry's React Native SDK.
- *Does it run without the API?* It falls back to three bundled fixture quotes with an offline
  banner. `EXPO_PUBLIC_API_URL` is not set in the repo, so it has to be pointed at the tunnel before
  a booth, and the Gemini features are dead until it is.

---

## 11. Gemini

**What they asked for.** Apps built with the Gemini API that make your friends say whoa, from
language understanding to summarising complex information.

**The one thing only Pixie can say.** Every number on the page is code. The one card that is not
ours comes with a Google Maps link for every place it names, and it is labelled advisory because it
can never touch a price.

**The screen.** The "what's around you" card, live.

**The number.** For 43.6532, -79.3832 it returns Toronto Fire Station 332 at 260 Adelaide Street
West as the primary responder, the Union Station rail corridor about a kilometre south as the nearest
exposure hazard, and it says there is no local heavy industry or bulk fuel storage. Each place
carries a `maps.google.com` citation.

**The limitation I say first.** There is no canned Gemini response anywhere. With no key the four
routes return 502 and the card shows an unavailable state. The feature disappears rather than lying,
and that means it needs the network at the booth.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:45 | "Every number on this page is computed by our code. This card is the one thing Gemini adds." Run it live on a Toronto address. "Fire Station 332, 260 Adelaide West. The rail corridor a kilometre south. No heavy industry nearby. Tap the citation." | The card, citations opening in Maps | Cached card from disk |
| 0:45-1:20 | "That is Maps grounding: the model gets the latitude and longitude in its retrieval config, and the places come back in grounding metadata with their own links. It is labelled advisory only, and it never enters the price." | The card's label | |
| 1:20-2:30 | "The bigger one is on the phone. Photograph your apartment, and Gemini returns category, item, quantity, a low-high value range and its own confidence per item, under a strict JSON schema. Code multiplies and sums, in Python, and clamps the result. The renter unchecks or nudges any line before it counts." | Inventory screen on the phone | The exported screens |
| 2:30-3:10 | "It behaves when the input is wrong. A non-room photo came back with zero items rather than inventing furniture." | The empty state | |
| 3:10-4:20 | "And a transparency demo: ask Gemini to double-check the arithmetic and it writes Python, runs it with the code-execution tool, and shows you the code and its answer. The pass badge still comes from our own server-side sum. In the test, the fake model's own text says the sum does not match and the route still returns matches, from our arithmetic." | The verify link on the quote screen | The test |
| 4:20-5:00 | "Scope: four routes, one model family, and Gemini never sets a number that reaches a price." Closing line. | The card | |

**Opening line.** "Every number on this page is code. This card is the one thing Gemini adds."

**Closing line.** "Gemini reads a room and reads a neighbourhood, with a citation or an editable line
for everything it says, and our arithmetic still owns the price."

**Likely questions.**
- *Why not let Gemini score the risk?* A score has to be auditable and repeatable. Maps grounding
  and vision are good at what is nearby and what is in this room, so those are the jobs they get.
- *What if it names a place that is not there?* Every place carries a Maps citation you can open, and
  the card is advisory.
- *Is it live?* Yes, and it caches to disk by request, so showing the same block twice costs one
  call. Warm the cache before the booth.
