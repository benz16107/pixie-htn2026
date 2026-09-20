import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ActionCard, ConsumerHeader, MiniStat, Panel, ProductSwitch } from '@/components/consumer';
import { Body, Button, Kicker, Screen, Title } from '@/components/ui';
import { autoName, bundledAutoEstimate } from '@/lib/consumer';
import { useQuote } from '@/lib/store';
import { C, F } from '@/lib/theme';

export default function QuoteHubScreen() {
  const { product, setProduct, autoListing, autoProfile, place } = useQuote();
  const auto = bundledAutoEstimate(autoListing, autoProfile);

  return (
    <Screen>
      <ConsumerHeader />
      <ProductSwitch product={product} onChange={setProduct} />
      <Kicker style={st.sectionKicker}>Your coverage</Kicker>
      <Title style={st.title}>{product === 'home' ? 'Protect your place.' : 'Your car, in one view.'}</Title>
      <Body style={st.lead}>{product === 'home' ? 'Get a tenant estimate, save your belongings, and keep help close.' : 'Compare ownership costs, review your setup, and see your latest driving insight.'}</Body>

      {product === 'home' ? (
        <>
          <Panel tone="ink">
            <Text style={st.inverseKicker}>{place ? 'QUOTE IN PROGRESS' : 'TENANT INSURANCE'}</Text>
            <Text style={st.inverseTitle}>{place?.address ?? 'See your monthly estimate'}</Text>
            <Text style={st.inverseBody}>{place ? 'Your address is saved. Review the coverage that fits your place.' : 'Answer a few questions about your place and belongings. It usually takes under two minutes.'}</Text>
            <View style={st.gap}><Button label={place ? 'Continue my tenant quote' : 'Start my tenant quote'} onPress={() => router.push('/home-quote')} /></View>
          </Panel>
          <ActionCard title="Save what you own" detail="Build a room inventory so important items are easier to remember later." onPress={() => router.push('/home-inventory')} />
          <Body style={st.disclosure}>This prototype currently estimates tenant insurance in Toronto. Prices are illustrative.</Body>
        </>
      ) : (
        <>
          <Panel tone="warm">
            <Kicker style={st.cardKicker}>Your selected car</Kicker>
            <Text style={st.cardTitle}>{autoName(autoListing)}</Text>
            <View style={st.stats}>
              <MiniStat value={`$${autoListing.paymentMonthly}`} label="CAR / MO" />
              <MiniStat value={`$${auto.monthly}`} label="COVER / MO" />
              <MiniStat value={`$${auto.ownershipMonthly}`} label="COMBINED / MO" />
            </View>
            <Button label="Compare cars and coverage" onPress={() => router.push('/auto-compare')} />
          </Panel>
          <ActionCard title="Check my drive score" detail="See how driving events and road context affect your coaching score." onPress={() => router.push('/driving-context')} />
          <Body style={st.disclosure}>{auto.label} Vehicle prices and insurance estimates are illustrative.</Body>
        </>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  inverseKicker: { color: '#AFC1C4', fontFamily: F.monoMedium, fontSize: 10, letterSpacing: 1 },
  sectionKicker: { marginTop: 24 },
  title: { marginTop: 7 },
  lead: { marginTop: 9, marginBottom: 18, color: C.dim },
  inverseTitle: { marginTop: 10, color: C.paper, fontFamily: F.sansBold, fontSize: 24, lineHeight: 29 },
  inverseBody: { marginTop: 8, color: '#D8E2E3', fontFamily: F.sans, fontSize: 15, lineHeight: 21 },
  gap: { marginTop: 18 },
  cardKicker: { marginTop: 2 },
  cardTitle: { marginTop: 6, fontFamily: F.sansBold, fontSize: 23, lineHeight: 28, color: C.ink },
  stats: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 12 },
  disclosure: { marginTop: 14, marginBottom: 22, color: C.dim, fontSize: 13, lineHeight: 19 },
});
