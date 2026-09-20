# Intact: five-minute demo

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md)

## The pitch

"A renter confirms five prefilled choices on one screen, sees exactly why the price changed, and reaches an advisor with the same receipt when the case needs judgment."

Intact is the second main product demo. Use the phone for the customer story and the Intact web mode for the operations handoff.

## What we built for this track

- A three-stage renter journey: Address, Coverage, Estimate.
- A fast path that skips the optional map and opens one prefilled coverage review.
- Editable unit level, contents, deductible, liability, and five-year claims history.
- Visible price effects beside each choice before the customer requests an estimate.
- An itemized receipt whose lines expand to show their source and multiplier.
- A PDF/share action for ready estimates and an exact advisor-case handoff for referrals.
- An Intact operations view with the original applicant answers and receipt preserved.

## What comes from the Intact challenge

The track is called **"The Quoting Interface of the Future."** Its eligibility line asks for "modern and new ways to get car and tenant insurance via AI." Judges want a working quote flow where the user supplies relevant information and receives a recommendation, estimate, or next step. They also score user experience and accessibility.

The brief says tenant insurance, not general homeowner insurance. Keep the judged property story about renters. Owner-occupied home insurance is a future extension.

Pixie is designed around faster access to renter insurance and a safe handoff when automation should stop. It does not use an Intact customer API or an Intact tariff. The displayed price is a labelled prototype estimate.

## Why it fits Pixie

The commercial desk already keeps facts, sources, and rules separate. The renter app reuses that trusted core with its own Toronto data and renter rules. The interface, questions, and price model remain separate from Federato.

## Five-minute flow

| Time | Show and say |
|---|---|
| 0:00-0:30 | Start on `/intact`. Explain that this is a separate renter operations product over the same rule and provenance engine. |
| 0:30-1:20 | On the phone, select 180 Queen St W and choose **Review my coverage**. Point out that the neighbourhood map is optional. |
| 1:20-2:15 | Review the five prefilled choices on one screen. Change contents or deductible and read the price effect beside it. |
| 2:15-3:10 | Price the coverage. Expand one receipt line, show its source, then use **Save and share my receipt**. |
| 3:10-4:10 | Start the prepared basement example. Show the referral reason and open the exact advisor handoff. |
| 4:10-5:00 | Open the same case in `/intact/quotes`. Show that the address, answers, price receipt, and referral reason survived the handoff. |

## Know these details

`tenant.py` computes the price in cents and applies the referral rules. Two or more claims in five years, or the prepared basement flood-study case, goes to an advisor. The Toronto pack supplies the location data. The API stores the quote once so the Expo app and web desk read the same case.

## Say this limitation

"The rates are prototype rates. This is not an Intact price or offer, and we have not completed actuarial validation, fairness assessment, or policy issuance."

## If it fails

Use one of the three bundled addresses and state that it is a saved sample. Open the matching `/intact/cases/TQ-...` page. Do not claim the sample just created a new server case.
