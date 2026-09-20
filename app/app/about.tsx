import * as WebBrowser from 'expo-web-browser';
import { Pressable, Text, View } from 'react-native';
import { Body, Dim, Kicker, Screen, Title } from '@/components/ui';
import { C, F } from '@/lib/theme';

const SOURCES = [
  { name: 'Toronto Police Service, Break and Enter (2023-2026)', use: 'Break-ins near you. Prices contents theft only.', url: 'https://data.torontopolice.on.ca/' },
  { name: 'City of Toronto, Basement Flooding Study Areas', use: 'Water factor for basement and ground-floor units, and the sewer backup recommendation.', url: 'https://open.toronto.ca/dataset/basement-flooding-study-areas/' },
  { name: 'City of Toronto, Fire Station Locations and Fire Hydrants', use: 'Fire protection: station distance and a hydrant within 150 m.', url: 'https://open.toronto.ca/dataset/fire-station-locations/' },
  { name: 'OpenStreetMap Nominatim', use: 'Turns the address you type into a map point.', url: 'https://nominatim.org/' },
];

const GUARDRAILS = [
  ['Peril-matched', 'Each place factor only prices the loss it measures: break-ins price theft of your things, flooding areas price water damage. There is no "bad neighbourhood" factor.'],
  ['Capped', 'Each factor stays between ×0.92 and ×1.10, and all place factors together between ×0.85 and ×1.25. The receipt marks a line CAPPED when a cap applied.'],
  ['Smoothed', 'A block with few reports is pulled toward its neighbourhood, so one bad month does not move a price.'],
  ['No personal traits', 'No age, sex, income, ethnicity or credit. We never ask, and no dataset we use contains them.'],
];

const LIMITS = [
  'Prices are illustrative, from our documented model. They are not an Intact price or an offer of insurance.',
  'The base price and the contents, deductible and liability steps are invented constants, labelled as such on the receipt.',
  'Police place each break-in at the nearest intersection, so the finest honest grid is about one block.',
  'Toronto only. Two or more claims in five years, or a unit in a floodline, goes to an advisor rather than getting a price.',
  'Nothing is stored against your name: a quote keeps the address, your coverage choices and the receipt so an advisor can open it.',
];

export default function About() {
  return (
    <Screen>
      <Title>How Pixie prices a rental</Title>
      <Body style={{ marginTop: 8 }}>
        Code sets every number. An AI model only helps turn messy input into answers and writes plain-language explanations
        from numbers that are already computed. The same engine runs the underwriter desk.
      </Body>

      <Kicker style={{ marginTop: 24, marginBottom: 6 }}>Fairness guardrails</Kicker>
      {GUARDRAILS.map(([h, t]) => (
        <View key={h} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.rule }}>
          <Text style={{ fontFamily: F.sansBold, fontSize: 16, color: C.ink }}>{h}</Text>
          <Body style={{ fontSize: 15 }}>{t}</Body>
        </View>
      ))}

      <Kicker style={{ marginTop: 24, marginBottom: 6 }}>Sources</Kicker>
      {SOURCES.map((s) => (
        <Pressable
          key={s.name}
          onPress={() => WebBrowser.openBrowserAsync(s.url)}
          accessibilityRole="link"
          accessibilityLabel={`${s.name}. ${s.use}`}
          accessibilityHint="Opens the dataset page"
          style={({ pressed }) => ({ paddingVertical: 10, minHeight: 44, borderTopWidth: 1, borderTopColor: C.rule, backgroundColor: pressed ? C.land : 'transparent' })}
        >
          <Text style={{ fontFamily: F.sansMedium, fontSize: 16, color: C.ink, textDecorationLine: 'underline' }}>{s.name}</Text>
          <Dim style={{ fontSize: 14 }}>{s.use}</Dim>
        </Pressable>
      ))}

      <Kicker style={{ marginTop: 24, marginBottom: 6 }}>Limits</Kicker>
      {LIMITS.map((l) => (
        <Body key={l} style={{ fontSize: 15, marginBottom: 8 }}>
          · {l}
        </Body>
      ))}
      <Dim style={{ fontSize: 13, marginTop: 12 }}>
        Built at Hack the North 2026 by one person with AI coding agents. Map data © OpenStreetMap contributors.
      </Dim>
    </Screen>
  );
}
