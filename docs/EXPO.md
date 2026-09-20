# Expo mobile experience

Pixie is a consumer insurance app for Home and Auto. The phone does not expose the presentation framework used on the website. Customers see four everyday destinations: Home, Compare, Safety, and Help. A Home and Auto switch changes the tools and policy context without moving the customer into a second app.

## Consumer interface

The September 20 refresh follows Apple's guidance on [typography](https://developer.apple.com/design/human-interface-guidelines/typography) and [tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars). It uses platform system fonts, grouped white cards over a neutral background, one blue action color, labelled tabs, and a Home/Auto segmented control. Large titles identify the current task. Supporting screens keep the standard stack back button.

Icons use SF Symbols through `expo-symbols` on iOS and vector paths on web and Android. Emoji and character-based navigation icons have been removed. Buttons and product controls have at least 44-point touch targets, text retains native font scaling, and press feedback respects reduced motion.

Current [phone-size screenshots](assets/intact/apple-refresh/README.md) cover Home, Auto, Compare, Safety, Help, and Drive Score. The refresh passed TypeScript, Expo Doctor, web export, tenant-estimate and recovery-plan browser flows, and layout checks at 320, 390, and 430 pixels. Native iPhone visual verification remains pending because the device host was unavailable.

## What works

Home includes the complete Toronto tenant estimate. A customer can enter an address or use location, inspect the neighbourhood data used by the model, confirm coverage, receive an itemized estimate, listen to the result, and save or share a PDF. The Safety tab includes a reviewed room inventory. Home pricing currently covers tenant insurance only.

Auto compares three illustrative vehicle listings with the same driver profile. Compare changes annual distance, parking, deductible, or claims without overwriting the saved profile. Safety contains prevention tasks and Drive Score. Help creates a private recovery checklist and a local PDF after an incident.

## Drive Score

Drive Score uses `Location.watchPositionAsync` after the customer taps **Start a live drive**. The app reads foreground GPS speed and calculates speed from distance and time when the device does not supply it. It counts a speeding event when the observed speed crosses the selected road-context threshold. It counts a hard brake when speed falls by at least 12 km/h within five seconds from a starting speed of at least 25 km/h.

The app rounds coordinates to three decimal places and sends at most 50 points to the stateless driving service. The service returns two scores:

- Driving behavior, based on aggregate speeding and hard-brake events.
- Road context, based on coarse examples such as a school approach, dense downtown streets, or a controlled-access corridor.

The displayed coaching score weights behavior at 75% and road context at 25%. It cannot change an insurance estimate or premium. The service stores no route and returns no coordinates. Tracking stops when the customer finishes the drive or leaves the screen.

The **Preview with a Toronto sample** action runs the complete screen while the phone is stationary. It is the reliable judging path when a real drive is impractical.

## Widget and Live Activity

The Drive Score screen contains faithful previews of both native surfaces. A development build publishes the same score, current speed, area, and road context through `expo-widgets`.

The Home Screen widget supports small and medium sizes. Add it by long-pressing the iPhone Home Screen, opening the widget picker, searching for Pixie, and choosing a size.

The Live Activity starts when a drive begins. It appears on the Lock Screen and, on supported iPhones, the Dynamic Island. It updates with the current score, speed, and area, then ends when the customer finishes the drive. If it does not appear, enable Live Activities for Pixie in iOS Settings.

Expo Go cannot load the widget extension, Live Activity, SwiftUI, or Jetpack Compose components. These features require the Pixie development build.

## Expo services used

| Expo service | Product use |
| --- | --- |
| Expo Router | Home, Compare, Safety, Help tabs plus focused estimate, inventory, driving, and recovery screens |
| Expo Location | Address lookup and foreground Drive Score samples |
| Expo UI | Native SwiftUI and Jetpack Compose drive actions |
| `expo-widgets` | iOS Home Screen widget and Live Activity |
| Expo Haptics | Feedback for quote choices and results |
| Expo Speech | Spoken tenant-estimate summary |
| Expo Print and Sharing | Itemized estimate and recovery-plan PDFs |
| Expo Web Browser | Explicit advisor handoff |
| Reanimated | Press feedback and reduced-motion handling |

## Run it

The Expo CLI is signed in as `benz16107`, and the app is linked to `@benz16107/pixie`. Set `EXPO_PUBLIC_API_URL` to an API URL the phone can reach.

Use Expo Go for the React Native customer flow:

```bash
cd app
npx expo start --lan
```

Use a development build for the widget, Live Activity, and Expo UI components:

```bash
cd app
npx eas-cli device:create
npx eas-cli build --platform ios --profile development
npx expo start --dev-client --lan
```

EAS still needs private Apple Developer authentication and device registration. The `Pixie` app and `ExpoWidgetsTarget` extension need separate provisioning profiles. They can share one distribution certificate.

## Demo path

1. Open Auto from Home.
2. Open Safety, then Drive Score.
3. Tap **Preview with a Toronto sample** while stationary, or **Start a live drive** on a moving test device.
4. Point out current speed, distance, events, separate behavior and road-context scores, and the privacy boundary.
5. Show the widget and Live Activity previews. Replace those previews with captures from the development build once Apple signing is available.
6. Open Compare to change one assumption, then Help to build a recovery plan.
