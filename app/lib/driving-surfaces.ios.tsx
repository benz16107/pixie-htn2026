import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, createWidget, type LiveActivity } from 'expo-widgets';

export type DriveSurfaceState = { zone: string; context: string; score: number; speedKmh: number; active: boolean };

const DriveWidget = createWidget<DriveSurfaceState>('DriveContext', (state) => {
  'widget';
  return (
    <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 14 })]}>
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle('#B64032')]}>PIXIE DRIVE SCORE</Text>
      <Text modifiers={[font({ size: 19, weight: 'bold' })]}>{state.zone}</Text>
      <Text modifiers={[font({ size: 13 })]}>{state.context}</Text>
      <Text modifiers={[font({ size: 11 }), foregroundStyle('#66777A')]}>{state.score} score · {state.speedKmh} km/h</Text>
    </VStack>
  );
});

const DriveActivity = createLiveActivity<DriveSurfaceState>('DriveContext', (state) => {
  'widget';
  const compact = <Text modifiers={[font({ size: 12, weight: 'bold' })]}>PX</Text>;
  return {
    banner: (
      <HStack spacing={8} modifiers={[padding({ all: 14 })]}>
        <VStack alignment="leading" spacing={3}>
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle('#B64032')]}>Drive score active</Text>
          <Text modifiers={[font({ size: 16, weight: 'bold' })]}>{state.zone}</Text>
          <Text modifiers={[font({ size: 12 })]}>{state.context}</Text>
        </VStack>
        <Spacer />
        <Text modifiers={[font({ size: 11 })]}>{state.score} · {state.speedKmh} km/h</Text>
      </HStack>
    ),
    compactLeading: compact,
    compactTrailing: <Text modifiers={[font({ size: 11 })]}>{state.score}</Text>,
    minimal: compact,
    expandedCenter: <Text modifiers={[font({ size: 14, weight: 'semibold' })]}>{state.zone}: {state.score} score</Text>,
  };
});

let activity: LiveActivity<DriveSurfaceState> | null = null;

export function syncDriveSurfaces(state: DriveSurfaceState): boolean {
  DriveWidget.updateSnapshot(state);
  if (state.active) {
    if (activity) void activity.update(state);
    else activity = DriveActivity.start(state, 'pixie://driving-context');
  }
  return true;
}

export async function endDriveSurfaces(): Promise<void> {
  if (activity) await activity.end('immediate');
  activity = null;
}
