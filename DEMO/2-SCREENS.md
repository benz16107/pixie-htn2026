# Every website screen

Use this as a map of what exists. The timed track cards choose a small subset.

| Screen | What is built and worth showing | Weakness or caveat | Best use |
|---|---|---|---|
| `/queue` | Scored and routed commercial submissions, filters, keyboard navigation, defects and book insights | The queue is a heuristic ordering, not a profit prediction. Use the Intact mode for the renter story. | Begin a commercial story, then open one case. |
| `/intact` | A separate renter-quote operations view, current demo totals, direct Expo entry and a visible three-step renter-to-advisor handoff | Values are local demo quotes. The page labels every price as illustrative. | Begin an Intact, Expo or Gemini story before moving to the phone. |
| `/intact/quotes` | Renter-only quote and referral queue with current receipt totals | It is an operations view, not a customer account or carrier policy system. | Find the case id created on the phone. |
| `/intact/cases/TQ-…` | Light-theme advisor case with the same receipt and sourced applicant facts | Demo prices and rules. Read the generated case id from the phone or queue. | Prove the referral handoff, then use its Federato link only if the judge asks about underwriting. |
| `/cases/138` | Provenance, score waterfall, what-if, decision-space view, sensitivity, precedent, event lanes, memory, broker reply and bounded human override | Dense. Some optional provider panels disappear when unavailable. Hypothetical values must not be confused with confirmed facts. | Default commercial case. Keep Score breakdown selected; use 3D only for a specific explanation. |
| `/cases/126` and `/cases/141` | Cross-case duplicate-account context, data issues and recall | Local Pixie recall is not evidence of a Backboard query. | Rox and Backboard. Compare the named insured and source labels. |
| Other commercial cases | Routed, bound, declined and open states; case navigation | Not every case has a recording. No recorded events does not prove a live zero-call run. | Questions about scope or failures. |
| Tenant case `/cases/TQ-…` | The dense underwriting view of a referred tenant case | This is the Federato side of the handoff, not the default Intact presentation. | A technical follow-up on shared engine and advisor review. |
| `/guideline` | Editable bands, thresholds and caps; presets; apply, diff and reset | Preset descriptions are examples against filed rules. The returned diff is the measured result. | Federato's clearest interactive moment. Apply one preset and read changed cases. |
| `/map` | H3 exposure cells, peril filters, case pins and cell tooltips and case navigation | Base-map tiles require the network. H3 aggregation is not a catastrophe-loss model. | Elastic or portfolio follow-up. |
| `/ask` | Natural-language query, generated query text, rows and returned row counts | Cached answers now say cached. The old first-number verification badge was removed because a number in prose may be a year or amount, not a row count. Use prepared queries. | Query/data-quality tracks. Explain linting and execution. |
| `/backtest` | Rule disagreement, declined cases, enrichment comparison, known misses and preregistration | Small retrospective synthetic sample, no proof of causality. | One result and one limitation, not a table-by-table tour. |
| `/live` | Queue sweep, focused recorded/live runs, addressed agent events, map, action draft, phone panel and demo beats | Many controls. The prominent replay is the safe five-minute path. Real agent runs can take minutes. | OpenAI or orchestration. Use Case run, then end the replay if time is short. |
| `/privacy`, `/terms` | Prototype/data-use disclosure and scope | No account system or self-service deletion. Reset cannot delete provider records or recall sent messages. | Available in navigation, not part of the pitch. |

## Controls that matter

- The PIXIE product switch opens either the Federato desk or Intact renter operations. Federato navigation uses **queue**, **guideline**, **portfolio**, **ask**, **backtest**, **demo**. Intact navigation uses **overview** and **renter quotes**.
- In Federato, `?` opens the keyboard help dialog. Escape closes it. Keyboard focus stays in the dialog while open.
- **reset demo** resets stored demo decisions/actions and restores filed rules. Use it between judges, not while another person is demonstrating.
- **reset this case** in the broker reply panel clears only that case's demo actions and human changes, preserving other cases and active rules.
- **Captured reply** is available only for case 138. It uses a captured email and recorded extraction, then performs verification and rescoring now. The panel labels the path.
- Action results distinguish **sent**, **dry**, **not connected**, **failed** and **already handled**. An HTTP success does not mean a message was sent.
- **RECORDED RUN**, **LIVE RUN** and **BUNDLED REPLAY** identify the event source. An API error elsewhere shows a retry screen instead of silently substituting sample cases.
- On narrow screens, dense panels stack and long tables scroll inside their panels. The laptop layout remains the primary presentation format.

## Leave these out of the default pitch

Do not open the record-screen control, every preset, every memory source, all the map perils, or the full 3D decision space in one demonstration. Those are supporting details. A broker reply that closes a missing fact or a guideline change with a visible diff is easier to understand than a fast tour of every tab.
