import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Body, Dim, Kicker, Title } from '@/components/ui';
import type { ConsumerProduct } from '@/lib/consumer';
import { C, F } from '@/lib/theme';

export function ProductSwitch({ product, onChange }: { product: ConsumerProduct; onChange: (product: ConsumerProduct) => void }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Insurance product" style={st.switch}>
      {(['home', 'auto'] as const).map((value) => {
        const selected = product === value;
        return (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={value === 'home' ? 'Home and tenant' : 'Auto'}
            onPress={() => onChange(value)}
            style={({ pressed }) => [st.switchOption, selected && st.switchOptionOn, pressed && st.pressed]}
          >
            <Text style={[st.switchText, selected && st.switchTextOn]}>{value === 'home' ? 'HOME' : 'AUTO'}</Text>
            <Text style={[st.switchNote, selected && st.switchNoteOn]}>{value === 'home' ? 'Home & tenant' : 'Vehicles'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PhaseIntro({ number, phase, title, children }: { number: number; phase: string; title: string; children: ReactNode }) {
  return (
    <View style={st.intro}>
      <Kicker>{String(number).padStart(2, '0')} OF 04 · {phase}</Kicker>
      <Title style={st.title}>{title}</Title>
      <Body style={st.lead}>{children}</Body>
    </View>
  );
}

export function Panel({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'ink' | 'warm' }) {
  return <View style={[st.panel, tone === 'ink' && st.panelInk, tone === 'warm' && st.panelWarm]}>{children}</View>;
}

export function SourceMark({ live }: { live: boolean }) {
  return (
    <Text accessibilityLabel={live ? 'Estimate from shared service' : 'Estimate from bundled demo inputs'} style={[st.source, live && st.sourceLive]}>
      {live ? 'SHARED SERVICE' : 'BUNDLED DEMO'}
    </Text>
  );
}

export function ActionCard({
  title,
  detail,
  meta,
  onPress,
  selected = false,
}: {
  title: string;
  detail: string;
  meta?: string;
  onPress: () => void;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}. ${detail}${meta ? `. ${meta}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [st.action, selected && st.actionOn, pressed && st.pressed]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.actionTitle}>{title}</Text>
        <Dim style={st.actionDetail}>{detail}</Dim>
        {meta ? <Kicker style={st.actionMeta}>{meta}</Kicker> : null}
      </View>
      <Text importantForAccessibility="no" accessibilityElementsHidden style={st.arrow}>›</Text>
    </Pressable>
  );
}

export function ChecklistItem({ title, detail, checked, onPress }: { title: string; detail: string; checked: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => [st.checkRow, checked && st.checkRowOn, pressed && st.pressed]}
    >
      <View style={[st.checkbox, checked && st.checkboxOn]}>
        {checked ? <Text style={st.checkmark}>✓</Text> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.actionTitle}>{title}</Text>
        <Dim style={st.actionDetail}>{detail}</Dim>
      </View>
    </Pressable>
  );
}

export function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={st.stat}>
      <Text style={st.statValue}>{value}</Text>
      <Kicker>{label}</Kicker>
    </View>
  );
}

const st = StyleSheet.create({
  switch: { flexDirection: 'row', borderWidth: 1, borderColor: C.rule, borderRadius: 15, padding: 4, backgroundColor: C.land, gap: 4 },
  switchOption: { flex: 1, minHeight: 54, borderRadius: 11, paddingHorizontal: 14, justifyContent: 'center' },
  switchOptionOn: { backgroundColor: C.ink },
  switchText: { fontFamily: F.sansBold, fontSize: 14, color: C.dim, letterSpacing: 0.8 },
  switchTextOn: { color: C.paper },
  switchNote: { marginTop: 2, fontFamily: F.sans, fontSize: 11, color: C.dim },
  switchNoteOn: { color: '#BFD0D2' },
  pressed: { opacity: 0.72 },
  intro: { paddingTop: 24, paddingBottom: 20 },
  title: { marginTop: 8, fontSize: 34, lineHeight: 37 },
  lead: { marginTop: 10, color: C.dim },
  panel: { borderWidth: 1, borderColor: C.rule, borderRadius: 16, padding: 16, backgroundColor: C.paper },
  panelInk: { backgroundColor: C.ink, borderColor: C.ink },
  panelWarm: { backgroundColor: C.ochreSoft, borderColor: '#E4BBB5' },
  source: { alignSelf: 'flex-start', borderWidth: 1, borderColor: C.ochre, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, fontFamily: F.monoMedium, fontSize: 9, letterSpacing: 0.7, color: C.ochre },
  sourceLive: { borderColor: C.moss, color: C.moss },
  action: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: C.rule, paddingVertical: 14 },
  actionOn: { backgroundColor: C.ochreSoft, paddingHorizontal: 12, borderRadius: 12, borderTopColor: 'transparent' },
  actionTitle: { fontFamily: F.sansBold, fontSize: 16, lineHeight: 21, color: C.ink },
  actionDetail: { marginTop: 3, fontSize: 14, lineHeight: 19 },
  actionMeta: { marginTop: 7, color: C.ochre },
  arrow: { fontFamily: F.sans, fontSize: 30, color: C.ochre, lineHeight: 32 },
  checkRow: { minHeight: 76, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderTopWidth: 1, borderTopColor: C.rule, paddingVertical: 13 },
  checkRowOn: { backgroundColor: '#E4F0EC', paddingHorizontal: 10, borderRadius: 12, borderTopColor: 'transparent' },
  checkbox: { width: 25, height: 25, borderRadius: 7, borderWidth: 1.5, borderColor: C.dim, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: C.moss, borderColor: C.moss },
  checkmark: { fontFamily: F.sansBold, fontSize: 15, color: C.paper },
  stat: { flex: 1, minWidth: 100, paddingVertical: 10 },
  statValue: { fontFamily: F.monoMedium, fontSize: 22, color: C.ink, marginBottom: 5 },
});
