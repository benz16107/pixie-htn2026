# Devpost draft

## Pixie

Pixie is an underwriting desk and consumer insurance app that keep uncertainty visible.

A commercial property submission rarely arrives complete. Many systems turn a blank into zero, produce one confident score, and hide the path to the answer. Pixie represents facts as known, estimated, or missing. The deterministic engine evaluates every plausible band for a missing fact and returns a score interval. The interface then shows which fact could change the decision, where every value came from, how similar cases were handled, and how much exposure already exists nearby.

Six specialist agents decide what to inspect and challenge the draft. They never supply the commercial score. Typed tools compute the numbers, and a guardrail checks every number in the final explanation against tool output before the text reaches the underwriter.

The same engine also powers a consumer lifecycle across Quote, Decide, Protect, and Recover. The Expo app prices a Toronto tenant scenario or compares three synthetic Auto listings, then lets the customer test one choice, record prevention work, and prepare recovery evidence. A tenant quote that needs review becomes a case in the underwriter desk with the original receipt preserved.

## What we built

- A FastAPI risk engine with provenance, missing-value intervals, live guidelines, what-if analysis, sensitivity, bounded overrides, and a reproducible backtest.
- A Federato commercial interface for the queue, case review, portfolio map, natural-language Ask, guideline changes, and agent replay.
- An Intact lifecycle presentation and Expo Home and Auto app with Router navigation, a native map, haptics, reduced motion, on-device speech, PDF export, sharing, and referral handoff.
- Native Expo UI controls for SwiftUI and Jetpack Compose, plus an iOS drive-context widget and Live Activity.
- A stateless driving-context service that separates behavior from synthetic route exposure, keeps provenance visible, and stores no coordinates.
- A privacy-limited MCP server that can compare vehicles, estimate tenant or Auto scenarios, prepare unsent drafts, read limited policy summaries, assess drive context, and prepare recovery.
- Pixie Recover, powered by the separate CrashClip prototype, for corroborated post-incident evidence and insurer handoff.
- An agent desk with specialist roles, addressed questions, typed conflicts, a challenger, budgets, and a numerical-claim guardrail.
- Elastic retrieval for precedent and concentration, with provider labels and a matching local fallback.
- Sentry traces and structured logs around each underwriting decision, including an alert when model prose contains an unsupported number.

## What we learned

The hard boundary is between model judgment and insurance arithmetic. Code owns scores, prices, thresholds, totals, and source trails. Models choose investigations and explain returned facts. That split makes replay, testing, privacy, and fallback behavior easier to inspect.

The tenant and Auto prices, commercial bands, and route zones are demonstrations, not carrier-approved products. Home pricing is tenant-only. Driving context is coaching-only and cannot affect a premium. The backtest is small and remains visible in the interface, including its misses.

## Stack

Python, FastAPI, Pydantic, SQLite, MCP, an agent runtime, Elasticsearch, Sentry, Next.js, React, TypeScript, Expo Router, Expo UI, expo-widgets, React Native, and Toronto open data.
