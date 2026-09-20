# Expo mobile experience

The consumer app uses Expo Router for Quote, Decide, Protect, and Recover. Home and Auto share the lifecycle shell while keeping their data and actions separate.

## Working flows

Home starts with the existing Toronto tenant quote. A customer can enter an address, inspect the optional risk map, review five prefilled choices, request an itemized estimate, save or share a PDF, and open an advisor referral. The Home protection route adds a reviewed room-inventory demo. No homeowner tariff exists.

Auto compares three bundled synthetic vehicles against one driver scenario. The customer can change annual distance, parking, deductible, or claims, then keep the selected scenario. Protect records prevention work and opens Drive context. Recover prepares an evidence bundle and launches Pixie Recover, powered by the separate CrashClip prototype.

## Native Expo features

- Expo Router owns lifecycle tabs, edit loops, and supporting screens.
- Expo Location handles explicit address and coarse drive-context location actions.
- Expo UI supplies a SwiftUI button on iOS and a Jetpack Compose button on Android.
- expo-widgets supplies an iOS home-screen widget and Live Activity for the active drive context.
- Haptics, Speech, Print, Sharing, Web Browser, and Reanimated support the existing tenant quote.

The widget, Live Activity, SwiftUI, and Jetpack Compose components require a native development build. Expo Go and web render the same foreground flows with a clear development-build label. They do not prove the native extensions.

## Driving-context boundary

Drive context sends route points rounded to three decimal places and aggregate driving events to the API. The API returns a behavior score, a synthetic route-context score, and a documented coaching composite. It stores no coordinates and returns none. The result cannot change a quote or premium.

The location action is foreground-only and requires a tap. The app has no background-location permission. If location or the API is unavailable, a bundled synthetic Toronto route keeps the demo working and labels its source.

## Running it

Set `EXPO_PUBLIC_API_URL` to a reachable API URL for a physical phone. Run Expo Go for the JavaScript and React Native flow. Build a native development client to demonstrate Expo UI and expo-widgets.
