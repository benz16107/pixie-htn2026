import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { C, F } from '@/lib/theme';

function StepIcon({ value, color }: { value: string; color: ColorValue }) {
  return <Text style={{ color, fontFamily: F.monoMedium, fontSize: 12 }}>{value}</Text>;
}

export default function LifecycleLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.ochre,
        tabBarInactiveTintColor: C.dim,
        tabBarStyle: { backgroundColor: C.paper, borderTopColor: C.rule },
        tabBarLabelStyle: { fontFamily: F.sansMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Quote', tabBarAccessibilityLabel: 'Quote, step 1 of 4', tabBarIcon: ({ color }) => <StepIcon value="01" color={color} /> }} />
      <Tabs.Screen name="decide" options={{ title: 'Decide', tabBarAccessibilityLabel: 'Decide, step 2 of 4', tabBarIcon: ({ color }) => <StepIcon value="02" color={color} /> }} />
      <Tabs.Screen name="protect" options={{ title: 'Protect', tabBarAccessibilityLabel: 'Protect, step 3 of 4', tabBarIcon: ({ color }) => <StepIcon value="03" color={color} /> }} />
      <Tabs.Screen name="recover" options={{ title: 'Recover', tabBarAccessibilityLabel: 'Recover, step 4 of 4', tabBarIcon: ({ color }) => <StepIcon value="04" color={color} /> }} />
    </Tabs>
  );
}
