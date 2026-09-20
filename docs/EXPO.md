# Expo mobile experience

The consumer app uses Expo Router for Quote, Decide, Protect, and Recover. Home and Auto share the lifecycle shell while keeping their data and actions separate.

## Working flows

Home starts with the existing Toronto tenant quote. A customer can enter an address, inspect the optional risk map, review five prefilled choices, request an itemized estimate, save or share a PDF, and open an advisor referral. The Home protection route adds a reviewed room-inventory demo. No homeowner tariff exists.

Auto compares three bundled synthetic vehicles against one driver scenario. The customer can change annual distance, parking, deductible, or claims, then keep the selected scenario. Protect records prevention work and opens Drive context. Recover asks what happened, requires a safety confirmation, records what the customer has, and creates a local PDF plan that they can save or share.

## Native Expo features

- Expo Router owns lifecycle tabs, edit loops, and supporting screens.
- Expo Location handles explicit address and coarse drive-context location actions.
- Expo UI supplies a SwiftUI button on iOS and a Jetpack Compose button on Android.
- expo-widgets supplies an iOS home-screen widget and Live Activity for the active drive context.
- Haptics, Speech, Print, Sharing, Web Browser, and Reanimated support the existing tenant quote.

The widget, Live Activity, SwiftUI, and Jetpack Compose components require a native development build. Expo Go and web render the same foreground flows with a clear development-build label. They do not prove the native extensions.

## Using the widget and Live Activity

The iOS extension is named `DriveContext`. Its Home Screen widget supports the small and medium families. Its Live Activity has Lock Screen, compact Dynamic Island, minimal Dynamic Island, and expanded Dynamic Island layouts.

After installing the development build:

1. Start Metro with `npx expo start --dev-client --lan`.
2. Open the installed Pixie development app on the iPhone.
3. Open **Auto**, then **Protect**, then **Open drive context**.
4. Tap **Start drive context**. Pixie writes the current zone to the widget and starts the Live Activity.
5. Select Parkdale streets, Gardiner corridor, Downtown core, or use the current coarse area. Pixie updates both native surfaces.
6. Tap **Stop drive context** to end the Live Activity.

To place the widget on the Home Screen, long-press the Home Screen, open the widget picker, search for Pixie, and add the small or medium Pixie drive context widget. The Live Activity appears on the Lock Screen and, on supported phones, the Dynamic Island after the drive context starts. Enable Live Activities for Pixie in iOS Settings if the system has disabled them.

## Driving-context boundary

Drive context sends route points rounded to three decimal places and aggregate driving events to the API. The API returns a behavior score, a synthetic route-context score, and a documented coaching composite. It stores no coordinates and returns none. The result cannot change a quote or premium.

The location action is foreground-only and requires a tap. The app has no background-location permission. If location or the API is unavailable, a bundled synthetic Toronto route keeps the demo working and labels its source.

## Running it

Set `EXPO_PUBLIC_API_URL` to a reachable API URL for a physical phone. Run Expo Go for the JavaScript and React Native flow. Build a native development client to demonstrate Expo UI and expo-widgets.

The Expo CLI is signed in as `benz16107`, and the app is linked to the EAS project `@benz16107/pixie`. The Homebrew Node shared-library error was repaired on 2026-09-20.

```bash
cd app
npx eas-cli device:create
npx eas-cli build --platform ios --profile development
```

Install the resulting internal build on the registered iPhone, then start its Metro session:

```bash
cd app
npx expo start --dev-client --lan
```

`expo-dev-client` and the `development` and `development-simulator` profiles already exist in the project. EAS still requires Apple Developer authentication and device registration for the physical iPhone build. The main app and `ExpoWidgetsTarget` need separate provisioning profiles, but they can share one distribution certificate.
