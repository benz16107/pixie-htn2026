# How Pixie works

## The insurance vocabulary

A submission is a request for insurance. The insured owns the property; a broker sends the request to a carrier. The carrier's underwriter decides whether it fits the carrier's appetite. TIV means total insured value. Premium is the price paid for coverage. Incurred losses are recorded claims costs. A referral means a human needs to review the case. A quote or an "accept" result in this prototype is not a bound insurance contract.

Federato supplies an underwriting workflow and synthetic commercial data for this challenge. Intact is the consumer-insurance context for the renter flow. Keep these audiences separate when pitching.

## The commercial calculation

`rules/property_2025.yaml` is the filed rule set. `/guideline` exposes eight factors, score thresholds and the hard-fail cap. The filed thresholds are 45 and 70, and the cap is 30. Edits in the website become active rules, so use the current screen as the source of truth.

1. Each fact carries a value and provenance: known, estimated or missing. The rule maps possible values into target, acceptable and not-acceptable bands.
2. Code scores all applicable possibilities. An unknown produces a range of possible scores. This is an uncertainty interval over rule outcomes, not a calibrated probability.
3. Known hard failures cap the result. An uncertain possible hard failure lowers the lower bound without pretending the fact is confirmed.
4. Cached hazard data and nearby portfolio exposure contribute bounded adjustments. Read their actual sources and amounts from the waterfall.
5. Code compares the interval with the decision thresholds. A range that crosses a boundary remains open. Other lines are routed rather than squeezed into a property rule.
6. The API ranks scored cases before routed cases, by descending interval midpoint and value at stake. The website additionally groups undecided cases first. This is a prioritisation heuristic, not predicted profitability or broker winnability.

The what-if slider asks how the engine would score a confirmed alternative input. It does not modify the real case. A broker reply can modify it only through extraction, source verification and an explicit apply. An underwriter override is a separate, reasoned adjustment bounded to five points. It does not rewrite the original engine result.

## What the agents do

The desk has Lead, Intake, Appetite, Hazard, Portfolio and Challenger roles. Code first determines whether more investigation can matter. The Lead can raise the depth, not reduce the code's minimum. Specialists use typed tools and can address questions to one another. The event ledger records asks, answers, findings, assessments, objections and resolutions. The Challenger tests a proposed action; the Lead must answer its risks.

OpenAI Agents SDK runs the model turns. Structured outputs constrain their shape. A numeric output guardrail checks prose against values returned by tools. A failed sentence gets a deterministic fallback. That check cannot prove the source data or all nonnumeric prose correct. A guardrail tripwire can also undercount the failed turn's token cost. The cost display is diagnostic, not an invoice.

The replay screen reads stored events. It does not make new model calls. **Run live** starts a new run and streams only that run's events. API-offline mode explicitly reports that it is replaying. A failed live connection displays an incomplete result instead of silently presenting a recording as live.

## The renter flow

The Expo app collects a Toronto address and coverage answers. The Toronto pack supplies local risk data; separate tenant rules compute the quote and an itemised receipt. The receipt uses code and integer-cent arithmetic. A referred tenant quote appears in the desk queue; approved quotes are available under the consumer view.

Gemini can suggest a photo inventory and item-value ranges. Those estimates are model-generated inputs that the renter reviews. Code sums them and computes the final price. Do not say that every number anywhere in Pixie is model-free. Backboard probabilities are also explicitly model judgements. Neither a probability nor model prose directly supplies the commercial engine's score.

The tenant tariff is a documented demo tariff, not an Intact rate, actuarial model or insurance offer. A visible place citation explains the source of a context note; it does not validate an insurance price.

## What each service contributes

| Service | Actual job | Boundary |
|---|---|---|
| Federato data/query adapter | Snapshot, typed joins, query linting and provenance | Snapshot access is not a deployed carrier integration. |
| OpenAI | Agent turns, structured output, guardrails, sessions and traces | Code owns the calculations. |
| Elastic | Precedent retrieval, nearby exposure and book analytics | Read the `elastic` versus `memory` backend badge. |
| Composio | Gmail actions and broker-email ingestion | Other toolkit connections must be checked individually. |
| Linq | iMessage digest, receipt messages and inbound commands | Real handset tapback delivery remains unverified. |
| Sentry | Errors, decision traces, logs and semantic-number alerts | A configured monitor is different from a scheduled job or proven alert delivery. |
| Backboard | Provider memory and typed System One judgements | Pixie's local recall is separate; document citations remain unreliable. |
| Gemini | Vision inventory, grounded context, speech and arithmetic-check tool | New uncached inputs require a working API. |
| Expo | Native phone interactions over the shared API | Current delivery is Expo Go, not an App Store release. |

## What the evaluation says

`eval/backtest.json` is an as-of replay over the supplied data. The website presents the denominators, exclusions, preregistration and known misses. The filed report flags 17 of 27 bound property policies on the premium rule. That is a disagreement with historical decisions, not proof that those policies should have been declined or that losses would have been avoided.

The enrichment comparison records zero decision-tier changes on 38 scored submissions. It still measures score and ranking changes. Show the result as it is. The named miss PR-2026-1081 remains in the report because an apparently acceptable case can still lose money. This prototype has no demonstrated predictive loss improvement or fairness validation.
