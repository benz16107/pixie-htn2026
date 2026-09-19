import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Body, Button, Choice, Contours, Dim, Kicker, Screen, Title } from '@/components/ui';
import { EXAMPLES, type Place } from '@/lib/api';
import { useQuote } from '@/lib/store';
import { C, F } from '@/lib/theme';

export default function AddressScreen() {
  const { setPlace, setAnswers } = useQuote();
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<Place | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pickExample = (i: number) => {
    const ex = EXAMPLES[i];
    setPicked(ex);
    setText(ex.address);
    setAnswers(ex.answers);
    setError('');
  };

  const useMyLocation = async () => {
    setBusy(true);
    setError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission was not given. Type your address instead.');
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [r] = await Location.reverseGeocodeAsync(coords).catch(() => []);
      const address = r ? [r.streetNumber, r.street].filter(Boolean).join(' ') || r.name || 'Your location' : 'Your location';
      setPicked({ address, lat: coords.latitude, lng: coords.longitude });
      setText(address);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read your location. Type your address instead.');
    } finally {
      setBusy(false);
    }
  };

  // Resolve typed text to a point: an example, else the platform geocoder.
  const resolve = async (): Promise<Place | null> => {
    if (picked && picked.address === text) return picked;
    const ex = EXAMPLES.find((e) => e.address.toLowerCase() === text.trim().toLowerCase());
    if (ex) return ex;
    try {
      const [g] = await Location.geocodeAsync(`${text}, Toronto, ON`);
      if (g) return { address: text.trim(), lat: g.latitude, lng: g.longitude };
    } catch {}
    return null;
  };

  const go = async (withMap: boolean) => {
    if (!text.trim()) return setError('Type an address, use your location, or pick an example.');
    setBusy(true);
    const p = await resolve();
    setBusy(false);
    if (!p) return setError('We could not find that address in Toronto. Check the spelling or pick an example.');
    setPlace(p);
    router.push(withMap ? '/map' : '/questions/1');
  };

  return (
    <Screen
      footer={
        <>
          <Button label="Continue to the map" onPress={() => go(true)} disabled={busy} />
          <Button
            kind="link"
            label="Skip the map, answer in a list"
            hint="Goes straight to the three questions. The quote is the same."
            onPress={() => go(false)}
          />
        </>
      }
    >
      <View style={{ paddingTop: 12, paddingBottom: 20 }}>
        <Contours />
        <Kicker>Tenant insurance, Toronto</Kicker>
        <Title style={{ marginTop: 6 }}>See why before you pay</Title>
        <Body style={{ marginTop: 10 }}>
          Your address sets part of the price. Pixie shows each part, where it comes from, and how much it moves the total.
          Three questions after that.
        </Body>
      </View>

      <Text nativeID="addr-label" style={st.label}>
        Your address
      </Text>
      <TextInput
        value={text}
        onChangeText={(t) => {
          setText(t);
          setError('');
        }}
        placeholder="e.g. 180 Queen St W"
        placeholderTextColor={C.dim}
        accessibilityLabel="Your address"
        accessibilityLabelledBy="addr-label"
        aria-invalid={!!error}
        autoComplete="street-address"
        textContentType="fullStreetAddress"
        returnKeyType="next"
        onSubmitEditing={() => go(true)}
        style={[st.input, error ? { borderColor: C.rust } : null]}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" role="alert" style={st.error}>
          {error}
        </Text>
      ) : null}
      <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Button kind="secondary" label="Use my location" onPress={useMyLocation} disabled={busy} hint="Asks once for your location to fill in the address" />
        {busy ? <ActivityIndicator color={C.ink} accessibilityLabel="Working" /> : null}
      </View>

      <Kicker style={{ marginTop: 28, marginBottom: 10 }}>Or try an example</Kicker>
      {EXAMPLES.map((ex, i) => (
        <Choice key={ex.address} role="button" title={ex.address} detail={ex.hint} selected={picked?.address === ex.address} onPress={() => pickExample(i)} />
      ))}
      <Dim style={{ fontSize: 13, marginTop: 6 }}>
        No account, no name, no email. Prices are illustrative, not an Intact price.
      </Dim>
    </Screen>
  );
}

const st = StyleSheet.create({
  label: { fontFamily: F.sansBold, fontSize: 15, color: C.ink, marginBottom: 6 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: C.ink,
    borderRadius: 4,
    paddingHorizontal: 14,
    fontFamily: F.sans,
    fontSize: 17,
    color: C.ink,
    backgroundColor: C.paper,
  },
  error: { fontFamily: F.sans, fontSize: 14, color: C.rust, marginTop: 6 },
});
