import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Dim, Kicker } from '@/components/ui';
import type { ConsumerProduct } from '@/lib/consumer';
import { C, F } from '@/lib/theme';

export function ConsumerHeader({ title = 'Good afternoon', detail = 'Here is what is ready for you.' }: { title?: string; detail?: string }) {
  return (
    <View style={st.header}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.wordmark}>PIXIE</Text>
        <Text style={st.headerTitle}>{title}</Text>
        <Text style={st.headerDetail}>{detail}</Text>
      </View>
      <View accessible accessibilityLabel="Profile for Alex" style={st.avatar}><Text style={st.avatarText}>AZ</Text></View>
    </View>
  );
}

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
            <Text style={[st.switchNote, selected && st.switchNoteOn]}>{value === 'home' ? 'My place' : 'My vehicle'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Panel({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'ink' | 'warm' }) {
  return <View style={[st.panel, tone === 'ink' && st.panelInk, tone === 'warm' && st.panelWarm]}>{children}</View>;
}

export function SourceMark({ live }: { live: boolean }) {
  return (
    <Text accessibilityLabel={live ? 'Estimate calculated by the connected service' : 'Illustrative estimate calculated on this device'} style={[st.source, live && st.sourceLive]}>
      {live ? 'CONNECTED ESTIMATE' : 'ILLUSTRATIVE ESTIMATE'}
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

export function MiniStat({ value, label, inverse = false }: { value: string; label: string; inverse?: boolean }) {
  return (
    <View style={st.stat}>
      <Text style={[st.statValue, inverse && st.statValueInverse]}>{value}</Text>
      <Kicker style={inverse ? st.statLabelInverse : undefined}>{label}</Kicker>
    </View>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 18 },
  wordmark: { fontFamily: F.monoMedium, fontSize: 11, letterSpacing: 2.2, color: C.ochre },
  headerTitle: { marginTop: 7, fontFamily: F.sansBold, fontSize: 25, lineHeight: 29, color: C.ink, letterSpacing: -0.35 },
  headerDetail: { marginTop: 3, fontFamily: F.sans, fontSize: 13, lineHeight: 18, color: C.dim },
  avatar: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink },
  avatarText: { color: C.paper, fontFamily: F.sansBold, fontSize: 13, letterSpacing: 0.5 },
  switch: { flexDirection: 'row', borderWidth: 1, borderColor: C.rule, borderRadius: 15, padding: 4, backgroundColor: C.land, gap: 4 },
  switchOption: { flex: 1, minHeight: 54, borderRadius: 11, paddingHorizontal: 14, justifyContent: 'center' },
  switchOptionOn: { backgroundColor: C.ink },
  switchText: { fontFamily: F.sansBold, fontSize: 14, color: C.dim, letterSpacing: 0.8 },
  switchTextOn: { color: C.paper },
  switchNote: { marginTop: 2, fontFamily: F.sans, fontSize: 11, color: C.dim },
  switchNoteOn: { color: '#BFD0D2' },
  pressed: { opacity: 0.72 },
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
  statValueInverse: { color: C.paper },
  statLabelInverse: { color: '#AFC1C4' },
});
