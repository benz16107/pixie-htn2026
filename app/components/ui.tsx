import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type TextProps, type ViewStyle } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { C, F } from '@/lib/theme';

const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);

export const Title = (p: TextProps) => <Text accessibilityRole="header" {...p} style={[s.title, p.style]} />;
export const Body = (p: TextProps) => <Text {...p} style={[s.body, p.style]} />;
export const Dim = (p: TextProps) => <Text {...p} style={[s.body, s.dim, p.style]} />;
export const Kicker = (p: TextProps) => <Text {...p} style={[s.kicker, p.style]} />;
export const Mono = (p: TextProps) => <Text {...p} style={[s.mono, p.style]} />;

// Press feedback: scale on press-in through a Reanimated CSS transition, 120ms strong ease-out.
function Pressed({ pressed, children, style }: { pressed: boolean; children: ReactNode; style: ViewStyle | ViewStyle[] }) {
  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale: pressed ? 0.97 : 1 }],
          transitionProperty: 'transform',
          transitionDuration: 120,
          transitionTimingFunction: EASE_OUT,
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'link';
  hint?: string;
  disabled?: boolean;
};

export function Button({ label, onPress, kind = 'primary', hint, disabled }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={kind === 'link' ? 8 : 0}
      pressRetentionOffset={16}
    >
      {({ pressed }) => (
        <Pressed pressed={pressed} style={[s.btn, kind === 'primary' ? s.primary : kind === 'secondary' ? s.secondary : s.link, disabled ? s.disabled : {}]}>
          <Text style={[s.btnText, kind === 'primary' ? { color: C.paper } : kind === 'link' ? s.linkText : {}]}>{label}</Text>
        </Pressed>
      )}
    </Pressable>
  );
}

export function Choice({
  title,
  detail,
  selected,
  onPress,
  role = 'radio',
}: {
  title: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
  role?: 'radio' | 'button';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { checked: selected } : { selected }}
      accessibilityLabel={detail ? `${title}. ${detail}` : title}
    >
      {({ pressed }) => (
        <Pressed pressed={pressed} style={selected ? [s.choice, s.choiceOn] : s.choice}>
          <View style={[s.radio, selected && s.radioOn]} />
          <View style={{ flex: 1 }}>
            <Text style={s.choiceTitle}>{title}</Text>
            {detail ? <Text style={[s.body, s.dim, { fontSize: 14 }]}>{detail}</Text> : null}
          </View>
        </Pressed>
      )}
    </Pressable>
  );
}

// A thin contour texture: used once, behind the first screen's heading.
export function Contours({ height = 180 }: { height?: number }) {
  const paths = [
    [300, 60, 7],
    [40, 150, 5],
  ].flatMap(([cx, cy, n]) =>
    Array.from({ length: n }, (_, i) => {
      const r = (i + 1) * 20;
      let d = '';
      for (let a = 0; a <= 48; a++) {
        const t = (a / 48) * Math.PI * 2;
        const w = r * (1 + 0.12 * Math.sin(3 * t + i) + 0.07 * Math.sin(5 * t + cx));
        d += `${a ? 'L' : 'M'}${(cx + w * Math.cos(t)).toFixed(1)},${(cy + 0.8 * w * Math.sin(t)).toFixed(1)}`;
      }
      return <Path key={`${cx}-${i}`} d={d} fill="none" stroke="#BFB295" strokeWidth={(i + 1) % 3 ? 0.6 : 1.1} opacity={0.6} />;
    }),
  );
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { height }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Svg width="100%" height={height} viewBox={`0 0 390 ${height}`} preserveAspectRatio="xMidYMid slice">
        {paths}
      </Svg>
    </View>
  );
}

// Scrollable content with a bottom bar that stays above the home indicator.
export function Screen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const inset = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.paper }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? <View style={[s.footer, { paddingBottom: Math.max(inset.bottom, 12) }]}>{footer}</View> : null}
    </View>
  );
}

export const s = StyleSheet.create({
  title: { fontFamily: F.serif, fontSize: 30, lineHeight: 34, color: C.ink, letterSpacing: -0.3 },
  body: { fontFamily: F.sans, fontSize: 16, lineHeight: 23, color: C.ink },
  dim: { color: C.dim },
  kicker: { fontFamily: F.sansBold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: C.dim },
  mono: { fontFamily: F.mono, fontSize: 14, color: C.ink, fontVariant: ['tabular-nums'] },
  btn: { minHeight: 48, borderRadius: 4, paddingHorizontal: 18, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: C.ink },
  secondary: { borderWidth: 1, borderColor: C.ink, backgroundColor: C.paper },
  link: { minHeight: 44, paddingHorizontal: 4 },
  disabled: { opacity: 0.45 },
  btnText: { fontFamily: F.sansBold, fontSize: 16, color: C.ink },
  linkText: { textDecorationLine: 'underline', fontFamily: F.sansMedium },
  choice: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', minHeight: 56, padding: 14, borderRadius: 4, borderWidth: 1, borderColor: C.rule, backgroundColor: C.paper, marginBottom: 10 },
  choiceOn: { borderColor: C.ink, borderWidth: 1.5, backgroundColor: C.land },
  choiceTitle: { fontFamily: F.sansBold, fontSize: 17, color: C.ink, marginBottom: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: C.dim, marginTop: 2 },
  radioOn: { borderColor: C.ink, borderWidth: 6 },
  footer: { borderTopWidth: 1, borderTopColor: C.rule, backgroundColor: C.paper, paddingHorizontal: 20, paddingTop: 12, gap: 6 },
});
