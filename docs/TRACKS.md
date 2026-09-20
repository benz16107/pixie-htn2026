# Active tracks

This is the honest claim matrix for the current build. The booth scripts live in [DEMO/tracks](../DEMO/tracks).

| Track | What Pixie uses | Demonstration | Limit to state |
| --- | --- | --- | --- |
| Federato | Snapshot ingestion, schema-aware queries, provenance, and case hydration | Trace case 138 to its source fields, then show the one missing fact that could change the decision | A fresh clone needs credentials and the machine-local snapshot for live data |
| Intact | Shared engine with renter rules and Toronto data | Complete a phone quote and show a referral in the desk | The price is illustrative and is not an Intact offer |
| Rox | Defect detection, missing-value handling, and guarded query repair | Show duplicate, stale, or inconsistent records before the desk decides | The project detects a defined set of defects rather than every possible data error |
| OpenAI and Codex | Agents SDK specialists, typed tools, challenge step, replay, and `verify_numbers` | Follow one case through the event lanes and show the number guardrail | Replay is recorded; state when it is selected |
| Sentry | API tracing, structured logs, model-output alerts, web instrumentation, and Expo JavaScript instrumentation | Open one underwriting trace and the alert path for an unsupported number | Some account-side monitors and alert rules still require provider setup |
| Elastic | Hybrid precedent retrieval, decline terms, portfolio concentration, and Toronto geo queries | Show similar cases and nearby exposure with the backend badge visible | The UI can fall back to memory; do not call that Elastic |
| Expo | Router flow, native map, haptics, reduced motion, PDF, share, speech, and referral handoff | Run the renter quote on a phone | Expo Go does not prove native crash reporting or mobile replay |
| Backboard | Underwriter-scoped memory, document retrieval, and labelled System One judgments | Show remembered preferences and a provider-labelled judgment | A probability may route work; it never becomes a price or commercial score |
| Huawei openJiuwen | No direct SDK use | Explain the visible specialist collaboration only if the track accepts architecture demonstrations | Pixie uses its own scheduler over the OpenAI Agents SDK |

Removed tracks are absent from the API, both interfaces, mobile app, dependencies, fixtures, and current documentation.
