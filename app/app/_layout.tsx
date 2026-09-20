import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { Newsreader_600SemiBold } from '@expo-google-fonts/newsreader';
import { PublicSans_400Regular, PublicSans_500Medium, PublicSans_600SemiBold } from '@expo-google-fonts/public-sans';
import { useFonts } from 'expo-font';
import { Link, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import * as Sentry from '@sentry/react-native';
import { QuoteProvider } from '@/lib/store';
import { C, F } from '@/lib/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

// JS errors + tracing (docs/research/sentry.md item 5, and docs/SENTRY.md for what Expo Go can't
// do here: no native crash reporting and no mobileReplayIntegration, both need a compiled dev/EAS
// build; app.json's @sentry/react-native/expo plugin only runs its native step on that build too).
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  enableLogs: true,
  environment: process.env.EXPO_PUBLIC_ATLAS_ENV || 'hackathon',
});

function RootLayout() {
  const [loaded, error] = useFonts({
    Newsreader_600SemiBold,
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    DMMono_400Regular,
    DMMono_500Medium,
  });
  const reduced = useReducedMotion();

  useEffect(() => {
    if (error) throw error;
    if (loaded) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <QuoteProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.paper },
          headerShadowVisible: false,
          headerTintColor: C.ink,
          headerTitleStyle: { fontFamily: F.sansBold, fontSize: 15 },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: C.paper },
          animation: reduced ? 'fade' : 'default',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: C.ochre }} />
              <Text style={{ fontFamily: F.sansBold, fontSize: 15, color: C.ink, letterSpacing: 1.1 }}>PIXIE</Text>
              <Text style={{ fontFamily: F.sansMedium, fontSize: 11, color: C.dim }}>INSURANCE</Text>
            </View>
          ),
          headerRight: () => (
            <Link href="/about" asChild>
              <Pressable accessibilityRole="link" accessibilityLabel="About Pixie: sources, fairness and limits" hitSlop={12} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ fontFamily: F.sansMedium, fontSize: 15, color: C.ink, textDecorationLine: 'underline' }}>About</Text>
              </Pressable>
            </Link>
          ),
        }}
      >
        <Stack.Screen name="(lifecycle)" options={{ title: 'Pixie Insurance', headerBackVisible: false }} />
        <Stack.Screen name="home-quote" options={{ title: 'Tenant quote' }} />
        <Stack.Screen name="auto-compare" options={{ title: 'Compare vehicles' }} />
        <Stack.Screen name="home-inventory" options={{ title: 'Room inventory' }} />
        <Stack.Screen name="driving-context" options={{ title: 'Drive context' }} />
        <Stack.Screen name="recovery-plan" options={{ title: 'Recovery plan' }} />
        <Stack.Screen name="map" options={{ title: 'Your block' }} />
        <Stack.Screen name="questions/[step]" options={{ title: 'Your unit' }} />
        <Stack.Screen name="quote" options={{ title: 'Your quote' }} />
        <Stack.Screen name="about" options={{ title: 'About', headerRight: () => null }} />
      </Stack>
    </QuoteProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
