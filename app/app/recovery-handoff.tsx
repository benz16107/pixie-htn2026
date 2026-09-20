import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChecklistItem, Panel } from '@/components/consumer';
import { Body, Button, Kicker, Screen, Title } from '@/components/ui';
import { WEB_URL } from '@/lib/api';
import { RECOVERY_STEPS } from '@/lib/consumer';
import { C, F } from '@/lib/theme';

const EVIDENCE = [
  { id: 'scene', title: 'Whole scene', detail: 'Wide views before close-up damage.' },
  { id: 'damage', title: 'Damage details', detail: 'Clear photos or clips from more than one angle.' },
  { id: 'context', title: 'Original context', detail: 'Time, location, and original file information.' },
  { id: 'notes', title: 'People and notes', detail: 'Witness observations and contact details, with consent.' },
];

export default function RecoveryHandoffScreen() {
  const { product } = useLocalSearchParams<{ product?: string }>();
  const [included, setIncluded] = useState<string[]>([]);
  const [prepared, setPrepared] = useState(false);
  const toggle = (id: string) => setIncluded((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const context = product === 'witness' ? 'Witness report' : product === 'auto' ? 'Auto incident' : 'Home incident';

  return (
    <Screen>
      <Kicker>Pixie + CrashClip · {context}</Kicker>
      <Title style={st.title}>Safety first. Evidence second.</Title>
      <Body style={st.lead}>Do not record while driving or enter an unsafe area. Call emergency services when anyone may be hurt.</Body>
      <Panel tone="warm">
        <Kicker>Before recording</Kicker>
        {RECOVERY_STEPS.map((step, index) => <View key={step} style={st.step}><Text style={st.stepNo}>0{index + 1}</Text><Body style={st.stepText}>{step}</Body></View>)}
      </Panel>
      <Kicker style={st.section}>Evidence bundle</Kicker>
      {EVIDENCE.map((item) => <ChecklistItem key={item.id} title={item.title} detail={item.detail} checked={included.includes(item.id)} onPress={() => toggle(item.id)} />)}
      <Button label="Build reviewed bundle" disabled={included.length === 0} onPress={() => setPrepared(true)} />
      {prepared ? (
        <Panel tone="ink">
          <Text accessibilityLiveRegion="polite" style={st.ready}>{included.length} evidence sections ready</Text>
          <Body style={st.inverse}>You control what leaves this device. Open the advisor handoff to continue the working case flow.</Body>
          <View style={{ marginTop: 16 }}><Button label="Open advisor handoff" onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/intact`)} /></View>
        </Panel>
      ) : null}
      <Body style={st.disclosure}>CrashClip evidence is for post-incident recovery. It is not used here to score a driver or set an insurance price.</Body>
    </Screen>
  );
}

const st = StyleSheet.create({
  title: { marginTop: 8 },
  lead: { marginTop: 10, marginBottom: 20, color: C.dim },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 12 },
  stepNo: { width: 25, fontFamily: F.monoMedium, fontSize: 11, color: C.ochre },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
  section: { marginTop: 24, marginBottom: 4 },
  ready: { fontFamily: F.sansBold, fontSize: 21, color: C.paper },
  inverse: { marginTop: 7, color: '#D8E2E3', fontSize: 14 },
  disclosure: { marginTop: 16, marginBottom: 24, fontSize: 13, lineHeight: 19, color: C.dim },
});
