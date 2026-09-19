import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import { Redirect, router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as Speech from 'expo-speech';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion, useReducedMotion } from 'react-native-reanimated';
import { Body, Button, Dim, Kicker, Mono, Screen, Title } from '@/components/ui';
import { nearbyContext, quoteTenant, speechUrl, verifyReceipt, WEB_URL, type Answers, type ContextNote, type QuoteResult, type QuoteView, type ReceiptLine, type VerifyResult } from '@/lib/api';
import { useQuote } from '@/lib/store';
import { C, F, money } from '@/lib/theme';

const enter = (i: number) => FadeInDown.duration(220).delay(60 + i * 60).reduceMotion(ReduceMotion.System);

// The words Speech/Gemini TTS actually reads: the decision, the price, and the top two factors by
// dollar impact -- never a number the receipt does not already show.
function quoteSpeechText(q: QuoteView): string {
  const top = [...q.receipt.lines]
    .filter((l) => l.dollars !== 0)
    .sort((a, b) => Math.abs(b.dollars) - Math.abs(a.dollars))
    .slice(0, 2);
  const factors = top.map((l) => `${l.label}, ${l.dollars > 0 ? 'adding' : 'saving'} ${money(Math.abs(l.dollars))}`).join('. ');
  const verdict = q.decision.kind === 'approve' ? 'Your quote is approved' : 'Your quote needs an advisor to review it';
  return `${verdict}, at ${money(q.annual)} a year, about ${money(q.monthly)} a month. ${factors ? `The biggest factors: ${factors}.` : ''} ${q.label}`;
}

function receiptHtml(q: QuoteView): string {
  const row = (label: string, dollars: number, source: string, capped = false) => `
    <tr>
      <td style="padding:6px 0;font-family:-apple-system,sans-serif;font-size:14px;">${label}${capped ? ' <b>(capped)</b>' : ''}<div style="font-size:11px;color:#6F6453;">${source}</div></td>
      <td style="padding:6px 0;text-align:right;font-family:Menlo,monospace;font-size:14px;white-space:nowrap;">${dollars >= 0 ? '+' : '−'}$${Math.abs(dollars).toFixed(2)}</td>
    </tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,sans-serif;color:#2F2A22;padding:24px;}
    table{width:100%;border-collapse:collapse;} tr{border-top:1px solid #D4CAB4;}
    h1{font-size:22px;margin:0 0 4px;} h2{font-size:32px;margin:4px 0 12px;}
  </style></head><body>
    <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#6F6453;">${q.address}</div>
    <h1>${q.decision.kind === 'approve' ? 'Approved' : 'Referred to an advisor'} · #${q.caseId}</h1>
    <h2>${money(q.annual)} <span style="font-size:16px;color:#6F6453;">a year, about ${money(q.monthly)} a month</span></h2>
    <table>
      ${row('Base price', q.receipt.base, '$20,000 contents, $1M liability, $1,000 deductible (invented constant)')}
      ${q.receipt.lines.map((l) => row(l.label, l.dollars, l.source, l.capped)).join('')}
      <tr style="border-top:2px solid #2F2A22;"><td style="padding-top:10px;font-weight:600;">Total</td><td style="padding-top:10px;text-align:right;font-family:Menlo,monospace;font-weight:600;">${money(q.annual)}</td></tr>
    </table>
    <p style="font-size:12px;color:#6F6453;margin-top:18px;">${q.label}</p>
  </body></html>`;
}

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
  const [context, setContext] = useState<ContextNote | 'loading' | 'unavailable'>('loading');
  const [speaking, setSpeaking] = useState(false);
  const [verify, setVerify] = useState<VerifyResult | 'loading' | undefined>(undefined);
  const sheetRef = useRef<BottomSheet>(null);
  const reduced = useReducedMotion();
  const nicePlayer = useAudioPlayer(null);
  const sheetSnapPoints = useMemo(() => ['42%'], []);

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

  useEffect(() => {
    if (!place) return;
    let live = true;
    setContext('loading');
    nearbyContext(place, 'consumer').then((c) => live && setContext(c ?? 'unavailable'));
    return () => {
      live = false;
    };
  }, [place]);

  useEffect(
    () => () => {
      Speech.stop();
    },
    [],
  );

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
  const topFactors = [...q.receipt.lines].filter((l) => l.dollars !== 0).sort((a, b) => Math.abs(b.dollars) - Math.abs(a.dollars)).slice(0, 3);

  const readAloud = () => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSpeaking(true);
    Speech.speak(quoteSpeechText(q), { onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false), onError: () => setSpeaking(false) });
  };

  const playNiceVoice = () => {
    const uri = speechUrl(quoteSpeechText(q));
    if (!uri) return;
    Speech.stop();
    setSpeaking(false);
    nicePlayer.replace({ uri });
    nicePlayer.play();
  };

  const askGeminiToCheck = async () => {
    setVerify('loading');
    const v = await verifyReceipt(q.receipt.base, q.receipt.lines, cents / 100);
    setVerify(v);
    if (v && Platform.OS !== 'web') Haptics.notificationAsync(v.matches ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
  };

  const sharePdf = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html: receiptHtml(q) });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Your Pixie quote' });
      }
    } catch {
      // expo-print/expo-sharing are Expo Go-included but the share sheet can still be cancelled or
      // unavailable on a given device; a silent no-op beats a crash for a non-critical export.
    }
  };

  return (
    <>
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

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <View style={{ flex: 1 }}>
          <Button kind="secondary" label={speaking ? 'Stop reading' : 'Read my quote'} hint="Speaks the decision and the biggest factors aloud" onPress={readAloud} />
        </View>
        <View style={{ flex: 1 }}>
          <Button kind="secondary" label="Share as PDF" hint="Makes a PDF of this receipt and opens the share sheet" onPress={sharePdf} />
        </View>
      </View>
      {speaking ? (
        <Pressable
          onPress={playNiceVoice}
          accessibilityRole="button"
          accessibilityLabel="Read it again in a nicer, Gemini-generated voice"
          style={{ minHeight: 44, justifyContent: 'center', marginTop: 4 }}
        >
          <Text style={{ fontFamily: F.sansMedium, fontSize: 14, color: C.dim, textDecorationLine: 'underline' }}>
            Hear it in a nicer voice (Gemini)
          </Text>
        </Pressable>
      ) : null}

      <View style={st.advisory} accessible accessibilityLabel="What's around you. Advisory only, this never changes your price.">
        <Kicker style={{ color: C.ink }}>What's around you</Kicker>
        {context === 'loading' ? (
          <View style={[st.skeleton, { height: 16, marginTop: 8, width: '80%' }]} />
        ) : context === 'unavailable' ? (
          <Dim style={{ fontSize: 14, marginTop: 6 }}>Could not reach Gemini for local context right now.</Dim>
        ) : (
          <>
            <Body style={{ fontSize: 15, marginTop: 6 }}>{context.note}</Body>
            {context.citations.map((c) => (
              <Pressable key={c.uri} onPress={() => WebBrowser.openBrowserAsync(c.uri)} accessibilityRole="link" accessibilityLabel={c.title} style={{ minHeight: 32, justifyContent: 'center' }}>
                <Text style={{ fontFamily: F.sansMedium, fontSize: 13, color: C.ink, textDecorationLine: 'underline' }}>{c.title}</Text>
              </Pressable>
            ))}
          </>
        )}
        <Text style={st.advisoryLabel}>{context !== 'loading' && context !== 'unavailable' ? context.label : 'Advisory only. This never changes your price.'}</Text>
      </View>

      <View style={{ marginTop: 22 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Kicker>Why this price</Kicker>
          <Kicker style={{ color: exact ? C.moss : C.rust }}>{exact ? '✓ Lines add up exactly' : '× Lines do not add up'}</Kicker>
        </View>
        {!reduced ? (
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
              sheetRef.current?.snapToIndex(0);
            }}
            accessibilityRole="button"
            accessibilityLabel="Peek the top factors in a pull-up sheet"
            style={{ minHeight: 32, marginBottom: 8 }}
          >
            <Dim style={{ fontSize: 13 }}>Or pull up a quick peek of the top factors ↑ (the full list below always works too)</Dim>
          </Pressable>
        ) : null}
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

        {verify === undefined ? (
          <Pressable onPress={askGeminiToCheck} accessibilityRole="button" accessibilityLabel="Ask Gemini to independently check this arithmetic with code execution" style={{ minHeight: 32, marginTop: 10 }}>
            <Dim style={{ fontSize: 13, textDecorationLine: 'underline' }}>Ask Gemini to double-check this arithmetic</Dim>
          </Pressable>
        ) : verify === 'loading' ? (
          <Dim style={{ fontSize: 13, marginTop: 10 }}>Gemini is writing and running Python to check…</Dim>
        ) : (
          <View style={st.verifyBox} accessible accessibilityLabel={`Gemini ran code and ${verify.matches ? 'confirmed' : 'could not confirm'} the total. ${verify.output}`}>
            <Kicker style={{ color: verify.matches ? C.moss : C.rust }}>{verify.matches ? '✓ Gemini confirmed it with code' : '× Gemini could not confirm it'}</Kicker>
            {verify.code ? <Mono style={st.code}>{verify.code}</Mono> : null}
            {verify.output ? <Dim style={{ fontSize: 13, marginTop: 4 }}>{verify.output}</Dim> : null}
          </View>
        )}
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
    {!reduced ? (
      <BottomSheet ref={sheetRef} index={-1} snapPoints={sheetSnapPoints} enablePanDownToClose backgroundStyle={st.sheetBg} handleIndicatorStyle={{ backgroundColor: C.rule }}>
        <BottomSheetView style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <Kicker style={{ marginBottom: 10 }}>Top factors</Kicker>
          {topFactors.map((l) => (
            <View key={l.label} style={st.line}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={st.lineLabel}>{l.label}</Text>
                <View style={st.leader} />
                <Mono style={st.amount}>{l.dollars >= 0 ? '+' : ''}{money(l.dollars)}</Mono>
              </View>
              <Dim style={{ fontSize: 13 }}>{l.source}</Dim>
            </View>
          ))}
          <Dim style={{ fontSize: 13, marginTop: 12 }}>Every line, in order, is in the "Why this price" list on the page.</Dim>
        </BottomSheetView>
      </BottomSheet>
    ) : null}
    </>
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
  advisory: { marginTop: 18, padding: 14, borderRadius: 4, borderWidth: 1, borderColor: C.water, backgroundColor: 'rgba(200,210,203,0.35)' },
  advisoryLabel: { fontFamily: F.sansMedium, fontSize: 12, color: C.dim, marginTop: 10 },
  sheetBg: { backgroundColor: C.paper },
  verifyBox: { marginTop: 10, padding: 10, borderRadius: 4, borderWidth: 1, borderColor: C.rule, backgroundColor: C.land },
  code: { fontSize: 12, lineHeight: 17, color: C.ink, marginTop: 6 },
});
