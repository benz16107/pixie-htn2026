import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Body, Button, Dim, Kicker, Screen, Title } from '@/components/ui';
import { scanInventory, type InventoryLine, type InventoryOutcome } from '@/lib/api';
import { useQuote } from '@/lib/store';
import { C, CONTENTS_MAX, CONTENTS_MIN, F, money } from '@/lib/theme';

type EditableLine = InventoryLine & { included: boolean; value: number };
type Phase = 'empty' | 'scanning' | 'error' | 'result';

const midpoint = (l: InventoryLine) => Math.round((l.low + l.high) / 2 / 5) * 5;
const clampToRange = (n: number, l: InventoryLine) => Math.max(0, Math.min(l.high, n));

const confidenceWord = (c: number) => (c >= 0.75 ? 'confident' : c >= 0.45 ? 'somewhat sure' : 'a guess');

function Photo({ uri, onRemove }: { uri: string; onRemove: () => void }) {
  return (
    <View style={st.thumbWrap}>
      <Image source={{ uri }} style={st.thumb} contentFit="cover" transition={150} accessibilityLabel="A photo of your apartment" />
      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel="Remove this photo"
        hitSlop={8}
        style={st.thumbRemove}
      >
        <Text style={{ color: C.paper, fontFamily: F.sansBold, fontSize: 13 }}>×</Text>
      </Pressable>
    </View>
  );
}

function Line({ l, i, onToggle, onAdjust }: { l: EditableLine; i: number; onToggle: () => void; onAdjust: (v: number) => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(200).delay(i * 50)} layout={LinearTransition} style={[st.line, !l.included && st.lineOff]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: l.included }}
        accessibilityLabel={`${l.item}. ${money(l.value)}. ${l.included ? 'Included' : 'Excluded'}. ${confidenceWord(l.confidence)} identification. Estimated range ${money(l.low)} to ${money(l.high)}.`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <View style={[st.checkbox, l.included && st.checkboxOn]} />
        <View style={{ flex: 1 }}>
          <Text style={st.itemTitle}>
            {l.item}
            {l.quantity > 1 ? ` ×${l.quantity}` : ''}
          </Text>
          <Dim style={{ fontSize: 13 }}>
            {l.category} · {confidenceWord(l.confidence)} · range {money(l.low)}–{money(l.high)}
          </Dim>
        </View>
      </Pressable>
      {l.included ? (
        <View style={st.adjustRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Lower ${l.item} value`}
            hitSlop={8}
            style={st.adjustBtn}
            onPress={() => onAdjust(clampToRange(l.value - 10, l))}
          >
            <Text style={st.adjustText}>−</Text>
          </Pressable>
          <Text style={st.adjustValue}>{money(l.value)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Raise ${l.item} value`}
            hitSlop={8}
            style={st.adjustBtn}
            onPress={() => onAdjust(clampToRange(l.value + 10, l))}
          >
            <Text style={st.adjustText}>+</Text>
          </Pressable>
        </View>
      ) : null}
    </Animated.View>
  );
}

export default function Inventory() {
  const { place, setAnswers } = useQuote();
  const [photos, setPhotos] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>('empty');
  const [error, setError] = useState('');
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [cached, setCached] = useState(false);

  if (!place) return <Redirect href="/" />;

  const haptic = (fn: () => Promise<unknown>) => Platform.OS !== 'web' && fn().catch(() => {});

  const addPhotos = async (from: 'camera' | 'library') => {
    if (photos.length >= 4) return;
    const perm = from === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(`We need ${from === 'camera' ? 'camera' : 'photo library'} access to scan your apartment. You can still enter contents value by hand.`);
      setPhase('error');
      return;
    }
    const result =
      from === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: true, selectionLimit: 4 - photos.length });
    if (result.canceled) return;
    setError('');
    setPhase('empty');
    setPhotos((p) => [...p, ...result.assets.map((a) => a.uri)].slice(0, 4));
  };

  const removePhoto = (uri: string) => setPhotos((p) => p.filter((u) => u !== uri));

  const scan = async () => {
    setPhase('scanning');
    setError('');
    const outcome: InventoryOutcome = await scanInventory(photos);
    if ('error' in outcome) {
      setError(outcome.error);
      setPhase('error');
      return;
    }
    if (!outcome.result.lines.length) {
      setError('Gemini could not make out any belongings in that photo. Try a wider, brighter shot of the room, or enter the value yourself.');
      setPhase('error');
      return;
    }
    setLines(outcome.result.lines.map((l) => ({ ...l, included: true, value: midpoint(l) })));
    setCached(outcome.result.cached);
    setPhase('result');
    haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  };

  const toggle = (id: number) => {
    haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, included: !l.included } : l)));
  };
  const adjust = (id: number, v: number) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, value: v } : l)));

  const total = lines.filter((l) => l.included).reduce((s, l) => s + l.value, 0);
  const suggested = Math.min(CONTENTS_MAX, Math.max(CONTENTS_MIN, Math.round(total / 1000) * 1000));

  const confirm = () => {
    setAnswers({ contentsValue: suggested });
    haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    router.back();
  };

  return (
    <Screen
      footer={
        phase === 'result' ? (
          <>
            <Button label={`Use ${money(suggested)} as my contents value`} onPress={confirm} />
            <Button kind="link" label="Rescan" onPress={() => setPhase('empty')} />
          </>
        ) : photos.length ? (
          <>
            <Button label={phase === 'scanning' ? 'Reading your photos…' : 'Estimate my contents from these photos'} onPress={scan} disabled={phase === 'scanning'} />
            <Button kind="link" label="Enter the value myself instead" onPress={() => router.back()} />
          </>
        ) : (
          <Button kind="link" label="Enter the value myself instead" onPress={() => router.back()} />
        )
      }
    >
      <Kicker>Contents value</Kicker>
      <Title style={{ marginTop: 4, fontSize: 26, lineHeight: 30 }}>Photograph your apartment</Title>
      <Body style={{ marginTop: 8 }}>
        Take or pick a few photos of your room. Gemini lists what it can see and an honest value range for
        each thing; you accept or edit every line before it becomes a number. Code adds it up, not the model.
      </Body>

      {phase !== 'result' ? (
        <>
          <View style={st.photoRow}>
            {photos.map((uri) => (
              <Photo key={uri} uri={uri} onRemove={() => removePhoto(uri)} />
            ))}
            {photos.length < 4 ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button kind="secondary" label="Camera" onPress={() => addPhotos('camera')} disabled={phase === 'scanning'} />
                <Button kind="secondary" label="Library" onPress={() => addPhotos('library')} disabled={phase === 'scanning'} />
              </View>
            ) : null}
          </View>

          {phase === 'scanning' ? (
            <View style={{ marginTop: 20 }} accessible accessibilityLabel="Gemini is reading your photos">
              <ActivityIndicator color={C.ink} />
              <View style={[st.skeleton, { height: 18, marginTop: 16, width: '70%' }]} />
              <View style={[st.skeleton, { height: 18, marginTop: 10, width: '55%' }]} />
              <View style={[st.skeleton, { height: 18, marginTop: 10, width: '62%' }]} />
            </View>
          ) : null}

          {phase === 'error' ? (
            <Body role="alert" accessibilityLiveRegion="polite" style={{ marginTop: 16, color: C.rust }}>
              {error}
            </Body>
          ) : null}
        </>
      ) : (
        <View style={{ marginTop: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Kicker>What Gemini saw</Kicker>
            {cached ? <Dim style={{ fontSize: 12 }}>Cached result</Dim> : null}
          </View>
          {lines.map((l, i) => (
            <Line key={l.id} l={l} i={i} onToggle={() => toggle(l.id)} onAdjust={(v) => adjust(l.id, v)} />
          ))}
          <View style={st.totalRow}>
            <Text style={st.totalLabel}>Total ({lines.filter((l) => l.included).length} of {lines.length} items)</Text>
            <Text style={st.totalValue}>{money(total)}</Text>
          </View>
          <Dim style={{ fontSize: 13, marginTop: 6 }}>
            Rounded to {money(suggested)} for the pricing table. Ranges are Gemini's honest uncertainty, not a
            precise appraisal -- uncheck anything wrong, or nudge a line with the − and + buttons.
          </Dim>
        </View>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  thumbWrap: { width: 84, height: 84, borderRadius: 14, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%', backgroundColor: C.land },
  thumbRemove: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(47,42,34,0.75)', alignItems: 'center', justifyContent: 'center' },
  skeleton: { backgroundColor: C.land, borderRadius: 12 },
  line: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.rule, borderStyle: 'dashed' },
  lineOff: { opacity: 0.45 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: C.dim },
  checkboxOn: { borderColor: C.ink, backgroundColor: C.moss },
  itemTitle: { fontFamily: F.sansMedium, fontSize: 16, color: C.ink },
  adjustRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginLeft: 30 },
  adjustBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  adjustText: { fontFamily: F.monoMedium, fontSize: 18, color: C.ink },
  adjustValue: { fontFamily: F.mono, fontSize: 15, color: C.ink, minWidth: 72 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: 2, borderTopColor: C.ink, paddingTop: 10, marginTop: 4 },
  totalLabel: { fontFamily: F.sansBold, fontSize: 16, color: C.ink },
  totalValue: { fontFamily: F.monoMedium, fontSize: 20, color: C.ink },
});
