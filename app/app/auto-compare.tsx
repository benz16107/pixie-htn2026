import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MiniStat, SourceMark } from '@/components/consumer';
import { Body, Button, Kicker, Screen, Title } from '@/components/ui';
import { AUTO_LISTINGS, autoName, quoteAuto, type AutoEstimateResult } from '@/lib/consumer';
import { useQuote } from '@/lib/store';
import { C, F } from '@/lib/theme';

type Estimates = Record<string, AutoEstimateResult>;

export default function AutoCompareScreen() {
  const { autoListing, setAutoListing, autoProfile } = useQuote();
  const [estimates, setEstimates] = useState<Estimates>({});

  useEffect(() => {
    let live = true;
    Promise.all(AUTO_LISTINGS.map(async (vehicle) => [vehicle.id, await quoteAuto(vehicle, autoProfile)] as const)).then((entries) => {
      if (live) setEstimates(Object.fromEntries(entries));
    });
    return () => { live = false; };
  }, [autoProfile]);

  return (
    <Screen footer={<Button label={`Use ${autoListing.make} ${autoListing.model}`} onPress={() => router.dismissTo('/decide')} />}>
      <Kicker>Auto · listing comparison</Kicker>
      <Title style={st.title}>Find your next car.</Title>
      <Body style={st.lead}>Choose an example listing to compare the monthly car cost with an illustrative insurance estimate.</Body>

      <View accessibilityRole="radiogroup" accessibilityLabel="Vehicle listings">
        {AUTO_LISTINGS.map((vehicle) => {
          const result = estimates[vehicle.id];
          const estimate = result && 'estimate' in result ? result.estimate : null;
          const live = result && 'estimate' in result && result.source === 'shared-api';
          const selected = autoListing.id === vehicle.id;
          return (
            <Pressable
              key={vehicle.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${autoName(vehicle)}. Listing price $${vehicle.listingPrice.toLocaleString('en-CA')}. ${estimate ? `Illustrative cover $${estimate.monthly} monthly.` : 'Estimate loading.'}`}
              onPress={() => setAutoListing(vehicle)}
              style={({ pressed }) => [st.card, selected && st.cardOn, pressed && { opacity: 0.75 }]}
            >
              <View style={st.cardHead}>
                <View style={{ flex: 1, minWidth: 0 }}><Kicker>{vehicle.year} · Example listing</Kicker><Text style={st.name}>{vehicle.make} {vehicle.model}</Text></View>
                <View style={[st.radio, selected && st.radioOn]} />
              </View>
              <Text style={st.listPrice}>${vehicle.listingPrice.toLocaleString('en-CA')}</Text>
              {estimate ? (
                <>
                  <SourceMark live={!!live} />
                  <View style={st.stats}>
                    <MiniStat value={`$${vehicle.paymentMonthly}`} label="Car / month" />
                    <MiniStat value={`$${estimate.monthly}`} label="Cover / month" />
                    <MiniStat value={`$${estimate.ownershipMonthly}`} label="Total / month" />
                  </View>
                </>
              ) : <ActivityIndicator color={C.ochre} accessibilityLabel="Loading estimate" style={{ alignSelf: 'flex-start', marginTop: 18 }} />}
            </Pressable>
          );
        })}
      </View>
      <Body style={st.disclosure}>Vehicle listings, payments, and Pixie insurance estimates are illustrative. They are not Intact quotes or offers. Payments assume 60 months and exclude interest.</Body>
    </Screen>
  );
}

const st = StyleSheet.create({
  title: { marginTop: 8 },
  lead: { marginTop: 10, marginBottom: 20, color: C.dim },
  card: { borderWidth: 1, borderColor: C.rule, borderRadius: 16, padding: 16, marginBottom: 12, backgroundColor: C.paper },
  cardOn: { borderColor: C.ochre, borderWidth: 2, backgroundColor: C.ochreSoft },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  name: { marginTop: 5, fontFamily: F.sansBold, fontWeight: '600', fontSize: 20, color: C.ink },
  listPrice: { marginTop: 6, marginBottom: 12, fontFamily: F.monoMedium, fontWeight: '500', fontSize: 14, color: C.dim },
  radio: { width: 22, height: 22, borderWidth: 1.5, borderColor: C.dim, borderRadius: 11 },
  radioOn: { borderColor: C.ochre, borderWidth: 7 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  disclosure: { marginTop: 6, marginBottom: 22, fontSize: 13, lineHeight: 19, color: C.dim },
});
