import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ActionCard, ChecklistItem, ConsumerHeader, MiniStat, Panel, ProductSwitch } from '@/components/consumer';
import { Body, Button, Kicker, Screen, Title } from '@/components/ui';
import { AUTO_PROTECT_ACTIONS, HOME_PROTECT_ACTIONS } from '@/lib/consumer';
import { useQuote } from '@/lib/store';
import { C, F } from '@/lib/theme';

export default function ProtectScreen() {
  const { product, setProduct, driveSummary } = useQuote();
  const [done, setDone] = useState<string[]>([]);
  const actions = product === 'home' ? HOME_PROTECT_ACTIONS : AUTO_PROTECT_ACTIONS;
  const toggle = (id: string) => setDone((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const completed = actions.filter((action) => done.includes(action.id)).length;

  return (
    <Screen>
      <ConsumerHeader title="Stay prepared" detail="Small actions now can make a hard day easier." />
      <ProductSwitch product={product} onChange={setProduct} />
      <Title style={st.title}>{product === 'auto' ? 'Your driving insights' : 'Your home checklist'}</Title>
      <Body style={st.lead}>{product === 'auto' ? 'Start a drive to combine phone-measured speed events with the road context around you.' : 'Keep a short record of prevention work and the belongings that matter.'}</Body>
      <Text accessibilityLiveRegion="polite" style={st.progress}>{completed} of {actions.length} recorded</Text>
      {product === 'auto' ? (
        <Panel tone={driveSummary ? 'warm' : 'ink'}>
          <Kicker style={driveSummary ? undefined : st.inverseKicker}>{driveSummary ? 'LATEST DRIVE' : 'DRIVE SCORE'}</Kicker>
          {driveSummary ? (
            <>
              <View style={st.scoreStats}>
                <MiniStat value={String(driveSummary.score)} label="OVERALL" />
                <MiniStat value={String(driveSummary.behaviorScore)} label="DRIVING" />
                <MiniStat value={String(Math.round(driveSummary.routeContextScore))} label="ROAD" />
              </View>
              <Body style={st.summary}>{driveSummary.area} · {driveSummary.distanceKm.toFixed(1)} km · {driveSummary.speedingEvents + driveSummary.hardBrakeEvents} events</Body>
            </>
          ) : <Body style={st.inverseBody}>No drive recorded yet. Start a foreground session to create your first coaching score.</Body>}
          <View style={st.buttonGap}><Button label={driveSummary ? 'View driving insights' : 'Start my first drive'} onPress={() => router.push('/driving-context')} /></View>
        </Panel>
      ) : null}
      {actions.map((action) => <ChecklistItem key={action.id} title={action.title} detail={action.detail} checked={done.includes(action.id)} onPress={() => toggle(action.id)} />)}
      {product === 'home' ? (
        <Button kind="secondary" label="Open room inventory" onPress={() => router.push('/home-inventory')} />
      ) : null}
      <Body style={st.note}>Keep receipts, dates, and photos with the record. An advisor can confirm which details matter to your policy.</Body>
    </Screen>
  );
}

const st = StyleSheet.create({
  title: { marginTop: 24 },
  lead: { marginTop: 9, marginBottom: 18, color: C.dim },
  progress: { marginBottom: 10, fontFamily: F.monoMedium, fontSize: 13, color: C.moss },
  scoreStats: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  summary: { marginTop: 4, color: C.dim, fontSize: 13 },
  buttonGap: { marginTop: 14 },
  inverseKicker: { color: '#AFC1C4' },
  inverseBody: { marginTop: 9, color: '#F7F3E9' },
  note: { marginTop: 18, marginBottom: 24, fontSize: 13, lineHeight: 19, color: C.dim },
});
