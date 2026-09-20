# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Pixie has two connected users. Commercial underwriters use the Federato desk to triage property submissions, inspect evidence, test guideline changes, and record a decision. Toronto renters use the Intact mobile flow to understand how an illustrative tenant-insurance price was calculated. An advisor receives renter cases that the rules will not auto-price.

## Product Purpose

Pixie makes insurance decisions inspectable. It shows which facts are known, estimated, or missing; computes scores and prices in code; and keeps the source of every value visible. Success in the hackathon demo means a judge can follow one commercial decision or one renter quote from input to result in five minutes.

## Positioning

The commercial desk and renter app call the same region-agnostic assessment engine with separate rules and data packs. Models investigate and explain, while deterministic code computes every score, premium, estimate, and total.

## Operating Context

The Federato experience is a dense desktop workspace used during commercial underwriting. The Intact experience includes a consumer Expo app and a web operations dashboard for quote receipts and advisor referrals. The project must remain usable during unreliable hackathon Wi-Fi, so external enrichment is cached and recorded demo paths remain available.

## Capabilities and Constraints

- The web app contains queue, case, guideline, portfolio, ask, backtest, and recorded demo views.
- The Expo app collects an address and three tenant answers, shows Toronto risk context, can estimate contents from photos, and returns an itemised quote or advisor referral.
- A renter referral can open in the commercial underwriting desk without duplicating the scoring engine.
- Missing data never counts as a pass. Every value keeps its provenance.
- Illustrative tenant prices must remain labelled as Pixie's documented model, not an Intact price or offer.
- The five-minute track demos must work from cached or bundled evidence when a live sponsor service is unavailable.

## Brand Commitments

The user-facing product name is Pixie. Federato and Intact are distinct product modes, not a blended interface. Federato should read as an underwriting workspace. Intact should read as a renter-facing insurance service and an advisor operations view.

## Evidence on Hand

The repository contains recorded commercial runs, bundled cases, Toronto risk data, itemised tenant receipts, a pre-registered backtest, API tests, web screenshots, Expo screenshots, and per-track demo scripts. The sample insurance book and tenant pricing constants are synthetic or illustrative and must not be presented as carrier production results.

## Product Principles

1. Show the source beside the number.
2. Separate consumer clarity from underwriter density.
3. Make the handoff between renter and advisor visible.
4. Keep every demo claim tied to evidence in the repository.
5. Prefer a reliable recorded path when a live integration is not needed to prove the mechanism.

## Accessibility & Inclusion

Controls require visible focus or pressed states, readable contrast, screen-reader labels, safe-area handling, and reduced-motion support. The renter app does not use age, sex, income, ethnicity, or credit in pricing.
