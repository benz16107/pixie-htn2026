# In-person demo scripts

These scripts cover General, Federato, Rox, Elastic, and Expo. Each script targets about 3 minutes and 30 seconds. Stop after the closing sentence and use the remaining time for questions.

Text in brackets is an action. Text in quotation marks is spoken.

## General judging

### Prepare

- Open the submission queue.
- Keep case 138 ready.
- Reset the premium what-if.
- Keep the portfolio and validation pages loaded in other tabs.

### 0:00 to 0:20. State the idea

[Start on the submission queue.]

"Pixie is an insurance decision system with one rule. AI can choose what to investigate and explain the result, but typed code owns every insurance number. I will show that on one incomplete commercial submission."

### 0:20 to 0:45. Open the case

[Point to the ranked queue, then open case 138, Lumen Data Works.]

"The queue puts unresolved cases first. Case 138 matters because one missing fact can change the underwriting decision."

### 0:45 to 1:25. Explain the range

[Point to the 30 to 75 appetite range and the estimated premium.]

"The premium is estimated rather than confirmed. Pixie does not replace that gap with a favorable default. The engine evaluates every rule band supported by the evidence, so this case stays between 30 and 75. That range crosses a decision threshold. It is rule-based uncertainty, not a confidence interval."

### 1:25 to 1:55. Show the evidence

[Open the source or facts panel. Point to the insured-value source and the premium method.]

"The 2.073 million dollars of insured value comes from the linked building record. The premium estimate comes from 27 bound property comparisons. Every value keeps its source, and the estimated value remains visibly unconfirmed."

### 1:55 to 2:35. Run the what-if

[Enter a confirmed premium of $75,000. Show the recomputed result of 91 and accept.]

"The question is whether a confirmed premium changes the answer. With a hypothetical premium of 75,000 dollars, the same engine returns 91 and accept. This is a scenario. It does not overwrite the submission."

[Reset the scenario.]

"Resetting restores the original record and its 30 to 75 range."

### 2:35 to 3:05. Add portfolio context

[Open the prepared portfolio view or nearby-exposure panel.]

"Pixie also asks how much active insured value already sits near this location. The portfolio service groups exposure into H3 cells and keeps the data source and units visible. The model does not add these totals itself."

### 3:05 to 3:30. Close

[Return to case 138.]

"Pixie turns an incomplete submission into a specific next action: confirm the premium before deciding. The agent investigates and explains. Deterministic services calculate the score, the scenario, and the portfolio totals."

Stop here for questions.

### Keep ready for questions

- The rulebook and score calculation.
- The known $629,200 historical miss.
- The Intact consumer app and MCP quote page.
- The recorded agent and query history.

## Federato

### Prepare

- Open case 138.
- Expand the linked source evidence and recorded query.
- Reset the premium what-if.
- Load one scored enrichment or nearby-exposure result.

### 0:00 to 0:20. Name the Federato workflow

[Start on case 138.]

"Federato asks for an agent that ingests submissions, adds real-world context, compares the case with carrier appetite, and produces an explainable action. Case 138 shows that full path."

### 0:20 to 1:05. Prove ingestion

[Open the source trail and recorded Federato query.]

"Pixie reads Federato's supplied schema and follows the links between the submission, insured, location, building, policy, and claims records. This query records its purpose, selected fields, and returned rows. That is how Pixie resolves the 2.073 million dollars of insured value instead of asking a model to guess the join."

### 1:05 to 1:45. Apply appetite

[Open the calculation and point to the 30 to 75 range.]

"The commercial-property bands come from Federato's supplied criteria. Pixie's points, caps, and thresholds are explicit implementation choices. Because the premium is not confirmed, the engine evaluates every supported band and returns a 30 to 75 appetite range."

### 1:45 to 2:20. Show enrichment

[Show one nearby-exposure or scored hazard result with its source.]

"The agent can also request external and portfolio context. This result adds nearby active exposure while preserving its source and units. Scored enrichment can affect ranking. The newer climate and county map layers are investigation context only."

### 2:20 to 3:00. Make the result actionable

[Enter a premium of $75,000 and show 91 and accept.]

"The interface identifies the fact that can settle the case. A hypothetical confirmed premium of 75,000 dollars recomputes the result as 91 and accept. The scenario uses the same engine and never edits the filed submission."

[Reset the scenario.]

### 3:00 to 3:30. Close with the boundary

[Return to the source-labelled case result.]

"The underwriter now knows what to request, why it matters, and how the answer changes the decision. This demo uses Federato's supplied synthetic data and schema, not a production Federato account. The range is an appetite result, not a probability of loss."

Stop here for questions.

### Keep ready for questions

- The ranked queue and the 38 property submissions.
- The full rulebook.
- The small backtest and known miss.
- The Challenger and bounded human adjustment.

## Rox

### Prepare

- Open cases 126 and 141 in separate tabs.
- Open the duplicated-insured source rows.
- Load the prepared Ask question and its visible attempts.
- Keep the final review action visible.

### 0:00 to 0:20. State the data problem

[Start on case 126.]

"Rox asks for an LLM agent that can work through messy business data and take a useful action. Pixie first checks whether the records support a confident answer."

### 0:20 to 1:05. Show the conflict

[Show case 126, then case 141. Point to the shared insured and the two submission IDs.]

"Cases 126 and 141 come from different submissions, but they point to the same insured. Pixie raises a duplicate-account issue and keeps both source rows beside the warning. It does not silently choose one broker or merge the records."

### 1:05 to 2:15. Show the LLM operation

[Open the Ask page and run the prepared question. Show the proposed query, validation, attempts, and returned rows.]

"The LLM turns an underwriter's question into a Federato query and explains why it chose those fields. Deterministic code checks the resource names, fields, expansions, and filters before the request can run. If the query fails validation, the next attempt receives the exact error. The model can propose a correction, but it cannot bypass the checker."

### 2:15 to 2:55. Show the action

[Return to the duplicate-account issue and next action.]

"The result is not a cleaner paragraph over uncertain data. Pixie blocks the case for review, identifies the conflicting records, and asks the underwriter to resolve ownership before acting. The source system remains unchanged."

### 2:55 to 3:25. Close with the boundary

[Hold on the issue and evidence.]

"Pixie combines an LLM operation with bounded validation and a traceable action. It detects a defined set of incomplete and conflicting records. It does not claim general entity resolution, and it does not use a Rox SDK."

Stop here for questions.

### Keep ready for questions

- A rejected or repaired Ask attempt.
- The stale-submission and requested-limit examples.
- The rule-based uncertainty range for a missing value.
- The local recall boundary. Recall cannot provide a score or price.

## Elastic

### Prepare

- Open case 138 with verified Elastic precedent results.
- Confirm that the backend badge says `elastic`.
- Load the portfolio map or nearby-exposure response.
- Keep the registered Agent Builder tools or saved authenticated response ready.

### 0:00 to 0:20. Ask the two questions

[Start on case 138.]

"Before writing another risk, Pixie asks Elastic two questions. What happened on comparable cases, and how much active exposure already sits near this location?"

### 0:20 to 1:20. Show hybrid retrieval

[Open the precedent results and point to the `elastic` badge and recorded outcomes.]

"These are indexed cases with recorded outcomes from the synthetic book, not examples written by the model. Elastic combines BM25 and semantic candidates with reciprocal-rank fusion, then reranks the result. The agent receives the returned records and their sources."

### 1:20 to 2:20. Show a non-search operation

[Open the portfolio map or nearby-exposure response.]

"Elastic also performs the nearby-exposure calculation. A geographic query excludes the current insured, finds active property exposure near the location, and sums the insured value. H3 groups the result for the map. The model does not invent or add the portfolio total."

### 2:20 to 2:55. Show the agent connection

[Show the prepared Agent Builder tool list or authenticated response.]

"Pixie also registered three Agent Builder tools for concentration, declined-peril counts, and insured-value breakpoints. The agent can request this context, while the deterministic underwriting engine still owns the appetite score."

### 2:55 to 3:25. Close with the action and boundary

[Return to the case result.]

"Elastic gives the underwriter comparable outcomes and portfolio context that support the next review action. If a badge says memory or local, that request did not use Elastic. Similarity and cohort terms show association in a small sample. They do not prove causation."

Stop here for questions.

### Keep ready for questions

- The five verified indices and their document counts.
- The exact hybrid query.
- `significant_terms` and percentile results.
- The three registered Agent Builder tools.
- The explicit statement that Pixie has no Elastic Workflow.

## Expo

### Prepare

- Open the installed iOS development build in the simulator.
- Seed the belongings example or prepare one saved item.
- Reset Drive Score.
- Confirm that the Home Screen widget and Lock Screen Live Activity can display.

### 0:00 to 0:20. Keep the product on the phone

[Start on the app's Home screen.]

"Pixie is an Expo and React Native app for Home and Auto insurance tasks. The navigation uses customer language: Home, Compare, Insights, and Community. I will complete one task, then show how an active drive leaves the app."

### 0:20 to 1:05. Complete one customer task

[Open **Your belongings**. Use the furnished-room example or one prepared item, then carry the inventory total into coverage.]

"A tenant can record belongings by room and enter the replacement value. The inventory stays in local app storage. Pixie carries that total into the tenant coverage flow, so the customer does not have to guess a contents amount before seeing the estimate."

### 1:05 to 1:45. Start Drive Score

[Open Drive Score and run the stationary Toronto sample.]

"Drive Score starts only after the customer asks for it. During a real drive, Expo Location supplies foreground samples. For this demo, I am using the labelled stationary Toronto sample instead of pretending the simulator is moving. Pixie separates driving behavior from road context and stores no route."

### 1:45 to 2:20. Show the Home Screen widget

[Leave the app and show the installed Pixie Drive Score widget.]

"The same active score now appears in a real Home Screen widget. This is the installed iOS development build, not an in-app preview."

### 2:20 to 2:50. Show the Live Activity

[Open the Lock Screen and point to the Live Activity.]

"The Lock Screen Live Activity carries the score, speed, and road context outside the app during the drive. Expo Widgets requires this development build and does not run in Expo Go."

### 2:50 to 3:25. Finish and close

[Return to Pixie, end the drive, and hold on the privacy explanation.]

"Ending the drive stops the foreground session and the Live Activity. Drive Score is coaching only. It cannot change the quote or premium. What you saw ran in the iOS Simulator, not on a physical iPhone or an App Store build."

Stop here for questions.

### Keep ready for questions

- Image Picker and local file storage.
- The itemized tenant receipt, Speech, Print, and Sharing.
- The Expo Router route structure.
- The SwiftUI and Jetpack Compose drive controls.
- The Android boundary. Do not claim a tested Android device build.

## If a live step fails

- General or Federato: use the prepared case 138 state and saved portfolio result.
- Rox: keep the two source rows on screen and show the saved Ask attempts.
- Elastic: show the saved authenticated Elastic response. Do not substitute a `memory` result as track proof.
- Expo: keep the foreground app live and use the captured native widget and Live Activity images. Do not call the in-app previews native proof.

## Rehearsal rule

Rehearse each script until the close lands by 3:30 without rushing. If a step takes longer than expected, skip the next supporting screen. Never remove the final action or the claim boundary.
