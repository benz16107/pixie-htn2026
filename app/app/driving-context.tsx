import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { DrivingNativeAction } from '@/components/DrivingNativeAction';
import { Panel, SourceMark } from '@/components/consumer';
import { Body, Button, Kicker, Screen, Title } from '@/components/ui';
import { endDriveSurfaces, syncDriveSurfaces } from '@/lib/driving-surfaces';
import { assessDrive, type DriveAssessmentResult } from '@/lib/driving';
import { C, F } from '@/lib/theme';

const ZONES = [
  { id: 'residential', name: 'Parkdale streets', context: 'Lower speed, mixed local traffic', factor: 'Road class · local' },
  { id: 'expressway', name: 'Gardiner corridor', context: 'Higher speed, controlled access', factor: 'Road class · expressway' },
  { id: 'downtown', name: 'Downtown core', context: 'Lower speed, dense intersections', factor: 'Road class · urban' },
] as const;

export default function DrivingContextScreen() {
  const [zone, setZone] = useState<(typeof ZONES)[number]>(ZONES[0]);
  const [active, setActive] = useState(false);
  const [locationState, setLocationState] = useState<'idle' | 'working' | 'used' | 'denied'>('idle');
  const [assessment, setAssessment] = useState<DriveAssessmentResult | null>(null);
  const nativeBuild = Platform.OS !== 'web' && Constants.appOwnership !== 'expo';
  const nativeIos = Platform.OS === 'ios' && nativeBuild;

  const toggleDrive = async () => {
    if (active) {
      await endDriveSurfaces();
      setActive(false);
      return;
    }
    syncDriveSurfaces({ zone: zone.name, context: zone.context, factor: zone.factor, active: true });
    setActive(true);
    const next = await assessDrive();
    setAssessment(next);
    syncDriveSurfaces({ zone: zone.name, context: zone.context, factor: `${next.assessment.score} coaching`, active: true });
  };

  const chooseZone = (next: (typeof ZONES)[number]) => {
    setZone(next);
    if (active) syncDriveSurfaces({ zone: next.name, context: next.context, factor: next.factor, active: true });
  };

  const useCurrentArea = async () => {
    setLocationState('working');
    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== 'granted') return setLocationState('denied');
    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { lat: Number(current.coords.latitude.toFixed(3)), lng: Number(current.coords.longitude.toFixed(3)) };
      const shortCoarseSample = [point, { lat: point.lat, lng: Number((point.lng + 0.001).toFixed(3)) }];
      const next = await assessDrive(shortCoarseSample, 0.5);
      setAssessment(next);
      setLocationState('used');
      if (active) syncDriveSurfaces({ zone: 'Current coarse area', context: 'One-time foreground sample', factor: `${next.assessment.score} coaching`, active: true });
    } catch {
      setLocationState('denied');
    }
  };

  return (
    <Screen>
      <Kicker>Auto · Protect</Kicker>
      <Title style={st.title}>Understand the road around you.</Title>
      <Body style={st.lead}>This foreground demo follows a synthetic Toronto route and explains its context. It never changes your estimate.</Body>
      <Panel tone="ink">
        <View accessible accessibilityLabel={`Synthetic route map. Selected zone: ${zone.name}. ${zone.context}.`} style={st.map}>
          <View style={st.roadA} /><View style={st.roadB} /><View style={st.roadC} />
          {ZONES.map((item, index) => <View key={item.id} style={[st.dot, st[`dot${index}` as 'dot0'], item.id === zone.id && st.dotOn]} />)}
          <Text style={st.mapLabel}>SYNTHETIC TORONTO ROUTE</Text>
        </View>
      </Panel>
      <View accessibilityRole="radiogroup" accessibilityLabel="Synthetic route zones" style={st.zones}>
        {ZONES.map((item) => (
          <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: zone.id === item.id }} onPress={() => chooseZone(item)} style={({ pressed }) => [st.zone, zone.id === item.id && st.zoneOn, pressed && { opacity: 0.75 }]}>
            <Text style={st.zoneName}>{item.name}</Text><Text style={st.zoneContext}>{item.context}</Text>
          </Pressable>
        ))}
      </View>
      <Panel tone="warm">
        <SourceMark live={false} />
        <Kicker style={{ marginTop: 12 }}>Visible context factors</Kicker>
        <View style={st.factor}><Text style={st.factorLabel}>Road class</Text><Text style={st.factorValue}>{zone.factor.split(' · ')[1]}</Text></View>
        <View style={st.factor}><Text style={st.factorLabel}>Traffic pattern</Text><Text style={st.factorValue}>{zone.context}</Text></View>
        <Body style={st.disclosure}>These are explanatory synthetic factors. Pixie does not turn this route or raw location history into a premium, and no insurer has approved it.</Body>
      </Panel>
      <View style={{ marginTop: 14 }}>
        <DrivingNativeAction label={active ? 'End foreground drive' : 'Start foreground drive'} onPress={toggleDrive} />
      </View>
      <Text accessibilityLiveRegion="polite" style={st.status}>{active ? `Drive context active: ${zone.name}.` : 'Drive context is off.'}</Text>
      {assessment ? (
        <Panel>
          <SourceMark live={assessment.source === 'shared-api'} />
          <View style={st.scoreRow}><Text style={st.score}>{assessment.assessment.score}</Text><View style={{ flex: 1 }}><Kicker>COMPOSITE · {assessment.assessment.band}</Kicker><Body style={st.scoreLabel}>{assessment.assessment.composite.formula}</Body></View></View>
          <View style={st.factor}><Text style={st.factorLabel}>Behavior score</Text><Text style={st.factorValue}>{assessment.assessment.behaviorScore}</Text></View>
          <View style={st.factor}><Text style={st.factorLabel}>Route context score</Text><Text style={st.factorValue}>{assessment.assessment.routeContextScore}</Text></View>
          {assessment.assessment.factors.map((factor) => <View key={factor.key} style={st.factor}><Text style={st.factorLabel}>{factor.label}</Text><Text style={st.factorValue}>{factor.observed} observed · {factor.effectPoints} pts</Text></View>)}
          {assessment.assessment.routeFactors.slice(0, 2).map((factor) => <View key={factor.key} style={st.factor}><Text style={st.factorLabel}>{factor.label}</Text><Text style={st.factorValue}>{factor.areaLabel} · {factor.contextScore}</Text></View>)}
          <Body style={st.disclosure}>{assessment.assessment.label} The service stores no route and returns no raw coordinates.</Body>
        </Panel>
      ) : null}
      <Panel>
        <Kicker>Foreground location</Kicker>
        <Body style={st.nativeText}>{nativeIos ? 'Starting the drive updates the Pixie widget and opens a Live Activity.' : 'DEV BUILD · The iOS widget and Live Activity require a development build. The foreground demo still works here.'}</Body>
        <Button kind="secondary" label={locationState === 'working' ? 'Reading current area…' : locationState === 'used' ? 'Current area used once' : 'Use current location once'} disabled={Platform.OS === 'web' || locationState === 'working'} onPress={useCurrentArea} />
        <Body style={st.permission}>Optional. Pixie rounds the foreground location to three decimals, sends a coarse two-point area sample, and does not retain or return the coordinates.</Body>
        {locationState === 'denied' ? <Text accessibilityLiveRegion="polite" style={st.denied}>Location was not available. The synthetic route still works.</Text> : null}
      </Panel>
    </Screen>
  );
}

const st = StyleSheet.create({
  title: { marginTop: 8 }, lead: { marginTop: 10, marginBottom: 20, color: C.dim },
  map: { height: 190, overflow: 'hidden' },
  mapLabel: { position: 'absolute', left: 0, bottom: 0, fontFamily: F.monoMedium, fontSize: 10, color: '#AFC1C4', letterSpacing: 0.8 },
  roadA: { position: 'absolute', left: -20, right: -20, top: 45, height: 3, backgroundColor: '#66777A', transform: [{ rotate: '-8deg' }] },
  roadB: { position: 'absolute', left: 40, right: -40, top: 105, height: 6, backgroundColor: C.ochre, transform: [{ rotate: '12deg' }] },
  roadC: { position: 'absolute', left: 145, top: -20, width: 3, height: 230, backgroundColor: '#66777A', transform: [{ rotate: '7deg' }] },
  dot: { position: 'absolute', width: 15, height: 15, borderRadius: 8, backgroundColor: C.paper, borderWidth: 3, borderColor: C.ink },
  dotOn: { width: 22, height: 22, borderRadius: 11, borderColor: C.ochre, backgroundColor: C.paper },
  dot0: { left: '15%', top: 75 }, dot1: { left: '48%', top: 96 }, dot2: { right: '12%', top: 65 },
  zones: { marginVertical: 14, gap: 8 },
  zone: { minHeight: 64, borderWidth: 1, borderColor: C.rule, borderRadius: 13, padding: 12 }, zoneOn: { borderColor: C.ochre, backgroundColor: C.ochreSoft },
  zoneName: { fontFamily: F.sansBold, fontSize: 15, color: C.ink }, zoneContext: { marginTop: 3, fontFamily: F.sans, fontSize: 13, color: C.dim },
  factor: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingTop: 11 },
  factorLabel: { fontFamily: F.sansMedium, fontSize: 14, color: C.dim }, factorValue: { flex: 1, textAlign: 'right', fontFamily: F.sansBold, fontSize: 14, color: C.ink },
  disclosure: { marginTop: 14, fontSize: 13, lineHeight: 19, color: C.dim },
  status: { marginVertical: 12, fontFamily: F.sansMedium, color: C.moss }, nativeText: { marginVertical: 10, fontSize: 14, color: C.dim },
  permission: { marginTop: 10, fontSize: 12, lineHeight: 18, color: C.dim }, denied: { marginTop: 8, fontFamily: F.sansMedium, color: C.rust },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14, marginBottom: 6 }, score: { fontFamily: F.monoMedium, fontSize: 38, color: C.ink }, scoreLabel: { marginTop: 2, fontSize: 13, color: C.dim },
});
