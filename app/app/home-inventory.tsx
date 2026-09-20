import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Panel, SourceMark } from '@/components/consumer';
import { Body, Button, Kicker, Screen, Title } from '@/components/ui';
import { useQuote } from '@/lib/store';
import { C, F } from '@/lib/theme';

const ITEMS = [
  { name: 'Sofa', value: 1400 },
  { name: 'Television', value: 900 },
  { name: 'Laptop', value: 1800 },
  { name: 'Dining set', value: 750 },
];

export default function HomeInventoryScreen() {
  const { answers } = useQuote();
  const [scanned, setScanned] = useState(false);
  const [saved, setSaved] = useState(false);
  const total = ITEMS.reduce((sum, item) => sum + item.value, 0);
  return (
    <Screen>
      <Kicker>Home & tenant · room inventory</Kicker>
      <Title style={st.title}>Your belongings</Title>
      <Body style={st.lead}>Review the example inventory and keep track of what you would need to replace.</Body>
      {!scanned ? (
        <Panel>
          <Text style={st.room}>LIVING ROOM</Text>
          <Text style={st.scanTitle}>Start with four common household items.</Text>
          <Body style={st.inverse}>This example includes furniture and electronics. Review the items and their estimated values.</Body>
          <View style={{ marginTop: 18 }}><Button label="Preview room inventory" onPress={() => setScanned(true)} /></View>
        </Panel>
      ) : (
        <Panel>
          <SourceMark live={false} />
          <Kicker style={{ marginTop: 14 }}>Example items</Kicker>
          {ITEMS.map((item) => (
            <View key={item.name} style={st.row}><Text style={st.item}>{item.name}</Text><Text style={st.value}>${item.value.toLocaleString('en-CA')}</Text></View>
          ))}
          <View style={st.totalRow}><Text style={st.totalLabel}>Room total</Text><Text style={st.total}>${total.toLocaleString('en-CA')}</Text></View>
          <Button label="Save reviewed inventory" onPress={() => setSaved(true)} />
          {saved ? <Text accessibilityLiveRegion="polite" style={st.saved}>Saved to your protection record.</Text> : null}
        </Panel>
      )}
      <Body style={st.context}>Your tenant estimate currently uses ${answers.contentsValue.toLocaleString('en-CA')} of contents coverage. This room inventory totals ${total.toLocaleString('en-CA')}; saving it does not change that coverage amount.</Body>
    </Screen>
  );
}

const st = StyleSheet.create({
  title: { marginTop: 8 },
  lead: { marginTop: 10, marginBottom: 20, color: C.dim },
  room: { fontFamily: F.monoMedium, fontWeight: '500', fontSize: 10, letterSpacing: 1, color: C.dim },
  scanTitle: { marginTop: 12, fontFamily: F.sansBold, fontWeight: '600', fontSize: 23, lineHeight: 28, color: C.ink },
  inverse: { marginTop: 8, color: C.dim, fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.rule },
  item: { flex: 1, fontFamily: F.sansMedium, fontWeight: '500', fontSize: 15, color: C.ink },
  value: { fontFamily: F.mono, fontSize: 14, color: C.ink },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginVertical: 18 },
  totalLabel: { fontFamily: F.sansBold, fontWeight: '600', fontSize: 16, color: C.ink },
  total: { fontFamily: F.monoMedium, fontWeight: '500', fontSize: 25, color: C.ink },
  saved: { marginTop: 12, fontFamily: F.sansMedium, fontWeight: '500', color: C.moss },
  context: { marginTop: 16, marginBottom: 24, fontSize: 13, lineHeight: 19, color: C.dim },
});
