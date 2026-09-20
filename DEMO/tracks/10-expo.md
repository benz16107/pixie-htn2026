# Expo: asynchronous judging guide

[All tracks](../4-PER-TRACK.md) · [Recovery](../5-IF-IT-BREAKS.md) · [Implementation notes](../../docs/EXPO.md)

## The pitch

"Expo turns one insurance relationship into a native customer product. Router holds the four stages, native controls follow each platform, and an iPhone widget and Live Activity keep active drive context visible outside the app."

Keep the submission focused on the phone. Use the Intact web page only as a brief opening frame for Quote, Decide, Protect, and Recover.

## Expo features the judge can verify

| Expo capability | Where it appears | Why it matters |
| --- | --- | --- |
| Expo Router | Four lifecycle tabs and supporting quote, comparison, inventory, drive, and recovery screens | The customer returns to the same stage after a focused task |
| Expo Location | Explicit address, map, and coarse drive-context actions | Location is requested after a tap, not silently in the background |
| Expo UI | SwiftUI action on iOS and Jetpack Compose action on Android | The important drive action follows each platform's native control system |
| `expo-widgets` | iOS home-screen widget and Live Activity | Active coaching remains glanceable outside the app |
| Haptics | Quote choices and decision feedback | Native feedback confirms intentional changes |
| Speech | Spoken tenant quote summary built from receipt values | The result has an accessible, hands-free review path |
| Print and Sharing | Itemized quote PDF and native share sheet | The customer can keep or discuss the same receipt |
| Reanimated and safe areas | Press feedback, reduced motion, fixed action footers | Interaction remains readable around device insets and motion preferences |
| Web Browser | Explicit tenant advisor referral | Leaving the app is a visible customer action |

The shared API owns quote and coaching arithmetic. Expo owns the customer task, navigation, permissions, native controls, and glance surfaces. The app rounds drive-context points before the request, stores no route, and keeps a deterministic bundled fallback for the demo.

## Recommended screenshot sequence

| Order | Capture | Caption |
| ---: | --- | --- |
| 1 | Lifecycle tabs with Auto selected | **Four native stages, one customer relationship.** Expo Router keeps Quote, Decide, Protect, and Recover available throughout the app. |
| 2 | Auto comparison with source badge and three vehicles | **A working comparison with an offline path.** The screen labels whether the shared service or bundled model answered. |
| 3 | Drive context foreground screen with its native action | **Native controls for the task that matters.** SwiftUI and Jetpack Compose provide the platform action while React Native holds the shared flow. |
| 4 | iOS widget and Live Activity side by side | **Drive context leaves the app.** `expo-widgets` publishes the active zone and coaching factor to glance surfaces. |
| 5 | Tenant receipt with play and share actions | **One receipt, several native outputs.** Speech, PDF print, and the share sheet use the same itemized result. |
| 6 | Recovery record checklist and ready plan | **A local plan after an incident.** The customer reviews the record and chooses whether to save or share its PDF. |

Capture the widget and Live Activity only from the iOS development build. If that build is unavailable, use the foreground drive screen and source-file excerpt as supporting material, not as proof that the extension ran.

## 2 minute 25 second video

| Time | Action | Script |
| ---: | --- | --- |
| 0:00 to 0:12 | Open the four-tab app and switch between Home and Auto once. | "Expo gives Pixie one native customer product for the full insurance relationship." |
| 0:12 to 0:34 | Compare the three Auto vehicles. | "Router keeps Quote in the first stage. This comparison asks the shared API first and labels the bundled fallback when the network is unavailable." |
| 0:34 to 0:52 | Open Decide and choose another scenario. | "A what-if changes one input without overwriting the customer's baseline." |
| 0:52 to 1:20 | Open Drive context, trigger the native action, and advance one zone. | "Expo Location runs only after this tap. The API separates driving events from coarse route context and returns coaching factors with their source." |
| 1:20 to 1:36 | Show the iOS widget and Live Activity. | "With a development build, `expo-widgets` keeps the active context visible on the home screen and Dynamic Island." |
| 1:36 to 1:54 | Switch to the tenant receipt. Play its summary and open the share sheet. | "The tenant result becomes an on-device spoken summary and an itemized PDF through Expo Speech, Print, and Sharing." |
| 1:54 to 2:16 | Open Recover, confirm safety, mark record sections, and build the plan. | "Recovery uses a native three-step flow. The customer records what they have, receives clear next actions, and chooses whether to save or share the local PDF." |
| 2:16 to 2:25 | End on the lifecycle tabs. | "The native features support a real customer task while the pricing and privacy limits remain visible." |

## Required disclosures

"The widget, Live Activity, SwiftUI, and Jetpack Compose surfaces require native development builds and do not run inside Expo Go. Auto prices and route zones are synthetic. Drive context is coaching-only and cannot change a quote or premium. Recovery creates a local record but uploads and submits nothing."

## Capture fallbacks

- If the API is unreachable, keep the bundled-demo badge visible and continue.
- If the native build is unavailable, use the foreground drive screen. Do not claim that Expo Go ran the widget or Live Activity.
- If location is denied, use the synthetic Toronto route. The quote and driving demo still work.
- If PDF sharing is unavailable, finish on the ready recovery plan and say that the record remains local.
