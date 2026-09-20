# Questions and strong, supportable answers

## "Why does this need agents?"

"The engine can score a complete case on its own. Agents help when evidence is missing: they choose tools, join records, ask specialists and explain the resulting calculation. We do not spend model calls on cases where code can already settle the question."

## "Is the score confidence?"

"No. The endpoints are possible rule outcomes given the facts we have. A wider interval means unresolved inputs could change the decision. We have not calibrated it as a probability of loss."

## "What stops hallucinations?"

"Typed outputs constrain the model. Tools compute the commercial risk numbers. An output guardrail checks numeric prose against those tool results and replaces unsupported sentences. It cannot prove that the underlying data or every nonnumeric statement is correct."

## "Did you actually use this sponsor?"

Open the provider-labelled evidence named on the track card. Say whether this is a fresh provider call, cached provider output, a captured run, local fallback or code tested with a fake client. Those are different claims. A `memory` backend badge is a successful local fallback, not live Elastic. `queried:false` is not a Backboard retrieval.

## "Does it reduce losses or save time?"

"We have not measured either in production. The backtest shows where the filed guideline disagrees with historical decisions and how enrichment moves scores and ranks. The human-time benefit is a hypothesis we would test with underwriters."

## "Why would a carrier use this?"

"They can inspect a proposed decision, see which unresolved fact matters, change the rule and measure its effect on the current book. That makes it possible to challenge the workflow rather than trust a paragraph."

## "Is this production-ready?"

"It is a hackathon prototype over synthetic commercial data and demo renter rates. Production work includes access control, privacy and retention design, model and rule validation, provider reliability, and workflow integration with a carrier. The current local desk should be operated as a demo."

## "Are all the numbers computed without a model?"

"The commercial score and quote arithmetic are code. Gemini suggests editable inventory values; Backboard can return labelled model probabilities. Those are model outputs, and we keep them distinct from confirmed facts and computed decisions."

## Better pitch wording

| Avoid | Say instead |
|---|---|
| "The first system ever to do this" | "The distinctive part of this demo is the interval, the missing fact and the recomputation in one screen." |
| "We prevented these losses" | "The retrospective report identifies rule disagreements and includes known misses." |
| "Production autonomous underwriting" | "An inspectable underwriting prototype with a separate human override." |
| "Every integration is live" | "This workflow uses Gmail through Composio. These other toolkits have implemented paths but are not connected." |
| "The agents are running now" during replay | "This is the recorded agent run. The slider and rule editor recompute now." |
| "Our data shows customers love it" | "The next test is whether an underwriter can find the missing fact faster than in their current workflow." |
| "Tapbacks work end to end" | "The signed webhook path is tested. Real handset reaction delivery still needs confirmation." |
| "Gemini sets no input number" | "Gemini proposes inventory estimates for review; code computes the quote from the selected inputs." |

You can make the pitch clearer, shorter and more specific. Do not invent customers, timings, benchmark gains, live calls, certifications or sponsor usage. A labelled rehearsal scenario is fine; presenting it as measured evidence is not.
