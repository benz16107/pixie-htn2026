# Devpost draft

## Pixie

Pixie is an underwriting desk that keeps uncertainty visible.

A commercial property submission rarely arrives complete. Many systems turn a blank into zero, produce one confident score, and hide the path to the answer. Pixie represents facts as known, estimated, or missing. The deterministic engine evaluates every plausible band for a missing fact and returns a score interval. The interface then shows which fact could change the decision, where every value came from, how similar cases were handled, and how much exposure already exists nearby.

Six specialist agents decide what to inspect and challenge the draft. They never supply the commercial score. Typed tools compute the numbers, and a guardrail checks every number in the final explanation against tool output before the text reaches the underwriter.

The same engine also powers a renter quote. The Expo app collects an address and three underwriting answers, then displays an itemized receipt whose lines name their source. A quote that needs review becomes a case in the underwriter desk with the original receipt preserved.

## What we built

- A FastAPI risk engine with provenance, missing-value intervals, live guidelines, what-if analysis, sensitivity, bounded overrides, and a reproducible backtest.
- A Federato commercial interface for the queue, case review, portfolio map, natural-language Ask, guideline changes, and agent replay.
- An Intact renter operations interface and an Expo app with a native map, haptics, reduced motion, on-device speech, PDF export, sharing, and referral handoff.
- An agent desk with specialist roles, addressed questions, typed conflicts, a challenger, budgets, and a numerical-claim guardrail.
- Elastic retrieval for precedent and concentration, with provider labels and a matching local fallback.
- Sentry traces and structured logs around each underwriting decision, including an alert when model prose contains an unsupported number.

## What we learned

The hardest part was defining a boundary between model judgment and commercial arithmetic. The useful split was concrete: code owns scores, prices, thresholds, totals, and source trails; models choose investigations and explain returned facts. That boundary made replay, testing, and fallback behavior easier to reason about.

The renter prices and the commercial bands are demonstrations, not carrier-approved products. The backtest is small and remains visible in the interface, including its misses. Pixie is a prototype of an inspectable workflow rather than a claim that the underwriting policy is correct.

## Stack

Python, FastAPI, Pydantic, SQLite, an agent runtime, Elasticsearch, Sentry, Next.js, React, TypeScript, Expo Router, React Native, and Toronto open data.
