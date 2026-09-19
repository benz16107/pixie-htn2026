import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { Redirect, router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Choice, Dim, Kicker, Screen, Title } from '@/components/ui';
import type { Answers } from '@/lib/api';
import { useQuote } from '@/lib/store';
import { C, CONTENTS_MAX as MAX, CONTENTS_MIN as MIN, CONTENTS_STEP as STEP, F } from '@/lib/theme';

const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

function Unit({ a, set }: { a: Answers; set: (p: Partial<Answers>) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Where is your unit">
      <Choice title="Basement" detail="Any part of the unit is below ground level." selected={a.unitLevel === 'basement'} onPress={() => set({ unitLevel: 'basement' })} />
      <Choice title="Ground floor" detail="Street level, with no floor below it in the unit." selected={a.unitLevel === 'ground'} onPress={() => set({ unitLevel: 'ground' })} />
      <Choice title="Upper floor" detail="Second floor or higher." selected={a.unitLevel === 'upper'} onPress={() => set({ unitLevel: 'upper' })} />
      <Dim style={{ fontSize: 14, marginTop: 4 }}>
        We ask because basement and ground-floor units are the ones sewer backups reach.
      </Dim>
    </View>
  );
}

function Stepper({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label === '−' ? 'Decrease' : 'Increase'} by ${usd(STEP)}`}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [st.step, pressed && { backgroundColor: C.land }, disabled && { opacity: 0.4 }]}
    >
      <Text style={st.stepText}>{label}</Text>
    </Pressable>
  );
}

function Contents({ a, set }: { a: Answers; set: (p: Partial<Answers>) => void }) {
  const v = a.contentsValue;
  const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));
  const lastDetent = useRef(v);
  const tick = (n: number) => {
    if (n !== lastDetent.current && Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
    lastDetent.current = n;
    set({ contentsValue: n });
  };
  return (
    <View>
      <Text style={st.big} accessibilityLiveRegion="polite" accessibilityLabel={`Contents value ${usd(v)}`}>
        {usd(v)}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <Stepper label="−" disabled={v <= MIN} onPress={() => tick(clamp(v - STEP))} />
        <Slider
          style={{ flex: 1, height: 44 }}
          minimumValue={MIN}
          maximumValue={MAX}
          step={STEP}
          value={v}
          onValueChange={(n) => tick(clamp(Math.round(n / STEP) * STEP))}
          minimumTrackTintColor={C.moss}
          maximumTrackTintColor={C.rule}
          thumbTintColor={C.ink}
          accessibilityLabel="Contents value"
          accessibilityValue={{ min: MIN, max: MAX, now: v, text: usd(v) }}
        />
        <Stepper label="+" disabled={v >= MAX} onPress={() => tick(clamp(v + STEP))} />
      </View>
      <Dim style={{ fontSize: 14, marginTop: 12 }}>
        A rough guess is fine. Most one-bedroom renters land between $20,000 and $40,000: furniture, clothes, laptop,
        phone, kitchen things. Each $1,000 above $20,000 adds $4 a year.
      </Dim>
      <Pressable
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          router.push('/inventory');
        }}
        accessibilityRole="button"
        accessibilityLabel="Or photograph your apartment to estimate this number"
        accessibilityHint="Opens the camera so Gemini can list what it sees and add up a starting value"
        style={({ pressed }) => [st.scanLink, pressed && { backgroundColor: C.land }]}
      >
        <Text style={st.scanLinkText}>Or photograph your apartment instead</Text>
      </Pressable>
    </View>
  );
}

function Choices({ a, set }: { a: Answers; set: (p: Partial<Answers>) => void }) {
  return (
    <View>
      <Kicker style={{ marginBottom: 8 }}>Deductible</Kicker>
      <View accessibilityRole="radiogroup" accessibilityLabel="Deductible">
        <Choice title="$500" detail="You pay the first $500 of a claim. Adds $15 a year." selected={a.deductible === 500} onPress={() => set({ deductible: 500 })} />
        <Choice title="$1,000" detail="The usual choice. No change." selected={a.deductible === 1000} onPress={() => set({ deductible: 1000 })} />
        <Choice title="$2,500" detail="Saves $20 a year; you cover more of a small claim." selected={a.deductible === 2500} onPress={() => set({ deductible: 2500 })} />
      </View>
      <Kicker style={{ marginBottom: 8, marginTop: 18 }}>Liability</Kicker>
      <View accessibilityRole="radiogroup" accessibilityLabel="Liability limit">
        <Choice title="$1 million" detail="Covers damage or injury you cause to others. The usual choice." selected={a.liability === 1_000_000} onPress={() => set({ liability: 1_000_000 })} />
        <Choice title="$2 million" detail="Double the cover. Adds $12 a year." selected={a.liability === 2_000_000} onPress={() => set({ liability: 2_000_000 })} />
      </View>
    </View>
  );
}

const QUESTIONS = [
  { title: 'Where is your unit?', lead: 'One tap.', Body: Unit },
  { title: 'What would it cost to replace your things?', lead: 'Drag, or use the minus and plus buttons.', Body: Contents },
  { title: 'Deductible and liability', lead: 'What you pay per claim, and how much we cover if you damage someone else’s property.', Body: Choices },
];

export default function Question() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const { place, answers, setAnswers } = useQuote();
  const i = Math.min(Math.max(Number(step) || 1, 1), 3) - 1;
  if (!place) return <Redirect href="/" />;
  const Q = QUESTIONS[i];
  const last = i === QUESTIONS.length - 1;
  return (
    <Screen
      footer={<Button label={last ? 'See my quote' : 'Next question'} onPress={() => router.push(last ? '/quote' : `/questions/${i + 2}`)} />}
    >
      <Stack.Screen options={{ title: `Question ${i + 1} of 3` }} />
      <Kicker>
        Question {i + 1} of 3 · {place.address}
      </Kicker>
      <Title style={{ marginTop: 4, fontSize: 26, lineHeight: 31 }}>{Q.title}</Title>
      <Body style={{ marginTop: 6, marginBottom: 18, color: C.dim }}>{Q.lead}</Body>
      <Q.Body a={answers} set={setAnswers} />
    </Screen>
  );
}

const st = StyleSheet.create({
  big: { fontFamily: F.monoMedium, fontSize: 40, color: C.ink, fontVariant: ['tabular-nums'] },
  step: { width: 48, height: 48, borderRadius: 4, borderWidth: 1, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: F.monoMedium, fontSize: 24, color: C.ink },
  scanLink: { marginTop: 18, minHeight: 44, justifyContent: 'center', borderRadius: 4, borderWidth: 1, borderColor: C.rule, borderStyle: 'dashed', paddingHorizontal: 12 },
  scanLinkText: { fontFamily: F.sansMedium, fontSize: 15, color: C.ink, textDecorationLine: 'underline' },
});
