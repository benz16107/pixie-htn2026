# Website audit and changes

Audited 2026-09-20 for a five-minute hackathon demonstration. Scope: every website route, representative commercial and tenant cases, source code and existing provider-verification notes. Physical phone interactions and fresh paid provider calls were outside this pass. The [screen inventory](2-SCREENS.md) covers the built functionality; the [track selector](4-PER-TRACK.md) chooses what to pitch.

## Overall assessment

The strongest part is the connection between provenance, a score interval, an editable hypothetical and a reproducible rule change. The broker-reply flow provides a clear before-and-after outcome. The backtest's named misses make the evaluation more useful than a single favourable aggregate. The dark desk design and compact numerical hierarchy suit a laptop demonstration and were retained.

The weakest parts were ambiguous live/replay states, misleading action success, too much material in each pitch, and layouts that overlapped or spilled beyond narrow screens. Provider readiness also varies substantially. Twelve names in a track list do not mean twelve equally strong service integrations.

The recommended commercial story is one incomplete case, one missing fact, one recomputation. Add only the service-specific workflow for that judge. Intact, Expo and Gemini should begin on the phone. Do not switch between both products at every table.

## Findings and implemented fixes

| Priority | Before | After |
|---|---|---|
| High | A live stream could include older run events; a failure could be mistaken for replay. | A live run must be accepted before streaming. SSE filters by run id, signals completion and displays failures. Recorded and bundled paths have explicit labels. |
| High | Replay completion, backward seeking and scripted timers could leave stale state. | Replay has an end, seek rebuilds event state, superseded starts are ignored and scripted timers clear on stop/unmount. |
| High | HTTP success could look like a successful external send. | Actions display sent, dry, failed, not-connected and deduped outcomes. The phone mirror says when no message was sent. |
| High | The broker-reply reset affected the whole demo. | A case-specific reset preserves other cases, active rules and the last digest association. Captured email is restricted to case 138. |
| High | Selecting a bundled replay case could treat an outbox error object as a list and crash. | Outbox reads validate response status and shape, and ignore results for a previously selected case. |
| High | A failed case/queue request silently substituted sample data. | Normal pages expose a retry state. The demo can use an explicitly labelled bundled recording. An unavailable API disables Run live. |
| High | A delayed what-if response could overwrite the reset result. | Request generations reject late responses; pending/error states replace stale results. The slider's width and bounds remain usable. |
| Medium | Guideline loading could continue indefinitely after a failed request. | Loading settles into a retry state. Preset descriptions are labelled examples; measured effects come from applying the edit. |
| Medium | Tables, offscreen tooltips, dense case panels and the toolbar created horizontal page overflow. | Narrow layouts stack, tables scroll within panels, the toolbar wraps and hidden tooltips no longer extend the document. |
| Medium | Ask treated large IDs/years as currency and used the first number in prose as a verification check. | Currency formatting depends on the column; IDs and years retain their meaning. The heuristic verification badge was removed. The result reports row counts and cached/live/sample origin. |
| Medium | Portfolio cells and submission pins used different H3 resolutions in peril filtering. | The page requests matching resolution-5 cells so its membership comparison is meaningful. |
| Medium | The API had a consumer view that the web queue ignored. | The queue has a Renters filter and honours `view=consumer`, so phone quotes can be found in the desk. |
| Medium | An open estimated premium could leave the broker-request button disabled. | The button recognises unresolved case facts even when the single-fact flipper list is empty. |
| Medium | Help was a visual overlay without a complete keyboard focus boundary. | A native modal dialog holds focus; Escape closes it. Background shortcuts do not run through the modal. Chart details are keyboard-focusable. |
| Medium | Privacy copy said no personal data was stored despite persisted addresses and optional messages/photos. | The page describes stored quote inputs, enabled integrations, caching and reset limits. It makes no unsupported deletion promise. |
| Medium | Startup relied on the broken default Node installation, and a public tunnel URL was hard-coded in its output. | Startup prefers the verified Node 22 install, includes uv's path, checks listening sockets and prints the configured public URL. |
| Low | Navigation labels and old pitch counts required interpretation. | Navigation uses Queue, Guideline, Portfolio, Ask, Backtest and Demo. The guide reads current results instead of reciting stale prices or totals. |
| Low | The recording control could be offered without a configured browser Sentry DSN. | The unconfigured build displays replay unavailable. API telemetry and browser telemetry are documented separately. |

## Craft review

Scores use 0 for broken, 2 for usable with material gaps, and 4 for thoroughly verified. They are review judgements, not benchmark or compliance results.

| Dimension | Before | After | Evidence and remaining gap |
|---|---|---|---|
| Accessibility | 1/4 | 2/4 | Focusable chart details, modal focus, explicit errors and brighter secondary text. Small data labels and some compact targets remain; no screen-reader or WCAG certification claim. |
| Performance and resilience | 2/4 | 3/4 | Explicit failures, scoped streams, timer cleanup and a shorter offline fallback path. No formal Lighthouse or load benchmark; external tiles/models remain network-dependent. |
| Responsive layout | 1/4 | 3/4 | Desktop 1280×800 and mobile 390×844 browser checks. Panels stack and document overflow was corrected. Dense tables intentionally scroll horizontally inside their panels. |
| Theme and visual consistency | 3/4 | 3/4 | Existing IBM Plex typography, dark surfaces and amber/jade/rust meaning retained. Secondary text is clearer. This pass did not introduce a second theme. |
| Integrity of displayed results | 1/4 | 3/4 | Replay/source labels, real send status, local/provider memory distinction and removal of the Ask verification heuristic. Provider truth still depends on inspecting the returned backend/status. |

The Impeccable static detector returned no findings for `web/src`. That is not proof that the rendered design has no issues. The browser pass found the layout problems above.

Ben's design checklist was also applied to the changed screens. The app has a working product demonstration, skeleton loading states, and privacy/terms links. It has no testimonial or pricing-card claims. The existing desk uses subtle corner rounding, status colours, some left rule markers and small hover feedback deliberately; these help distinguish case states and interactive rows. This pass preserved that established design instead of applying an unrelated aesthetic overhaul. Remaining dense typography is a conscious laptop-demo tradeoff, documented above.

## Verification

[Machine-readable results](verification/2026-09-20.json). The final production browser pass loaded eleven routes at both viewport sizes without page exceptions or document overflow.

- 180 API tests pass. New tests cover case-local reset isolation and live-run event scoping/completion. The existing replay test now recognises the explicit completion event.
- The production Next.js build and TypeScript check pass.
- The HTTP smoke check covers queue views, guideline, portfolio/peril filtering, Ask, Backtest, Demo, Privacy, Terms, scored/routed/tenant cases and an expected unknown-case 404.
- Eleven browser interaction checks pass: guideline failure/retry, failed send status, what-if late-response handling, captured reply/reset, help focus, Ask formatting/source, consumer queue, live-start rejection, run-id stream completion, replay end/backward seek, and dry digest status.
- Additional browser checks pass for applying/restoring a guideline preset, mounting the 3D decision view, and applying/undoing a bounded human override.
- API-down checks verify that the queue does not impersonate sample data and the labelled bundled demo remains available with live mode disabled.
- Mutating checks used a copied SQLite database and dry actions. No audit email, text message or fresh paid model run was sent.

The inspection captured every website screen at desktop and mobile sizes, then checked the corrected layout boundaries. The browser assertions and screenshots are local artifacts under `/tmp/pixie-audit/`; the regression tests remain in `api/tests/test_demo_safety.py` and the reusable HTTP check is `web/smoke.mjs`.

## Remaining work, ranked for the hackathon

1. Rehearse the exact phone inputs for Intact, Expo and Gemini. Web checks do not verify camera permissions, native sharing, haptics or Expo's configured API URL on Ben's device.
2. Open the real evidence for the next sponsor before sitting down. Gmail is connected; other Composio toolkits are not. The current web build lacks a public Sentry DSN, so use the verified API trace story unless browser telemetry is configured and verified separately.
3. Keep Backboard citation failure, real handset tapback uncertainty and Huawei's missing SDK usage in the pitch. Do not spend the last preparation window pretending those gaps are solved.
4. Have a local laptop recording. Cached data on macserver does not protect against losing the connection to macserver.
5. After the hackathon, validate the rules and tenant tariff, test fairness and underwriting outcomes, add production access controls and retention/deletion workflows, and conduct a full accessibility/performance review. These are production work, not claims this prototype can substantiate today.
