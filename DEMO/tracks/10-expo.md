# Expo: five-minute demo

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md)

## Context and angle

This judge should see the native interaction work. The app is an Expo Go prototype with a shared API, not a released native build. Use the phone for most of the five minutes.

Opening: "The renter can get and share an explained quote from the phone, and a referral arrives in the same desk the underwriter uses."

## Prepare

Open Expo Go on a real device with a reachable EXPO_PUBLIC_API_URL. Check camera permission, the prepared address, PDF sharing and Reduce Motion before judging. Keep a completed quote ready. Keep `/intact/quotes` open for the final referral handoff.

## Timed script

| Time | Show and say |
|---|---|
| 0:00-0:30 | Introduce the renter task and show the app already open. |
| 0:30-1:35 | Enter the prepared address, inspect the map and answer the coverage questions. Show a native interaction rather than describing a list of packages. |
| 1:35-2:35 | Open photo inventory if its provider is warmed. Show the image-picker permission and editable result. Otherwise demonstrate manual contents entry and explain the optional camera route. |
| 2:35-3:45 | Show the itemised quote, bottom-sheet/inline receipt and PDF print/share action. Let the judge see the actual native sheet. |
| 3:45-5:00 | Show Reduce Motion behaviour you rehearsed, then the same referred case in `/intact/quotes`. Close on a consumer-native app, a separate operations surface and one shared API. |

## Service detail to know

Expo Router owns navigation. The code uses location, image picker, haptics, print/share and audio capabilities, with device-specific maps and a web fallback. Reanimated/reduced-motion paths are present, and the receipt remains readable inline. Sentry wraps the app, but Expo Go has native-module limits. A native/EAS release would require another delivery step.

## Evidence

Code: `app/app/`, `app/components/`, `app/package.json`, `app/app/_layout.tsx`. Inspect the device behaviour before claiming accessibility or permission flows. The audit in this folder tested the website, not a physical phone.

## Limitation to say

"This runs in Expo Go. We have not shipped to the App Store or verified native crash reporting and mobile session replay. Reduced-motion branches exist; a full accessibility audit is still future work."

## If it fails

Use the prepared phone recording. A browser fallback can demonstrate the API and quote, but is not evidence of camera, haptics or native share-sheet behaviour.

## Likely question

What is native here? "Location and image selection, haptics, audio and print/share are the app-specific interactions. The business rules remain on the shared API."
