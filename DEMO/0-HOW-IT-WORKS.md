# How Pixie works

## Commercial desk

A submission arrives with known facts, estimates, and blanks. Pixie keeps those states separate and attaches a source to every value. The rule engine returns a score interval because an unknown fact may fit more than one rule band.

Case 138 is the cleanest example. Its premium is missing. The page shows how the current evidence produces the interval, which threshold the interval crosses, and what confirmed premium would move the decision. The what-if slider is hypothetical and does not change the stored case.

Six agents decide what to inspect, ask each other targeted questions, and challenge the draft. Tools compute the numbers. The model writes the reasoning. A guardrail checks every number in that reasoning against tool output before the UI displays it.

The guideline editor changes the written rules and shows the resulting portfolio diff. A human override is a separate adjustment of at most five points and requires a reason.

## Renter quote

The Expo app collects an address, pre-fills five coverage choices, and lets the renter review them on one screen. The neighbourhood map is optional. The server applies the renter rules and returns an itemized annual estimate in cents. Every receipt line names its source. The displayed price is explicitly illustrative.

If the answer needs judgment, the quote is saved as a case that the underwriter can open in the desk. The receipt does not change during the handoff.

## Provider boundary

| Provider | Actual role | What to point at |
| --- | --- | --- |
| Federato | Submission schema, records, and source fields | Provenance on case 138 and Ask query attempts |
| Elastic | Similar-case retrieval and nearby portfolio exposure | Provider badge, precedent, and map |
| Sentry | Traces, logs, and unsupported-number alerts | One decision trace |
| Expo | Native renter quote interaction | Phone flow, receipt, PDF, and referral |

Replay, cache, fixture, local, and memory results are all labelled. Say which path is on screen.
