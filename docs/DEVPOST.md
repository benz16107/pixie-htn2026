# Pixie: insurance that shows its work

<!--
Devpost project-story draft for Hack the North 2026.

Before submission:
1. Replace every [ADD ...] placeholder.
2. Upload media in the numbered order below so the references stay accurate.
3. Remove this comment and the empty track sections that have not been drafted.
4. Recheck every measured result against the final demo state.
-->

## Project overview

Pixie is one inspectable risk engine presented as two products: a commercial underwriting desk and a consumer insurance app. Across both products, AI chooses what to investigate and writes sourced explanations. Typed tools and deterministic code calculate scores, prices, and portfolio totals. A model never invents a number that appears as a result.

The commercial desk helps an underwriter move from a queue of incomplete submissions to a reviewable decision. The consumer app helps a customer compare choices, reduce risk, and prepare for recovery. Both products keep confirmed facts, estimates, and missing information separate. Every displayed value names its source.

Each sponsor section below describes Pixie within that track's scope. This keeps each judging story focused on the problem that sponsor asked us to solve.

### Project links

- Live project: [ADD DEPLOYED PROJECT URL]
- Source code: [ADD PUBLIC REPOSITORY URL]
- Project demo: [ADD PROJECT DEMO VIDEO URL]

### Track and media guide

| Part | Track | Media reserved for this section |
| ---: | --- | --- |
| 1 | Federato | Photos 01 to 07 and Video F1 |
| 2 | Intact | Photos 08 to 14 and Video I1 |
| 3 | Rox | Photos 15 to 18 and Video R1 |
| 4 | Sentry | Photos 19 to 23 and Video S1 |
| 5 | Elastic | Photos 24 to 28 and Video E1 |
| 6 | Expo | Photos 29 to 34 and Video X1 |

## Part 1: Federato

### Pixie for the Federato track

For Federato, Pixie is an AI-assisted commercial underwriting desk. It reads Federato's supplied submission data and discovered schema, evaluates each supported submission against a carrier's appetite guideline, requests more evidence when the record is incomplete, and ranks the queue for review. The interface shows the facts, sources, calculation, agent activity, portfolio context, and recommended next action in one case workspace.

This directly answers the official [Federato challenge](https://hackthenorth2026.devpost.com/): build an AI agent that ingests insurance submissions, enriches them with real-world risk data, and produces explainable, actionable insights relative to a carrier's appetite guidelines.

### Why we built it

An underwriter often receives a submission whose useful facts are spread across submissions, insureds, policies, locations, buildings, and claims. Some fields are confirmed, some can only be estimated, and others are missing. Treating a blank field as zero can make an incomplete risk look safe. Giving every case one confident score can hide the fact that one unanswered question may change the decision.

Pixie preserves that uncertainty. It computes the best and worst appetite score supported by the available evidence, then shows which missing fact can move the case across a decision threshold. The underwriter sees what to verify before acting.

### How Pixie meets the challenge

| Federato requirement | What Pixie does | Where to look |
| --- | --- | --- |
| Ingest submissions | Pixie reads the supplied Federato snapshot and schema. It follows the real relationships among submissions, insureds, policies, locations, buildings, and claims. | Photos 01, 03, and 05 |
| Reason about API queries | The Intake agent receives the discovered schema and checked query tools. Each recorded query includes its purpose, selected fields, expansions, result, and any repair attempt. Deterministic hydration handles the standard paths, so we do not claim that a model invents every query. | Photo 05 and Video F1 |
| Apply appetite guidelines | Pixie translates the supplied commercial property criteria into an explicit rulebook. Code calculates the score, hard-failure caps, decision thresholds, and uncertainty range. | Photos 02, 03, and 04 |
| Rank submissions | Pixie assesses all 158 supplied commercial submissions. It scores the 38 property submissions covered by the supplied guideline and routes the other business lines without pretending that the property rules apply to them. | Photo 01 |
| Explain every decision | Every factor shows its value, provenance, rule band, points, and effect on the result. Agent prose can use only numbers that already appear in computed tool output. | Photos 03 and 04 |
| Enrich with external risk data | Pixie adds FEMA hazard context, NASA POWER climate observations, and the carrier's existing nearby exposure. Each layer shows its source, unit, date range, and coverage gaps. | Photo 06 |
| Make the result actionable | The desk identifies the fact to request, provides a non-destructive what-if control, records a recommended next action, and allows a small reasoned human adjustment while keeping the original engine result visible. | Photos 03 and 04 |
| Handle edge cases | A missing value widens the rule-based score range. Checked queries expose API errors. Cached enrichment and recorded agent replay keep the demo inspectable when the venue network is unavailable. | Photos 03, 05, and 07 |

### How we used Federato

Federato provided the insurance-shaped data and the language needed to interpret it. We used its schema-discovery response to learn the available resources, fields, types, and references. Our adapter uses that schema to validate queries and hydrate a case from linked records. It keeps source paths such as `Submission`, `Insured.hq`, `Location`, and `Building` attached to the resulting facts.

The demo uses a local snapshot pulled from Federato's supplied synthetic API. This makes the live presentation repeatable and lets the app run without venue Wi-Fi. Pixie does not claim to connect to a Federato production account. A fresh clone needs valid challenge credentials and a locally pulled snapshot before it can refresh that data.

### How the underwriting agent works

1. The Intake agent inspects the discovered schema and the submitted record. It can issue a schema-aware Federato query when a linked fact needs verification.
2. The risk engine applies the carrier guideline to confirmed, estimated, and missing values. It computes a score range instead of asking a language model for a number.
3. Hazard and Portfolio agents inspect external context and the carrier's existing concentration around the site.
4. The Appetite agent explains the deterministic result. A Challenger can question the draft recommendation using the case evidence and computed sensitivity results.
5. The Lead agent produces the review recommendation. The underwriter keeps authority and can inspect, adjust, or reject the recommendation.

The six-agent workflow records which tool each agent called, what the tool returned, and how agents resolved disagreements. A number-verification guardrail rejects model prose that contains a number absent from the computed facts.

### One case from input to action

Case 138, Lumen Data Works, shows the full workflow. Pixie follows the insured's headquarters relationship to a building and retrieves $2.073 million in total insured value. The submission does not contain a confirmed premium, so Pixie labels the premium as an estimate from 27 bound property comparisons.

That unresolved premium leaves the case with an appetite range of 30 to 75. The range crosses a decision threshold, so the queue sends the case for review. In the what-if control, a hypothetical confirmed premium of $75,000 recomputes the result as 91 and accept. Resetting the scenario restores the original record. Pixie has now told the underwriter which question matters without changing the filed evidence. See Photos 03 to 05 and Video F1.

### Real-world risk and portfolio context

The geographic workspace separates three kinds of evidence. H3 cells show the carrier's active insured-value concentration. FEMA county and flood layers provide hazard context. NASA POWER records provide historical climate observations for plotted sites. Pixie displays each source and unit and marks locations that lack a county match.

Some existing hazard and nearby-exposure factors affect the computed score. Newer climate views support investigation only. They do not silently change the appetite result. The validation page measures what the connected enrichment changed: five of the six open submissions changed rank in the recorded comparison, while no case changed decision tier. See Photos 06 and 07.

### Technical implementation

- `federato.py` loads the discovered schema, validates payloads, follows references, and preserves provenance.
- `engine.py` evaluates every possible rule band supported by the evidence and returns the appetite interval.
- `desk.py` coordinates the specialist agents, tool calls, questions, challenge, and final recommendation.
- `portfolio.py` groups active insured value into H3 cells and computes nearby exposure.
- `guideline.py` validates a human rule edit before rescoring the whole book and reporting the measured difference.
- FastAPI exposes the engine and case APIs. Next.js renders the queue, case workspace, rulebook, portfolio map, recorded agent run, and validation report.

The model can choose an investigation and explain a result. Code owns the score, thresholds, what-if result, hazard factors, and portfolio totals.

### Challenges we ran into

The source records do not always contain a direct path from a submission to every fact needed by the guideline. We built schema-aware hydration that can traverse references such as an insured's headquarters and its buildings. We also show the query path so an underwriter can check it.

Missing data created a second problem. A default value made the interface look decisive while changing the meaning of the record. We replaced defaults with explicit `known`, `estimated`, and `missing` states and made the engine calculate every applicable rule band.

Agent explanations introduced a separate trust risk. A fluent explanation could state a number that no tool returned. Pixie now extracts every number from agent prose and checks it against the computed facts before displaying the explanation.

### What we are proud of

- The queue explains why a case needs attention instead of showing only a score.
- The rulebook, score equation, case facts, and recommendation remain connected and inspectable.
- The what-if control reruns the real engine without overwriting the submission.
- The geographic view puts a new submission beside the carrier's existing exposure and cited public risk data.
- The validation page keeps a known historical miss visible. One accepted policy later recorded $629,200 in incurred losses, so the demo does not imply that appetite fit guarantees a profitable risk.

### What we learned

Insurance data needs provenance as much as it needs a value. A field can be numerically plausible and still be unsuitable for a decision if it came from an estimate or the wrong linked record.

We also learned that uncertainty is useful when the interface turns it into a question. A range alone asks the underwriter to interpret more output. A range paired with the fact that would cross the threshold creates a concrete next action.

Finally, external data earns its place only when the product states what changed. The validation comparison distinguishes a rank change from a decision change and keeps coverage gaps visible.

### Limits and next steps

This build uses Federato's supplied synthetic snapshot and our transcription of the supplied commercial property guideline. The score range is a rule-based appetite range, not a confidence interval or probability of loss. The historical backtest is small and does not establish production accuracy or loss prevention.

A production version would need a live authenticated data sync, representative carrier evaluation, calibrated rules, persistent guideline versions, approval workflows, and role-based permissions. Winnability would also need broker-behaviour and quote-conversion data that the supplied snapshot does not contain.

### Federato media placeholders

Upload the Federato media in this order. Keep these numbers when the files move into Devpost's gallery.

| Media | Replace with | Suggested caption |
| --- | --- | --- |
| Photo 01 | [ADD FEDERATO QUEUE SCREENSHOT] | **A ranked queue that keeps uncertainty visible.** Pixie scores the 38 supported property submissions and routes the other supplied business lines. |
| Photo 02 | [ADD RULEBOOK AND EQUATION SCREENSHOT] | **The carrier's guideline is executable and inspectable.** Each criterion, point value, cap, and threshold is visible. |
| Photo 03 | [ADD CASE 138 FACTS AND RANGE SCREENSHOT] | **One incomplete case, with every fact tied to its source.** A missing premium leaves the appetite result at 30 to 75. |
| Photo 04 | [ADD CASE 138 WHAT-IF OR CALCULATION SCREENSHOT] | **Ask which fact changes the answer.** A hypothetical premium reruns the same engine without editing the submitted record. |
| Photo 05 | [ADD RECORDED FEDERATO QUERY SCREENSHOT] | **The investigation is traceable.** The query records its purpose, schema path, selected fields, and returned insured value. |
| Photo 06 | [ADD PORTFOLIO AND HAZARD MAP SCREENSHOT] | **See the submission in portfolio context.** Exposure concentration and public hazard layers keep their sources and units. |
| Photo 07 | [ADD VALIDATION SCREENSHOT] | **The validation page includes the miss.** Historical outcomes and enrichment effects remain visible beside the demo result. |
| Video F1 | [ADD FEDERATO DEMO VIDEO URL] | **Federato track demo.** Queue, rulebook, case 138, query trace, calculation, portfolio, and validation. |

## Part 2: Intact

<!-- RESERVED FOR THE INTACT-SPECIFIC PROJECT STORY. Media: Photos 08 to 14 and Video I1. -->

## Part 3: Rox

<!-- RESERVED FOR THE ROX-SPECIFIC PROJECT STORY. Media: Photos 15 to 18 and Video R1. -->

## Part 4: Sentry

<!-- RESERVED FOR THE SENTRY-SPECIFIC PROJECT STORY. Media: Photos 19 to 23 and Video S1. -->

## Part 5: Elastic

<!-- RESERVED FOR THE ELASTIC-SPECIFIC PROJECT STORY. Media: Photos 24 to 28 and Video E1. -->

## Part 6: Expo

<!-- RESERVED FOR THE EXPO-SPECIFIC PROJECT STORY. Media: Photos 29 to 34 and Video X1. -->
