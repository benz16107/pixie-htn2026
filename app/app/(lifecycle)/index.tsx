import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ActionCard, MiniStat, Panel, PhaseIntro, ProductSwitch, SourceMark } from '@/components/consumer';
import { Body, Button, Kicker, Screen } from '@/components/ui';
import { autoName, bundledAutoEstimate } from '@/lib/consumer';
import { useQuote } from '@/lib/store';
import { C, F } from '@/lib/theme';

export default function QuoteHubScreen() {
  const { product, setProduct, autoListing, autoProfile, place } = useQuote();
  const auto = bundledAutoEstimate(autoListing, autoProfile);

  return (
    <Screen>
      <ProductSwitch product={product} onChange={setProduct} />
      <PhaseIntro number={1} phase="Quote" title={product === 'home' ? 'Price the place you call home.' : 'Compare the car and its cover.'}>
        {product === 'home'
          ? 'Start with the working Toronto tenant estimate. Home protection tools stay alongside it without claiming a homeowner tariff.'
          : 'Put the purchase payment and an insurance estimate on the same screen before you choose a car.'}
      </PhaseIntro>

      {product === 'home' ? (
        <>
          <Panel tone="ink">
            <Text style={st.inverseKicker}>HOME & TENANT</Text>
            <Text style={st.inverseTitle}>{place?.address ?? 'Toronto tenant estimate'}</Text>
            <Text style={st.inverseBody}>{place ? 'Your address is saved. Continue to review the same coverage inputs.' : 'Enter an address, check five inputs, then see an itemised estimate.'}</Text>
            <View style={st.gap}><Button label={place ? 'Continue my tenant quote' : 'Start my tenant quote'} onPress={() => router.push('/home-quote')} /></View>
          </Panel>
          <ActionCard title="Build a room inventory" detail="Run a bundled room-scan demo and save an item total before a loss." meta="PROTECTION TOOL" onPress={() => router.push('/home-inventory')} />
          <Body style={st.disclosure}>The quote path prices tenant insurance. Home tools help with prevention and records; they do not produce a homeowner price.</Body>
        </>
      ) : (
        <>
          <Panel tone="warm">
            <SourceMark live={false} />
            <Kicker style={st.cardKicker}>Selected listing</Kicker>
            <Text style={st.cardTitle}>{autoName(autoListing)}</Text>
            <View style={st.stats}>
              <MiniStat value={`$${autoListing.paymentMonthly}`} label="CAR / MO" />
              <MiniStat value={`$${auto.monthly}`} label="COVER / MO" />
              <MiniStat value={`$${auto.ownershipMonthly}`} label="COMBINED / MO" />
            </View>
            <Button label="Compare three vehicles" onPress={() => router.push('/auto-compare')} />
          </Panel>
          <Body style={st.disclosure}>{auto.label} Vehicle prices are bundled synthetic listings.</Body>
        </>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  inverseKicker: { color: '#AFC1C4', fontFamily: F.monoMedium, fontSize: 10, letterSpacing: 1 },
  inverseTitle: { marginTop: 10, color: C.paper, fontFamily: F.sansBold, fontSize: 24, lineHeight: 29 },
  inverseBody: { marginTop: 8, color: '#D8E2E3', fontFamily: F.sans, fontSize: 15, lineHeight: 21 },
  gap: { marginTop: 18 },
  cardKicker: { marginTop: 16 },
  cardTitle: { marginTop: 6, fontFamily: F.sansBold, fontSize: 23, lineHeight: 28, color: C.ink },
  stats: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 12 },
  disclosure: { marginTop: 14, marginBottom: 22, color: C.dim, fontSize: 13, lineHeight: 19 },
});
