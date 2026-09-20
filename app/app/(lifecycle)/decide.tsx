import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ConsumerHeader, Panel, ProductSwitch, SourceMark } from '@/components/consumer';
import { Body, Button, Choice, Kicker, Screen, Title } from '@/components/ui';
import { quoteAuto, type AutoEstimateResult, type AutoProfile } from '@/lib/consumer';
import { useQuote } from '@/lib/store';
import { C, F } from '@/lib/theme';

const AUTO_SCENARIOS: Array<{ title: string; detail: string; patch: Partial<AutoProfile> }> = [
  { title: 'Drive under 10,000 km', detail: 'Garage parked, $1,000 deductible', patch: { annualKmBand: 'under_10000', parking: 'garage', deductible: 1000 } },
  { title: 'Everyday city driving', detail: '10,000–20,000 km, driveway parked', patch: { annualKmBand: '10000_20000', parking: 'driveway', deductible: 1000 } },
  { title: 'Lower premium setup', detail: '$2,000 deductible and garage parking', patch: { deductible: 2000, parking: 'garage' } },
];

export default function DecideScreen() {
  const { product, setProduct, answers, setAnswers, autoListing, autoProfile, setAutoProfile } = useQuote();
  const [autoChoice, setAutoChoice] = useState(1);
  const [homeChoice, setHomeChoice] = useState(0);
  const [result, setResult] = useState<AutoEstimateResult | null>(null);
  const proposed = { ...autoProfile, ...AUTO_SCENARIOS[autoChoice].patch };
  const autoResult = result && 'estimate' in result ? result : null;

  useEffect(() => {
    let live = true;
    quoteAuto(autoListing, proposed).then((next) => { if (live) setResult(next); });
    return () => { live = false; };
  }, [autoChoice, autoListing.id]);

  const homeOptions = [
    { title: '$30,000 contents', detail: 'Essential belongings', value: 30000 },
    { title: '$50,000 contents', detail: 'Adds $80 a year to the illustrative estimate', value: 50000 },
  ];

  return (
    <Screen topSafe>
      <ConsumerHeader title="Compare" detail="Try a change before you save it." />
      <ProductSwitch product={product} onChange={setProduct} />
      <Title style={st.title}>{product === 'auto' ? 'Your driving setup' : 'Your contents coverage'}</Title>
      <Body style={st.lead}>Explore an option, then save the one that fits.</Body>
      {product === 'auto' ? (
        <>
          <View accessibilityRole="radiogroup" accessibilityLabel="Auto estimate scenarios">
            {AUTO_SCENARIOS.map((scenario, index) => <Choice key={scenario.title} title={scenario.title} detail={scenario.detail} selected={autoChoice === index} onPress={() => setAutoChoice(index)} />)}
          </View>
          {autoResult ? (
            <Panel tone="warm">
              <SourceMark live={autoResult.source === 'shared-api'} />
              <Kicker style={st.kicker}>Illustrative result</Kicker>
              <Text accessibilityLiveRegion="polite" style={st.price}>${autoResult.estimate.monthly}<Text style={st.unit}> / month</Text></Text>
              <Body style={st.note}>About ${autoResult.estimate.ownershipMonthly}/month with the example vehicle payment.</Body>
              <Button label="Use this setup" onPress={() => setAutoProfile(AUTO_SCENARIOS[autoChoice].patch)} />
            </Panel>
          ) : null}
        </>
      ) : (
        <>
          <View accessibilityRole="radiogroup" accessibilityLabel="Tenant coverage scenarios">
            {homeOptions.map((option, index) => <Choice key={option.title} title={option.title} detail={option.detail} selected={homeChoice === index} onPress={() => setHomeChoice(index)} />)}
          </View>
          <Panel>
            <Kicker>Coverage amount</Kicker>
            <Text style={st.price}>${homeOptions[homeChoice].value.toLocaleString('en-CA')}</Text>
            <Body style={st.note}>Contents coverage only. The address, deductible, liability, and claims answers stay unchanged.</Body>
            <Button label="Use this coverage" onPress={() => setAnswers({ contentsValue: homeOptions[homeChoice].value })} />
            {answers.contentsValue === homeOptions[homeChoice].value ? <Text accessibilityLiveRegion="polite" style={st.saved}>Saved to your tenant quote.</Text> : null}
          </Panel>
        </>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  title: { marginTop: 28, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  lead: { marginTop: 9, marginBottom: 18, color: C.dim },
  kicker: { marginTop: 14 },
  price: { marginTop: 7, marginBottom: 7, fontFamily: F.sansBold, fontWeight: '600', fontSize: 36, color: C.ink },
  unit: { fontFamily: F.sans, fontSize: 16, color: C.dim },
  note: { marginBottom: 16, fontSize: 14, color: C.dim },
  saved: { marginTop: 12, fontFamily: F.sansMedium, fontWeight: '500', color: C.moss },
});
