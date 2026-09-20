# Expo mobile experience

The renter app runs in Expo Go and uses Expo Router.

The main sequence is Address, Coverage, and Estimate. The map is optional, and five prefilled coverage choices live on one review screen. The result shows the annual price, an itemized source-labelled receipt, the decision, and the next step. The app can read the result with on-device speech, create a PDF with `expo-print`, share it, and open the exact referred case in the web desk.

The interface supports reduced motion, Dynamic Type-friendly layouts, minimum touch targets, native haptics, and a web map fallback. Sentry wraps the JavaScript app. Native crash capture and mobile replay require a compiled build and are outside the Expo Go demo.

The phone must receive a reachable `EXPO_PUBLIC_API_URL`. Without it, the app can show its local fixtures but cannot prove the quote and referral API path.
