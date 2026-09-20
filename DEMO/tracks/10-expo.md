# Expo: five-minute demo

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md) · [Implementation notes](../../docs/EXPO.md)

## The pitch

"Expo lets the renter move from an address to an explained, shareable estimate in three stages, with native help for location, speech, haptics, and PDF sharing."

Expo is the mobile implementation of the Intact product. Keep most of this demo on the phone and show native interaction rather than a package list.

## What we use from Expo

- Expo Router for the Address, Coverage, Estimate flow and edit loops.
- Expo Location for current-location fill and geocoding.
- Haptics for choice and decision feedback.
- Speech for an on-device spoken quote summary built only from receipt numbers.
- Print and Sharing for an itemized PDF receipt and the native share sheet.
- Web Browser for the exact web receipt and advisor-case handoff.
- Reanimated with the system Reduce Motion setting, safe-area handling, and React Native accessibility roles.

## Why it fits Pixie

The API owns insurance arithmetic. Expo turns the same quote into a fast customer task and uses device capabilities only where they help the renter complete or keep it. The Intact web view receives the same stored case when human review is needed.

## Five-minute flow

| Time | Show and say |
|---|---|
| 0:00-0:35 | Open the app on the Address stage. Show the three-stage progress and the prepared Toronto addresses. |
| 0:35-1:25 | Use the address or current-location action. Take the fast path to Coverage and explain that the map is optional. |
| 1:25-2:20 | Change contents or deductible on the single review screen. Let the judge see haptic choice feedback and the price effect. |
| 2:20-3:30 | Open the Estimate. Expand a receipt line, play the spoken summary, then create and share the PDF. |
| 3:30-4:25 | Run the prepared basement referral and press **Open the advisor handoff**. |
| 4:25-5:00 | Show the same case in the Intact web view. Close on one API, a native customer flow, and a preserved handoff. |

## Know these details

The app has no camera or photo-inventory flow. The real customer path is address, optional map, one coverage review, estimate, receipt, speech, PDF/share, and referral. The receipt remains readable in the app even if sharing is unavailable.

## Say this limitation

"This runs in Expo Go. We have not shipped an App Store build, and Expo Go does not prove native Sentry crash reporting or mobile replay. The insurance rates are still prototype rates."

## If it fails

Use a bundled address and state that it is a saved sample. A web render can prove the React Native flow and API shape, but it is not proof of haptics, native speech, or the share sheet.
