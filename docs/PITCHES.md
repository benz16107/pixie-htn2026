# Atlas: sponsor pitches

Twelve separate 5-minute pitches for Sunday judging (09:45-11:45, plus finalist rounds). Each sponsor gets its own angle and its own style. Source material: `PLAN.md` sections 5 and 6, `DESIGN.md`, `NOTES.md`, `../../TRACKS.md`, `../../intact/GEO-PLAN.md`.

Anything in `{braces}` is a number or fact to fill in from the real product at the 02:15 precompute. Never say a brace value from memory, and never fill one with an estimate. If a value doesn't exist by 09:45, cut the line that uses it.

---

## Pitch map

| # | Sponsor | Style | Hook (first sentence) | Start screen |
|---|---|---|---|---|
| 1 | Federato | FDE walkthrough of one real case | "Submission 138 looks like a yes, and it has no premium." | Case 138, premium shown as Missing |
| 2 | Intact | The judge gets their own quote on the phone | "Type the address of the first place you rented in Toronto." | Expo app, Address screen, phone in the judge's hand |
| 3 | Rox | Forensics tour: five defects in the data, and what the agent did about each | "126 and 141 are the same hospital, sent by two different brokers." | Case 126, issues panel |
| 4 | OpenAI + Codex | Builder's log: product on the left, receipts on the right | "Ask Federato's API anything in plain English. Type it." | Ask box, cursor in the input |
| 5 | Huawei openJiuwen | Architecture read off the live swimlanes | "This arrow is the Hazard agent asking the Portfolio agent a question." | Case 138 lanes, paused on the first ask arrow |
| 6 | Linq | Live, laptop closed, the judge holds the phone | "Don't look at my laptop. The underwriter's morning is on this phone." | iPhone, Messages, digest thread |
| 7 | Sentry | A debugging story, told from the trace | "This trace is why {the change from INCIDENTS.md row 1}." | Sentry trace of the incident |
| 8 | Composio | The action, then the reasoning behind it | "Watch this inbox. I'm going to click one button." | Case 138 actions panel + broker inbox tab side by side |
| 9 | Elastic | Live ES\|QL that matches the agent's number | "The Portfolio agent says {TIV} in this hex. Let's check it in Kibana." | Kibana Discover, ES\|QL editor |
| 10 | Expo | Mobile craft, eyes closed | "I'm turning on VoiceOver. The map is optional. Try it." | Expo app on the iPhone, VoiceOver on |
| 11 | Gemini | Short and specific | "Every number on this page is code. This card is the one thing Gemini adds." | Case 138, surroundings card |
| 12 | ElevenLabs | Short and specific, audio first | (Press play. The briefing speaks before Ben does.) | Queue page, briefing player |

---

## Route and timing for the judging window

Assumption: Ben walks to each sponsor's booth (PLAN.md section 5). If judges come to the table instead, keep the same order as the queue order.

| Target start | Sponsor | Why here |
|---|---|---|
| 09:45 | Federato | Biggest prize, best-rehearsed pitch, judges not yet tired |
| 09:53 | Intact | Second priority; the phone is fully charged |
| 10:01 | Rox | $10K; reuses the Federato screens already open |
| 10:09 | OpenAI + Codex | Needs a live ask-box call while the network is known good |
| 10:17 | Huawei openJiuwen | Same lanes as Federato, different story |
| 10:25 | Linq | Send the digest at 10:22, walking over |
| 10:33 | Sentry | Needs the Sentry tab logged in |
| 10:41 | Composio | Reset the outbox first (see below) |
| 10:49 | Elastic | Kibana tab |
| 10:57 | Expo | Phone |
| 11:05 | Gemini | 3-minute pitch is fine |
| 11:13 | ElevenLabs | 3-minute pitch is fine |
| 11:21-11:45 | Buffer | Return to anyone who was busy; answer follow-ups |

Rules for the route:
- Each stop gets 8 minutes: 5 to pitch, 3 to walk and reset. Twelve stops use 96 of 120 minutes.
- If a queue is longer than 8 minutes at a top-5 sponsor, take the next thin-fit stop and come back.
- If time runs short, cut from the bottom: ElevenLabs, then Gemini, then Expo. Never cut Federato, Intact, Rox or OpenAI.
- **Reset between stops.** The outbox is idempotent, so a second click on 138 sends nothing, and "approve 1" only flips a row once. Before Composio and Linq, run the demo reset (add `atlas demo-reset` to the A1 fix list: clears outbox rows and human decisions for the demo cases), or rotate cases: 138 for Federato, 126 for Rox, 134 for Composio.
- Linq sandbox allows about 100 messages a day. Send each digest just before its pitch, not in advance.
- Before 09:30: mint the Federato token, set `ATLAS_OFFLINE=1` for every path that doesn't need the network, charge the phone, test the hotspot, and open the tabs in pitch-map order in one browser window.
- Finalist round: use the six-beat demo in PLAN.md section 6 with Federato's opening line and Intact's phone beat. The finalist rubric rewards "creative and surprise", so let a judge type their own Toronto address there too.

---

## Universal rules

1. **Start on a live screen.** No slides, no title card. The first thing a judge sees is the product doing something.
2. **Show where every number comes from.** Hover the provenance badge, open the source line, point at the n. If you can't show the source, don't say the number.
3. **Say limitations plainly, before the judge asks.** Synthetic sample data, small n, illustrative tenant prices, replay by default.
4. **Replay is the default, and say so.** "This is the run recorded at 01:30. Want me to run one live?" Then do it if they say yes.
5. **One thing to remember per sponsor.** Say it in the first 30 seconds and again in the closing line.
6. **Stop at 4:30 if the judge is quiet**, and invite a question. If they interrupt, answer and skip the later beats; every beat after 3:00 is cuttable.
7. **Use the sponsor's words.** Quote their prize text back once, then show the screen that meets it.
8. **Name what was built by agents.** One person, three coding agents, and `CODEX.md` has the receipts. Never claim more.

---

## 1. Federato

**Who's judging and what they care about.** Federato's Forward Deployed Engineering team. They want "an AI agent that thinks like an underwriting professional", that can "ingest submissions, enrich them with real-world risk data, and produce insights relative to a carrier's appetite guidelines", with "explainable, actionable insights so decision-makers can move faster and with confidence." Their rubric (from `STUDENT_PROJECT_GUIDELINES`): Exceptional means traceable agentic reasoning, analysis that deepens on high-value cases, explained contradictions and an actionable UI. The bonus is external APIs that visibly change the ranking.

**The one thing.** Atlas knows what it doesn't know, and it only investigates where the missing fact could change the decision.

**Style.** An FDE walkthrough of one real case, the way you'd sit with an underwriter. Start with a submission that looks easy, show why it isn't, and let each rubric tier appear as the case unfolds. Name the rubric tier out loud when you hit it.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:30 | "Submission 138. Florida, masonry non-combustible, built 2023, $2.07 million insured value. It looks like a yes, and it has no premium. Premium is a guideline factor. So what does an underwriter do?" | Case 138: facts with provenance badges, premium as `Missing (resolver: broker)`, the interval straddling 70 | Local, from the store |
| 0:30-1:05 | "Atlas scores every submission as a range. 158 submissions, 21 open. Where the range is decided, like 133 in Illinois, built 1950, it spends no agent time. Where the range crosses a decision line, it investigates." | Queue (open) with interval bars and the 45/70 lines; point at 133's decided chip and 138's flipper icon | Local |
| 1:05-2:15 | "Here's the desk working 138. The Lead plans. Intake finds the insured value through the insured's headquarters, because open submissions have no building link, and estimates premium from comparable bound policies. Hazard skips earthquake for Florida and checks FEMA. Portfolio checks what we already hold in that hurricane cell. The range goes from {before} to {after}." | Case 138 lanes, replay at 4x; stop on the Intake path choice and the enrichment chip | Replay is the default; a live run only if asked |
| 2:15-2:45 | "Contradictions get named. 126 and 141 are the same insured from two brokers. 143 was received in August, and the insured bound property coverage elsewhere in November, so it's probably stale. Atlas asks the broker instead of guessing." | Queue issue icons, then 126's issues panel | Local |
| 2:45-3:15 | "What's left on 138 only the broker can answer, so the Lead emails the broker for exactly the fields that could flip the decision, and nothing else." | Actions panel, then the broker inbox tab | Email pre-sent in the tab |
| 3:15-3:50 | "Ask it anything in English. Attempt one used a dot-path through an array, the lint caught it, attempt two used `$elemMatch` and ran against your API." | Ask box, a canned chip or a judge's question | Canned chip from cache |
| 3:50-4:40 | "The backtest, pre-registered at commit {hash} before the first run. Enrichment changed {B3} tiers. On your 11 underwriting declines, the desk agreed on {B2}. And the 2025 guideline would decline 17 of your 27 bound property policies on premium alone, so your underwriters write off-guideline often, and the desk shows where." | Backtest page, n printed next to each number | Static page from cache |
| 4:40-5:00 | Closing line | Back to case 138 | |

**Opening line.** "Submission 138 looks like a yes, and it has no premium."

**Closing line.** "Atlas scores every submission as a range, spends agent time only where a missing fact could change the decision, and every number on screen traces back to your schema or a public source."

**Likely questions.**
- *Isn't this just rules?* The scoring is your guideline in a YAML file, on purpose, because an underwriter has to audit it. The agents decide where to look: which schema path, which hazard lookup, which conflict matters, whether to email the broker. On 133 they spend nothing; on 138 they made {n} calls. No number comes from a model, and a check rejects any number in the prose that isn't in the computed facts.
- *This is synthetic data. Would the backtest hold up?* It's your sample, so the n is small: 27 bound property policies and 11 underwriting declines. I committed the method before running it, and every number shows its n. Low agreement with the humans is expected because the book is mostly off-guideline on premium.
- *How would this deploy at a carrier?* The query planner reads the schema-discovery endpoint, the guideline is a rules file, and hazards come from swappable region packs. A new carrier changes those three inputs. The engine names no state or dataset, and a test enforces that.

---

## 2. Intact

**Who's judging and what they care about.** Intact's tech and lab team. They want a prototype that "reimagines how people obtain car insurance, tenant insurance, or both", a quote flow where "a user [can] provide relevant information and receive an insurance recommendation, estimate, or next step", with "user experience and accessibility, with a clear, intuitive, and inclusive interface", plus a README on the problem, how AI is used, the journey, and limitations.

**The one thing.** You see why before you pay: every dollar on the receipt has a source, and the whole quote works without the map.

**Style.** A consumer story told on the judge's own terms. Hand them the phone in the first 10 seconds, let them type an address they know, and narrate only what they're looking at. Ben talks less than in any other pitch.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:25 | "Type the address of the first place you rented in Toronto. Or anywhere you know in the city." Hand over the phone. | Expo app, Address screen | Pre-filled demo address |
| 0:25-1:15 | "This is your block, scored from city and police open data. The map is optional: 'Skip the map' is always there. Three questions: which floor, roughly what your things are worth, any claims." | Map with hex polygons, then the 3 questions | "Skip the map"; if the tunnel fails, the hotspot |
| 1:15-2:15 | "Here's your decision and your receipt. Every line is a dollar amount with its source. Tap one." Let the judge tap a line. "Break-ins near you, Toronto Police data 2023-2026, and it's capped. The lines add up exactly to the total." | Decision + Receipt, one line expanded | Recorded clip of a quote |
| 2:15-2:55 | "Now the same address, but a basement unit. It's in a basement flooding study area, so it doesn't guess a price. It refers you to a person and recommends sewer backup coverage, with the reason." | Second quote: basement → refer + recommendation | Pre-run `TQ-*` case |
| 2:55-3:35 | "Accessibility. VoiceOver completes the whole quote without the map, text scales with your settings, and every target is at least 44 points." Turn on VoiceOver, swipe through the receipt. | Same app with VoiceOver | Describe it and show the list path |
| 3:35-4:25 | "Tap 'View as underwriter.' That referral is now a case on the underwriter's desk, the same engine and the same page that scores commercial property. The AI agents review referrals there. The price itself is code, so it's instant and auditable." | Laptop opens `/cases/TQ-*` | Open the URL by hand |
| 4:25-5:00 | "What it doesn't use: no age, sex, income, ethnicity or credit, and no assault or robbery data, because those aren't the covered loss. Each location factor is capped. Prices are illustrative, not an Intact rate." Closing line. | About screen: sources, fairness, limits | |

**Opening line.** "Type the address of the first place you rented in Toronto."

**Closing line.** "Instant, explained, capped, and usable without a map, and when it isn't sure, it hands you to a person instead of guessing."

**Likely questions.**
- *Where is the AI?* The price and the approve-or-refer decision are code, on purpose, so they're instant and auditable. The model writes the plain-language explanation and suggests add-ons from the hazard profile, and the five-agent desk reviews every referral. We chose not to let a model set a price.
- *Isn't pricing by neighbourhood just redlining with a map?* That's the risk, so the guardrails are in the product. Only peril-matched data, so break-ins count for contents but assault and robbery don't. Each factor is capped between ×0.92 and ×1.10, the whole location part between ×0.85 and ×1.25, and small cells are pulled toward the neighbourhood average so one bad month on one block can't move a price. No demographic inputs. We have not yet run the correlation audit against neighbourhood income; that's the next thing I'd build. {If the audit page exists by 09:45, show it instead.}
- *Are these real prices?* No. The base is an invented $150 a year for $20,000 of contents, placed near advertised entry prices, and the app says so on every quote. It's Toronto only, and police data is offset to the nearest intersection, which limits resolution to about a block.

---

## 3. Rox

**Who's judging and what they care about.** Rox wants agents that "operate on real-world, messy data and take meaningful actions": "unstructured information, incomplete datasets, conflicting sources, or noisy data". They name "data cleaning and validation, multi-source resolution, intelligent error handling, or robust decision-making under uncertainty", and they want agents that "don't just work in clean demos."

**The one thing.** When the data is bad, Atlas widens its answer and goes to get the missing fact. It never fills a gap with a guess.

**Style.** A forensics tour. Five real defects in Federato's data, each shown the same way: what's wrong, what Atlas saw, what it did. The rhythm is the point: defect, detection, action, five times, fast.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:30 | "126 and 141 are the same hospital, Lakeside Medical, sent by two different brokers. Which broker owns it? Atlas flags a duplicate account with a broker conflict, cites both records, and won't score one as clean." | Case 126 issues panel, both source records | Local |
| 0:30-1:15 | "Mess two: every open submission is missing its premium. Atlas doesn't call that zero and doesn't call it a pass. It estimates a range from comparable bound policies and keeps the whole score as a range. Here's 138 staying open because of it." | Case 138: premium `Estimated` with its range and method; interval bar | Local |
| 1:15-1:50 | "Mess three: 143 was received in August, and the same insured bound property coverage elsewhere in November. Stale or duplicate. Atlas asks the broker, with the dates cited." | Case 143 issues panel | Local |
| 1:50-2:25 | "Mess four: 134 asks for a $1 million limit on $24.3 million of insured value. Mess five: a location tagged flood that FEMA puts in {zone}. Sources disagree, so Atlas shows both and says which one it used." | 134 limit-vs-TIV issue; a flood tag vs FEMA fact | Local |
| 2:25-3:10 | "The agents make their own mess too. When a query is wrong, Federato's error comes back as a code and a message, Atlas parses it and retries. When an agent writes a number that isn't in the computed facts, the explanation gets rejected. Here's a planted wrong number being caught." | Ask box attempts list with a parsed error; the `verify_numbers` test output or a rejected-explanation event | Test output in the terminal |
| 3:10-4:10 | "Then it acts. For 138, the broker gets one email listing only the facts that could change the decision. The underwriter gets the top three by iMessage and approves by replying." | Broker inbox tab, then the phone digest | Pre-sent email; labelled replay of the Linq payload |
| 4:10-4:40 | "Across the desk run: {n} issues found, {n} cases where an estimate kept a decision open, {n} explanations rejected and regenerated from the template." | `eval/desk_run.json` summary or the queue issue counts | Read the numbers from the file |
| 4:40-5:00 | Closing line | Queue | |

**Opening line.** "126 and 141 are the same hospital, sent by two different brokers."

**Closing line.** "Every value keeps its source, bad data widens the answer instead of hiding in it, and the agent's last step is going out to fix the gap."

**Likely questions.**
- *Did you plant these messes?* No. The duplicate account, the stale submission, the limit-vs-TIV gap and the missing premiums are all in Federato's sample as delivered. The only thing I planted is the wrong number in the verification test.
- *Isn't this just validation rules?* Detection is code, because a duplicate account is a fact, not an opinion. The agents decide what to do about it: which path to query next, which conflict matters for this decision, and whether it's worth a broker email. On a decided case the agents do nothing even if there are issues, because no answer would change the outcome.
- *What if the broker never replies?* The case stays open and ranked by value at stake. The underwriter sees it in the digest with the missing fact named, and can refer it by text.

---

## 4. OpenAI + Codex

**Who's judging and what they care about.** OpenAI judges "what you built with the OpenAI API: how creatively and effectively the API powers the experience" and "how Codex helped you build it: how meaningfully it supported planning, implementation, testing, debugging, or iteration." The demo must "show the working product, explain how the OpenAI API is used, and share one concrete way Codex improved your process or outcome."

**The one thing.** One person shipped a five-agent desk and a phone app overnight because Codex ran a whole lane in parallel, and `CODEX.md` shows every task with its commit.

**Style.** A builder's log. The product runs on the left half of the screen and the receipts on the right: `CODEX.md`, the git log, the worktree. Answer their three required items in the order they list them, and say "that's the concrete one" when you reach the Codex story.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:30 | "Ask Federato's API anything in plain English. Type it." The judge types. "The model writes the query, a lint checks it against the schema, and if Federato rejects it, the model reads the error and fixes it." | Ask box, judge's question, attempts list | Canned chip from cache |
| 0:30-1:40 | "The API powers a five-agent desk on the Agents SDK. Each agent returns a structured output, a typed object, so the code can check it. The Lead runs on {flagship model}, the specialists on {cheaper model}. Here's 138: every lane is an agent, every chip is a tool call." | Case 138 lanes, replay; expand one tool chip to JSON | Replay |
| 1:40-2:10 | "What the model doesn't do: set a number. It chooses where to look and writes the explanation, and a check rejects any number that isn't in the computed facts." | A verified explanation with its tick | Local |
| 2:10-3:10 | "Codex was one of three coding agents, each in its own git worktree. Codex owned the data and proof lane: {list the real CODEX.md rows, e.g. the Toronto data pack, the US hazard prefetch, the Elastic loader, the backtest, the Expo app}. That's {n} tasks and {n} commits." | `CODEX.md` + `git log --oneline lane/a3` | Show the file only |
| 3:10-4:00 | "The concrete one: {the best real CODEX.md story, told in two sentences: what Codex did, and what would have happened without it}." | The commit diff for that story | The CODEX.md row |
| 4:00-4:40 | "And the phone app you're about to see was built by Codex from 23:15, against mock data, while the backend was still moving." Show one quote on the phone. | Expo app, one quote | Recorded clip |
| 4:40-5:00 | Closing line | CODEX.md | |

**Opening line.** "Ask Federato's API anything in plain English. Type it."

**Closing line.** "The OpenAI API does the judgment, code does the numbers, and Codex built a third of this in its own lane, with a commit for every claim."

**Likely questions.**
- *Why structured outputs instead of free text?* Every agent result feeds code: the scheduler, the conflict check, the number check. A typed object fails loudly when it's wrong; prose would fail silently.
- *What did Codex get wrong?* {One real example from the night, with how it was caught: a failing test, a review, a rerun.} If there's none worth telling, say what the review process was: every merge ran the tests, and red meant no merge.
- *Could one agent do all of this?* One agent with the specialists as tools is simpler, but then specialists can't ask each other anything and the Lead serializes every step. Separate agents run in parallel and leave a trace an underwriter can read.

---

## 5. Huawei openJiuwen

**Who's judging and what they care about.** The openJiuwen team wants "genuine agent collaboration: task decomposition, communication, tool use, and coordination, rather than simply chaining LLM prompts together." Judging covers "quality of multi-agent collaboration, scenario creativity, demo completeness, technical implementation, and reusability." JiuwenSwarm or WorkSwarm is encouraged, not required.

**The one thing.** Specialists address each other directly, code detects when they disagree, and the Lead resolves only from options the guideline allows.

**Style.** Architecture read off the live screen. Pause the swimlane replay and walk the four words from their prize text, one at a time, each pinned to something visible: decomposition is the Lead's plan, communication is the arrows, tool use is the chips, coordination is the conflict card. Then prove reuse with a second case from a different domain.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:30 | "This arrow is the Hazard agent asking the Portfolio agent a question, directly. No prompt chain passes it along. Every lane is an agent, and they share one event log." | 138 lanes, paused on an ask arrow | Replay |
| 0:30-1:15 | "Task decomposition. The Lead reads the scored case and sees which facts could flip the decision. That's the plan: Intake for premium, Hazard for flood, Portfolio for concentration. Code proposes a depth, and the Lead can raise it but never lower it." | Lead lane, first plan card | Local |
| 1:15-2:00 | "Communication and tool use. Specialists run in parallel. They post findings and ask each other addressed questions. Each chip is a tool call you can open." | Resume replay at 1x, open a tool chip | Replay |
| 2:00-2:50 | "Coordination. When two specialists disagree, code detects the conflict, not a model. The Lead resolves it from a list of resolutions the guideline allows, and the lane says why. Two rounds maximum, then it stops or asks a human." | Conflict card and the Lead's resolution | Show the event JSON |
| 2:50-3:50 | "Reusability. Swap the rules file and the region pack, and the same desk reviews a Toronto tenant who was referred from a phone app. Same agents, same scheduler, different domain." | Consumer referrals row, then the `TQ-*` case lanes | Pre-run TQ case |
| 3:50-4:30 | "It adapts. On a case that's already decided, the desk does nothing and says why. Agent time goes where information can change the outcome." | Case 133 lane: "decided, no deep dive" | Local |
| 4:30-5:00 | Closing line | Lanes | |

**Opening line.** "This arrow is the Hazard agent asking the Portfolio agent a question, directly."

**Closing line.** "Agents that plan, ask each other, get checked by code when they disagree, and move to a new domain by swapping two files."

**Likely questions.**
- *Why not JiuwenSwarm?* Honest answer: I had one night and already knew the OpenAI Agents SDK, so I wrote a small scheduler on top of it rather than learn a new framework under time pressure. The pieces map across: addressed asks, a shared event log, a lead with bounded authority. Porting the scheduler to WorkSwarm is the first thing I'd try with your team.
- *Isn't this a pipeline with extra steps?* A pipeline has a fixed order. Here the Lead chooses which specialists run based on which facts could flip the decision, specialists ask each other questions mid-run, and on decided cases nothing runs. The event log shows different shapes for different cases.
- *How do you stop agents arguing forever?* Conflicts are computed from their typed outputs, the Lead can only pick from an allowed set, the policy caps it at two rounds, and every case has a call budget.

---

## 6. Linq

**Who's judging and what they care about.** Linq wants "new utilities and experiences brought directly into iMessage", tasks done "without ever needing to open another app", and asks "what annoying or time-consuming tasks do people still do that could be made easier through messaging?"

**The one thing.** The underwriter never opens the app: the morning triage arrives as a text, and replying writes the decision to the case.

**Style.** Live, laptop closed. The judge holds the phone and does the whole thing by text. Ben opens the laptop only at the end, to show that the text changed the system of record.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:30 | "Don't look at my laptop. The underwriter's morning is on this phone." Hand it over. "That's the top three submissions to work, each with one line on why." | iPhone, Messages, the digest thread | Digest sent at 10:22 |
| 0:30-1:15 | "Reply 'why 2'." Judge types. "It replies with the explanation from the case, with the numbers from code." | The reply in the thread | If no reply in 10 s, say so and show the webhook log |
| 1:15-2:00 | "Now reply 'approve 1'." Judge types. Open the laptop. "The queue row flipped. That's written to the case with who approved it, when, and from which message." | Queue row flips live, then the case audit trail | Replay the saved inbound payload to the webhook, labelled "simulated" on screen |
| 2:00-2:30 | "'Refer 3' sends it to a senior underwriter. Three words cover the whole triage." | Thread | |
| 2:30-4:15 | "Behind the text: a five-agent desk scored 21 open submissions as ranges and investigated only where a missing fact could change the decision. The digest is its output. The top three come from the ranking, and 'why' is the same verified explanation you'd see on the case page." | Case 1 page and its lanes | Replay |
| 4:15-5:00 | "What was hard: {one real thing from the Linq setup test, e.g. which API version the key accepted, or the inbound payload shape}. I logged the raw payload first and parsed it tolerantly." Closing line. | Phone | |

**Opening line.** "Don't look at my laptop. The underwriter's morning is on this phone."

**Closing line.** "Three submissions, three replies, and the underwriter's decisions are on the record without opening an app."

**Likely questions.**
- *Can anyone text "approve"?* The webhook checks Linq's signature. {If built: only the registered underwriter's handle is accepted.} {If not built: say so.} A real deployment maps handles to underwriters and asks for a confirm step on approvals above an authority limit.
- *What if they type "aprove 1"?* The parser is tolerant to case and spacing. {If it replies with the valid commands on anything else, say that.} It never guesses an action it couldn't parse.
- *Why iMessage instead of Slack or email?* Underwriters triage between meetings, on their phone. A reply is faster than a login, and the decision still lands in the system of record with an audit trail.

---

## 7. Sentry

**Who's judging and what they care about.** Sentry wants "at least two products beyond error monitoring" (they list Session Replay, Logs, Tracing, Profiling, Uptime and AI agent monitoring) and want to see "how observability actually shaped what you built: the slow endpoint you found in a trace, the broken flow you caught in a replay, the bug you squashed at 4am because your logs told you where to look." They judge "how meaningfully Sentry data influenced your project, not just whether the SDK is installed."

**The one thing.** {The change from INCIDENTS.md row 1}, and we only found it because of a Sentry trace.

**Style.** A debugging story in the order it happened: symptom, what Sentry showed, the fix, the before-and-after trace. Tell it from Sentry's own screens. **Only real incidents.** `INCIDENTS.md` is empty as of Saturday 16:16. If it still has no real row at 09:45, use the fallback version below and say plainly that nothing broke badly enough to be worth a story.

During the build, watch for these and log them if they actually happen: a desk run over 60 seconds, a Federato 401 and token refresh, a Linq webhook that fails to parse, explanations rejected by the number check (visible in Logs), an Expo JS error over the tunnel.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:30 | "At {time}, {symptom}. This trace is why we changed {the fix}." | Sentry trace of the incident | Screenshot saved at the time |
| 0:30-1:30 | "Here's what it showed. {The span that was slow or failing}, inside the {agent} agent's run. The agent spans come from Sentry's OpenAI Agents integration, one per agent and tool call." | Trace waterfall, the guilty span expanded | Screenshot |
| 1:30-2:15 | "The logs around it told us {what}. We changed {the fix}, commit {hash}." | Sentry Logs filtered to the trace; the commit | Commit only |
| 2:15-2:45 | "After: {the same span, new timing or no error}." | The after trace | Screenshot |
| 2:45-4:15 | "The rest of the integration. Every desk run is a trace: {n} agent spans, {n} tool calls, token counts. Logs carry each rejected explanation and each retried query. The phone app reports JS errors to its own project." | A clean 138 trace; Logs view; the React Native project | Screenshots |
| 4:15-5:00 | Closing line | The incident trace | |

**Fallback version (no real incident).** Open on the 138 trace: "Every agent run is a Sentry trace, and here's the slowest span in it." Spend the time on what the traces and Logs show and one thing we'd tune from them. Say: "I don't have a 4am story to tell you, and I won't invent one."

**Opening line.** "At {time}, {symptom}. This trace is why we changed {the fix}."

**Closing line.** "Sentry didn't just catch errors here. It showed which agent was slow and why, and the fix is in the commit history."

**Likely questions.**
- *Which products beyond error monitoring?* AI agent monitoring through the OpenAI Agents integration, Tracing, and Logs. {Session Replay on the web only if it was added after 02:15.}
- *Do handoffs between agents show as their own spans?* {Answer from what the trace shows. The docs only promise agent invocations, tool calls and token counts.} Our agents talk through our own event log, so we also mirror those events into spans.
- *Would you have found it without Sentry?* {Honest answer for the specific incident.}

---

## 8. Composio

**Who's judging and what they care about.** Composio wants "the most creative, ambitious, and genuinely useful use of our platform" and to see "what agents can really do when you give them the right tools."

**The one thing.** The agent's last move is an action: it emails the broker for exactly the facts that could change the decision, and nothing more.

**Style.** The action first, then the reasoning that chose it. About 2 minutes on the Composio send, 3 on why the agent decided to send it. Composio is the hand; the pitch shows the brain that moves it.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:30 | "Watch this inbox. I'm going to click one button." Click "Request info from broker" on 134 (or 138 after a reset). The email lands. | Actions panel + broker inbox tab | Pre-sent email in the tab |
| 0:30-1:15 | "Read it. It names the broker contact from Federato's data and asks for {the flipper facts}. It doesn't ask for the 20 things a form would ask for, because only these can change the decision." | The email open | Same |
| 1:15-2:00 | "Under it: Composio's Gmail tool with an explicitly named connected account, because default routing can silently send from the wrong account. The send goes through an outbox, so a retry or a double click sends once." | Outbox log or the action status on the case | Show the outbox row |
| 2:00-4:15 | "Why did the agent send this? Atlas scores every submission as a range. 138 straddles a decision line because its premium is missing. The desk investigated: Intake estimated premium from comparables, Hazard checked FEMA, Portfolio checked concentration. What's left, only the broker knows. So the Lead decided to write." | 138 lanes, replay at 4x, ending on the Lead's action event | Replay |
| 4:15-5:00 | "Honest scope: one Composio tool in the loop, Gmail. The next ones are obvious: the reply coming back into the case, and a calendar hold with the broker." Closing line. | Case page | |

**Opening line.** "Watch this inbox. I'm going to click one button."

**Closing line.** "The agent works out what it needs to know, and Composio lets it go and ask for it."

**Likely questions.**
- *Why only Gmail?* That's the action the underwriting workflow needed tonight. I'd rather show one action the agent chose for a reason than five it fires at random. Reading the broker's reply back in is next.
- *Does it email real brokers?* No. Federato's contact emails are synthetic, so it sends to a demo inbox with the real contact name in the greeting.
- *What stops duplicate emails?* The outbox. Each action has an id derived from its content, so a retried or repeated request is a no-op.

---

## 9. Elastic

**Who's judging and what they care about.** Elastic wants data turned "into something a person or agent can actually act on", "agentic systems: agents that can reason over your data, decide what to retrieve, call tools, and trigger actions on their own, with Elasticsearch as their context layer." They name "aggregations, ES|QL, geo or time-series queries."

**The one thing.** The Portfolio agent decides to ask Elasticsearch what the carrier already holds near a new risk, and the answer changes the decision.

**Style.** A live query. Ben types ES|QL in Kibana and gets the same number the agent used. About 2 minutes on Elastic, 3 on the desk around it.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:30 | "The Portfolio agent says we already hold {TIV} of insured value in 138's hex. Let's check it in Kibana." | Case 138, Portfolio lane tool chip | Local |
| 0:30-1:20 | Type the query live: `FROM atlas-exposure \| WHERE h3_r5 == "{cell}" \| STATS tiv = SUM(tiv), n = COUNT(*)` (field names per the C4 loader). "Same number." | Kibana ES\|QL result | Pre-typed query in a saved tab |
| 1:20-2:00 | "The index holds every exposure unit as a geo point with H3 cells as keywords, so a terms aggregation answers 'what's in this cell' in one call. A second index holds Toronto break-in events for the tenant side." | Index mapping, `toronto-events` count | Mapping JSON |
| 2:00-4:15 | "The agent part: the Portfolio agent isn't forced to query. The Lead asks it only when concentration could flip the decision, and it chooses the cell resolution. Its answer moves the range on 138 from {before} to {after}." | 138 lanes replay, stopping on Portfolio's tool call and the interval change | Replay |
| 4:15-5:00 | "Honest scope: this is structured geo data, not text, and I didn't use vectors or Agent Builder. If Elastic is down, an in-memory index behind the same interface returns identical numbers, and a test checks that." Closing line. | Case page | |

**Opening line.** "The Portfolio agent says we already hold {TIV} in 138's hex. Let's check it in Kibana."

**Closing line.** "Elasticsearch is the agent's memory of what the carrier already holds, and the agent decides when to ask it."

**Likely questions.**
- *Why Elasticsearch for 938 exposure units?* At this size, memory works too, and there's an equality test to prove it. A real carrier's book is millions of units with live updates, and geo aggregation is what Elastic is built for.
- *Is it agentic, or just a lookup?* The lookup is deterministic. The choice to run it, and which resolution to use, belongs to the agent, and on decided cases it doesn't run.
- *Why no vector search?* Nothing in this workflow is a similarity question. Broker emails and loss narratives would be, and that's where I'd add hybrid search.

---

## 10. Expo

**Who's judging and what they care about.** Expo wants "the best mobile experience: an app that's beautiful, feels truly native, and is a joy to use", using "whatever parts of Expo get you there."

**The one thing.** A full insurance quote that works for anyone, including with VoiceOver and without the map, in Expo Go.

**Style.** Mobile craft. The judge uses the app with VoiceOver on, and Ben points out the details a native app should get right. About 2 minutes on the app itself, 3 on what powers it.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:30 | "I'm turning on VoiceOver. The map is optional. Try it." Hand over the phone. | App with VoiceOver on | Show the list path without VoiceOver |
| 0:30-1:30 | Let the judge swipe through address, three questions, receipt. "Every control has a label, targets are 44 points, text follows your size setting, and reduced motion turns the animations off." | App | |
| 1:30-2:10 | VoiceOver off. "With the map: the polygons are computed on the server, because h3-js hits BigInt problems on Hermes in Expo Go. The phone draws react-native-maps polygons it's handed." Show haptics on the decision. | Map screen, decision with haptic | "Skip the map" |
| 2:10-4:15 | "Behind the app: the same engine that underwrites commercial property. The quote is instant because it's code. Every receipt line has a source. 'View as underwriter' opens the same case on the desk." | Receipt, then "View as underwriter" in expo-web-browser | Laptop case page |
| 4:15-5:00 | "Honest scope: Expo Go only, no dev build, so no widgets or Live Activities. The next thing would be a Live Activity while a referral is under review." Closing line. | App | |

**Opening line.** "I'm turning on VoiceOver. The map is optional. Try it."

**Closing line.** "One Expo Router app, built overnight, that gets a person from an address to an explained quote whether or not they can see the map."

**Likely questions.**
- *Why not a dev build?* Expo Go meant no native build step during the night and instant reloads over the tunnel. The cost is no custom native modules, which is why maps are react-native-maps and the H3 math is on the server.
- *Which Expo pieces?* Expo Router for navigation, expo-location for "use my location", expo-web-browser for "View as underwriter", haptics, and Sentry's React Native SDK for JS errors.
- *Does it work on Android?* {Say what was tested. If only iPhone, say only iPhone.}

---

## 11. Gemini

**Who's judging and what they care about.** MLH wants apps built with the Gemini API "that make your friends say WHOA", from language understanding to summarizing complex information.

**The one thing.** Gemini with Google Maps grounding tells the underwriter what's around the building, with a citation for every place, and it never touches a number.

**Style.** Short and specific. One card, one reason, one guardrail. About 2 minutes on the card, 3 on the product around it.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:30 | "Every number on this page is code. This card is the one thing Gemini adds: what's around 138, from Google Maps, with a link for every place it mentions." | Case 138, surroundings card | Cached card |
| 0:30-1:30 | Open two citations. "{The actual note from the card, e.g. a nearby hazard or an inspection point}. The Hazard agent asks for this card only when it's working a case in depth." | Place citations open in Maps | Cached card |
| 1:30-2:00 | "It's advisory. It can add an inspection note with citations. It can't change a score, a premium or a factor." | Card with its "advisory" label | |
| 2:00-4:30 | Condensed Federato story: ranges, investigating only where it matters, the lanes on 138, the broker email. | Queue, then 138 lanes | Replay |
| 4:30-5:00 | Closing line | Card | |

**Opening line.** "Every number on this page is code. This card is the one thing Gemini adds."

**Closing line.** "Gemini gives the underwriter local knowledge with sources, and the guardrails keep it from moving the price."

**Likely questions.**
- *Why not let Gemini score the risk?* A score has to be auditable and repeatable. Maps grounding is good at "what's nearby" with citations, so that's the job it gets.
- *What if it names a place that isn't there?* Every place comes with a Maps citation you can open, and the card is advisory only.
- *Is it live?* {Say whether the card was cached at 02:15 or runs live.}

---

## 12. ElevenLabs

**Who's judging and what they care about.** MLH wants "natural, human-sounding audio" and projects that "give your project a voice."

**The one thing.** The underwriter can listen to the morning queue, and a renter can have their quote read aloud.

**Style.** Audio first. Press play before saying anything, and let the voice do the opening. About 2 minutes on audio, 3 on the product.

| Time | Say | Screen | Fallback |
|---|---|---|---|
| 0:00-0:30 | Press play. The briefing reads the top of the queue. Then: "That's the underwriter's morning, read aloud." | Queue, briefing player | Cached mp3 (it is the default) |
| 0:30-1:30 | "It's generated from the same verified explanations on the case pages, so it can only say numbers the code computed." | Case 138 explanation next to the transcript | |
| 1:30-2:00 | On the phone, tap "Read my quote". "For a renter with low vision, the receipt is read out line by line." | Expo receipt | Skip if not built |
| 2:00-4:30 | Condensed Federato and Intact story: ranges, lanes on 138, the phone quote and its receipt. | Queue, 138 lanes, phone | Replay |
| 4:30-5:00 | Closing line | Queue | |

**Opening line.** (After the audio.) "That's the underwriter's morning, read aloud."

**Closing line.** "The queue and the quote both have a voice, and it only says what the code can back up."

**Likely questions.**
- *Is it generated live?* {Say which: cached at 02:15, or live.} The cache is there so the demo doesn't depend on venue Wi-Fi.
- *Which model and voice?* {From config.}
- *Why would an underwriter want audio?* Hands-free review on a commute or between calls. For the renter it's an accessibility feature.
