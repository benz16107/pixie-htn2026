# Active tracks

This is the honest claim matrix for the current build. The booth scripts live in [DEMO/tracks](../DEMO/tracks).

| Track | What Pixie uses | Demonstration | Limit to state |
| --- | --- | --- | --- |
| Federato | Snapshot ingestion, schema-aware queries, provenance, and case hydration | Trace case 138 to its source fields, then show the one missing fact that could change the decision | A fresh clone needs credentials and the machine-local snapshot for live data |
| Intact | Home and Auto lifecycle over deterministic tenant, Auto, driving, MCP, and recovery services | Present Quote, Decide, Protect, Recover, then open the matching Expo proof | Home pricing is tenant-only; Auto and route inputs are synthetic; no displayed price is an Intact offer |
| Rox | Defect detection, missing-value handling, and guarded query repair | Show duplicate, stale, or inconsistent records before the desk decides | The project detects a defined set of defects rather than every possible data error |
| Sentry | API tracing, structured logs, model-output alerts, web instrumentation, and Expo JavaScript instrumentation | Open one underwriting trace and the alert path for an unsupported number | Some account-side monitors and alert rules still require provider setup |
| Elastic | Hybrid precedent retrieval, decline terms, portfolio concentration, and Toronto geo queries | Show similar cases and nearby exposure with the backend badge visible | The UI can fall back to memory; do not call that Elastic |
| Expo | Router, Location, Expo UI, widgets, Live Activity, map, haptics, PDF, share, speech, and referral handoff | Run Auto comparison and drive context, or the complete tenant quote | Native UI and widget extensions require a development build; Expo Go is the labelled fallback |

Removed tracks are absent from the current navigation and judging guide.
