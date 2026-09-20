# Expo: five-minute demo

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md) · [Implementation notes](../../docs/EXPO.md)

## The pitch

"Expo turns one insurance relationship into a native customer product. Router holds the four stages, native controls keep each platform familiar, and an iPhone widget and Live Activity keep drive context visible outside the app."

Expo is the mobile implementation of the Intact product. Keep this demonstration on the phone. Use the web only to introduce the four-stage story or show an advisor handoff.

## What we use from Expo

- Expo Router for Quote, Decide, Protect, Recover, and the supporting tenant and Auto screens.
- Expo Location for explicit current-location actions, geocoding, and coarse driving context.
- Expo UI for a SwiftUI action on iOS and a Jetpack Compose action on Android.
- expo-widgets for the iOS drive-context home-screen widget and Live Activity.
- Haptics for quote choices and decision feedback.
- Speech for an on-device spoken quote summary built only from receipt numbers.
- Print and Sharing for the itemized PDF receipt and native share sheet.
- Web Browser for the advisor handoff and Pixie Recover launch.
- Reanimated with Reduce Motion, safe-area handling, and React Native accessibility roles.

## Why it fits Pixie

The API owns quote and coaching arithmetic. Expo handles the customer task, platform navigation, permissions, and glance surfaces. The app requests location only after a customer action. It rounds drive-context points before the API call, stores no route, and keeps a deterministic bundled fallback for the booth.

## Five-minute flow

| Time | Show and say |
| --- | --- |
| 0:00-0:35 | Open the four-tab lifecycle. Switch between Home and Auto once. "The same app stays with the customer after the quote." |
| 0:35-1:25 | On Auto Quote, compare the Corolla, CX-5, and IONIQ 5 under one driver profile. Point to the API or bundled source label. |
| 1:25-2:05 | Open Decide and change one Auto scenario. Explain that the what-if does not overwrite the saved baseline. |
| 2:05-3:25 | Open Protect, then Drive context. Start the drive, show the behavior, route-context, and composite coaching scores, and show the source for each factor. |
| 3:25-4:10 | On an iOS development build, leave the app and show the widget and Live Activity. On Android, point out the Jetpack Compose action. |
| 4:10-4:45 | Open Recover and prepare the evidence bundle. Launch Pixie Recover if the connection is ready. |
| 4:45-5:00 | State the native-build and synthetic-data limitations below. |

## Tenant alternative

If the judge asks for the complete priced path, use Home. Enter a Toronto address, review the five tenant inputs, inspect the receipt, play the summary, share the PDF, and open an advisor referral. Protect adds the reviewed room-inventory demo.

## Know these details

- `DrivingNativeAction.ios.tsx` uses Expo UI SwiftUI.
- `DrivingNativeAction.android.tsx` uses Expo UI Jetpack Compose.
- `driving-surfaces.ios.tsx` defines the widget and Live Activity with expo-widgets.
- The Expo Go and web path labels the native extension as a development-build feature.
- The Auto and drive screens try the shared API first and use the matching bundled demo model offline.

## Say this limitation

"The widget, Live Activity, SwiftUI, and Jetpack Compose surfaces require native development builds and do not run inside Expo Go. Auto prices and route zones are synthetic. Drive context is coaching-only and cannot change the quote or premium."

## If it fails

- If the API is unreachable, point to the bundled-demo label and continue.
- If the native build is unavailable, use the foreground drive screen and show the native source files. Do not claim that Expo Go ran the widget or Live Activity.
- If location is denied, use the synthetic Toronto route. The quote and driving demo remain available.
