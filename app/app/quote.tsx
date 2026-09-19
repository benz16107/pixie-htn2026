import * as Haptics from 'expo-haptics';
import { Redirect, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { Body, Button, Dim, Kicker, Mono, Screen, Title } from '@/components/ui';
import { quoteTenant, WEB_URL, type Answers, type QuoteResult, type ReceiptLine } from '@/lib/api';
import { useQuote } from '@/lib/store';
import { C, F, money } from '@/lib/theme';

const enter = (i: number) => FadeInDown.duration(220).delay(60 + i * 60).reduceMotion(ReduceMotion.System);

function Line({ l, i }: { l: ReceiptLine; i: number }) {
  const sign = l.dollars > 0 ? '+' : '';
  return (
    <Animated.View
      entering={enter(i)}
      style={st.line}
      accessible
      accessibilityLabel={`${l.label}: ${l.dollars === 0 ? 'no change' : `${l.dollars > 0 ? 'plus' : 'minus'} ${money(Math.abs(l.dollars))}`}, multiplier ${l.multiplier}${l.capped ? ', capped' : ''}. Source: ${l.source}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text style={st.lineLabel}>{l.label}</Text>
        {l.capped ? <Text style={st.cap}>CAPPED</Text> : null}
        <View style={st.leader} />
        {/* Answer lines are flat dollar steps; only place factors are multipliers worth showing. */}
        {l.source.startsWith('your answer') ? null : <Mono style={{ color: C.dim, fontSize: 13 }}>×{l.multiplier.toFixed(2)}</Mono>}
        <Mono style={st.amount}>
          {sign}
          {money(l.dollars)}
        </Mono>
      </View>
      <Dim style={{ fontSize: 13, lineHeight: 18, marginTop: 2 }}>{l.source}</Dim>
    </Animated.View>
  );
}

const describe = (a: Answers) =>
  `${a.unitLevel} unit, $${a.contentsValue.toLocaleString('en-US')} contents, $${a.deductible.toLocaleString('en-US')} deductible, $${a.liability / 1e6}M liability`;

export default function QuoteScreen() {
  const { place, answers, setPlace } = useQuote();
  const [res, setRes] = useState<QuoteResult | null>(null);

  useEffect(() => {
    if (!place) return;
    let live = true;
    quoteTenant(place, answers).then((r) => {
      if (!live) return;
      setRes(r);
      if ('quote' in r && Platform.OS !== 'web')
        Haptics.notificationAsync(
          r.quote.decision.kind === 'approve' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
        ).catch(() => {});
    });
    return () => {
      live = false;
    };
  }, [place, answers]);

  if (!place) return <Redirect href="/" />;
  if (!res)
    return (
      <Screen>
        <Kicker>{place.address}</Kicker>
        <View style={[st.skeleton, { height: 90 }]} accessibilityLabel="Working out your quote" accessible />
        <View style={[st.skeleton, { height: 220 }]} />
      </Screen>
    );
  if ('error' in res)
    return (
      <Screen footer={<Button label="Try an example address" onPress={() => router.dismissTo('/')} />}>
        <Title style={{ fontSize: 26 }}>We could not price this address</Title>
        <Body style={{ marginTop: 8 }} role="alert">
          {res.error}
        </Body>
      </Screen>
    );

  const q = res.quote;
  const approve = q.decision.kind === 'approve';
  const cents = Math.round(q.receipt.base * 100) + q.receipt.lines.reduce((s, l) => s + Math.round(l.dollars * 100), 0);
  const exact = cents === Math.round(q.annual * 100);
  const differs = res.offline && describe(q.answers) !== describe(answers);

  return (
    <Screen
      footer={
        <>
          <Button
            label="View as underwriter"
            hint="Opens the same case on the underwriter desk in your browser"
            onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}${q.underwriterUrl}`)}
          />
          <Button
            kind="link"
            label="Start a new quote"
            onPress={() => {
              setPlace(null);
              router.dismissTo('/');
            }}
          />
        </>
      }
    >
      <Kicker>{q.address}</Kicker>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }} accessible accessibilityLabel={`${approve ? 'Approved' : 'Referred to an advisor'}. ${money(q.annual)} a year, about ${money(q.monthly)} a month.`}>
        <Text style={[st.chip, approve ? st.approve : st.refer]}>{approve ? 'APPROVED' : 'REFERRED'}</Text>
        <Mono style={{ color: C.dim }}>#{q.caseId}</Mono>
      </View>
      <Text style={st.price}>
        {money(q.annual)}
        <Text style={st.per}> a year</Text>
      </Text>
      <Dim>About {money(q.monthly)} a month</Dim>
      {q.decision.reasons.map((r) => (
        <Body key={r} style={{ marginTop: 6 }}>
          {approve ? '✓ ' : '→ '}
          {r}
        </Body>
      ))}
      {differs ? (
        <Text style={st.note}>
          Offline sample: this is the cached quote for {describe(q.answers)}. Connect to the quote service to price your answers.
        </Text>
      ) : null}

      <View style={{ marginTop: 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Kicker>Why this price</Kicker>
          <Kicker style={{ color: exact ? C.moss : C.rust }}>{exact ? '✓ Lines add up exactly' : '× Lines do not add up'}</Kicker>
        </View>
        <View style={[st.line, { borderTopColor: C.ink, borderTopWidth: 1.5 }]} accessible accessibilityLabel={`Base price ${money(q.receipt.base)}: $20,000 contents, $1 million liability, $1,000 deductible`}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={st.lineLabel}>Base price</Text>
            <View style={st.leader} />
            <Mono style={st.amount}>{money(q.receipt.base)}</Mono>
          </View>
          <Dim style={{ fontSize: 13 }}>$20,000 contents, $1M liability, $1,000 deductible (invented constant)</Dim>
        </View>
        {q.receipt.lines.map((l, i) => (
          <Line key={l.label} l={l} i={i} />
        ))}
        <Animated.View entering={enter(q.receipt.lines.length)} style={[st.line, st.total]}>
          <Text style={[st.lineLabel, { fontFamily: F.sansBold }]}>Total</Text>
          <View style={st.leader} />
          <Mono style={[st.amount, { fontFamily: F.monoMedium, fontSize: 17 }]}>{money(cents / 100)}</Mono>
        </Animated.View>
        <Text style={st.label}>{q.label}</Text>
      </View>

      {q.recommendations.length ? (
        <View style={st.rec}>
          <Kicker style={{ color: C.ochre }}>We recommend</Kicker>
          {q.recommendations.map((r) => (
            <View key={r.addOn} style={{ marginTop: 6 }}>
              <Text style={st.lineLabel}>{r.addOn}</Text>
              <Body style={{ fontSize: 15 }}>{r.why}</Body>
            </View>
          ))}
        </View>
      ) : null}

      <Kicker style={{ marginTop: 22, marginBottom: 4 }}>Next step</Kicker>
      <Body>{q.decision.nextStep}</Body>
      <Dim style={{ fontSize: 13, marginTop: 14 }}>
        No age, sex, income, ethnicity or credit is used. Location factors only price the peril they measure, and each is capped.
      </Dim>
      <Button kind="link" label="How the price is made" onPress={() => router.push('/about')} />
    </Screen>
  );
}

const st = StyleSheet.create({
  skeleton: { backgroundColor: C.land, borderRadius: 4, marginTop: 14 },
  chip: { fontFamily: F.monoMedium, fontSize: 12, letterSpacing: 1.4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, overflow: 'hidden', borderWidth: 1 },
  approve: { backgroundColor: C.moss, borderColor: C.moss, color: C.paper },
  refer: { backgroundColor: C.ochreSoft, borderColor: C.ochre, color: C.ink },
  price: { fontFamily: F.serif, fontSize: 46, lineHeight: 52, color: C.ink, marginTop: 8, fontVariant: ['tabular-nums'] },
  per: { fontFamily: F.sans, fontSize: 18, color: C.dim },
  note: { fontFamily: F.sans, fontSize: 14, lineHeight: 20, color: C.ink, backgroundColor: C.ochreSoft, padding: 10, borderRadius: 4, marginTop: 12 },
  line: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.rule, borderStyle: 'dashed' },
  lineLabel: { fontFamily: F.sansMedium, fontSize: 16, color: C.ink, flexShrink: 1 },
  leader: { flex: 1, minWidth: 8 },
  amount: { fontFamily: F.mono, fontSize: 15, color: C.ink, minWidth: 72, textAlign: 'right' },
  cap: { fontFamily: F.monoMedium, fontSize: 10, letterSpacing: 1, color: C.ink, borderWidth: 1, borderColor: C.ink, paddingHorizontal: 4, borderRadius: 3 },
  total: { flexDirection: 'row', alignItems: 'baseline', gap: 8, borderTopColor: C.ink, borderTopWidth: 2, borderStyle: 'solid' },
  label: { fontFamily: F.sans, fontSize: 13, color: C.dim, marginTop: 6 },
  rec: { marginTop: 22, padding: 14, borderRadius: 4, borderWidth: 1, borderColor: C.ochre, backgroundColor: C.ochreSoft },
});
