import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { ActionCard, ChecklistItem, PhaseIntro, ProductSwitch } from '@/components/consumer';
import { Body, Button, Screen } from '@/components/ui';
import { AUTO_PROTECT_ACTIONS, HOME_PROTECT_ACTIONS } from '@/lib/consumer';
import { useQuote } from '@/lib/store';
import { C, F } from '@/lib/theme';

export default function ProtectScreen() {
  const { product, setProduct } = useQuote();
  const [done, setDone] = useState<string[]>([]);
  const actions = product === 'home' ? HOME_PROTECT_ACTIONS : AUTO_PROTECT_ACTIONS;
  const toggle = (id: string) => setDone((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const completed = actions.filter((action) => done.includes(action.id)).length;

  return (
    <Screen>
      <ProductSwitch product={product} onChange={setProduct} />
      <PhaseIntro number={3} phase="Protect" title="Do the useful work before a loss.">
        Keep a short record of prevention steps. These records help you stay prepared and do not change your price here.
      </PhaseIntro>
      <Text accessibilityLiveRegion="polite" style={st.progress}>{completed} of {actions.length} recorded</Text>
      {product === 'auto' ? <ActionCard title="Open drive context" detail="Follow a synthetic route and see coaching factors without changing your price." meta="FOREGROUND DEMO" onPress={() => router.push('/driving-context')} /> : null}
      {actions.map((action) => <ChecklistItem key={action.id} title={action.title} detail={action.detail} checked={done.includes(action.id)} onPress={() => toggle(action.id)} />)}
      {product === 'home' ? (
        <Button kind="secondary" label="Open room inventory" onPress={() => router.push('/home-inventory')} />
      ) : null}
      <Body style={st.note}>Keep receipts, dates, and photos with the record. An advisor can confirm which details matter to your policy.</Body>
    </Screen>
  );
}

const st = StyleSheet.create({
  progress: { marginBottom: 10, fontFamily: F.monoMedium, fontSize: 13, color: C.moss },
  note: { marginTop: 18, marginBottom: 24, fontSize: 13, lineHeight: 19, color: C.dim },
});
