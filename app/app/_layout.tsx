import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { Newsreader_600SemiBold } from '@expo-google-fonts/newsreader';
import { PublicSans_400Regular, PublicSans_500Medium, PublicSans_600SemiBold } from '@expo-google-fonts/public-sans';
import { useFonts } from 'expo-font';
import { Link, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import { QuoteProvider } from '@/lib/store';
import { C, F } from '@/lib/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
          headerRight: () => (
            <Link href="/about" asChild>
              <Pressable accessibilityRole="link" accessibilityLabel="About Pixie: sources, fairness and limits" hitSlop={12} style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ fontFamily: F.sansMedium, fontSize: 15, color: C.ink, textDecorationLine: 'underline' }}>About</Text>
              </Pressable>
            </Link>
          ),
        }}
      >
        <Stack.Screen name="index" options={{ title: 'PIXIE' }} />
        <Stack.Screen name="map" options={{ title: 'Your block' }} />
        <Stack.Screen name="questions/[step]" options={{ title: 'Your unit' }} />
        <Stack.Screen name="inventory" options={{ title: 'Photograph your apartment' }} />
        <Stack.Screen name="quote" options={{ title: 'Your quote' }} />
        <Stack.Screen name="about" options={{ title: 'About', headerRight: () => null }} />
      </Stack>
    </QuoteProvider>
    </GestureHandlerRootView>
  );
}
