import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { C, F } from '@/lib/theme';

function TabIcon({ value, color }: { value: string; color: ColorValue }) {
  return <Text style={{ color, fontFamily: F.sansBold, fontSize: 17 }}>{value}</Text>;
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
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarAccessibilityLabel: 'Home', tabBarIcon: ({ color }) => <TabIcon value="⌂" color={color} /> }} />
      <Tabs.Screen name="decide" options={{ title: 'Compare', tabBarAccessibilityLabel: 'Compare coverage options', tabBarIcon: ({ color }) => <TabIcon value="↕" color={color} /> }} />
      <Tabs.Screen name="protect" options={{ title: 'Safety', tabBarAccessibilityLabel: 'Safety and prevention', tabBarIcon: ({ color }) => <TabIcon value="◎" color={color} /> }} />
      <Tabs.Screen name="recover" options={{ title: 'Help', tabBarAccessibilityLabel: 'Help after an incident', tabBarIcon: ({ color }) => <TabIcon value="+" color={color} /> }} />
    </Tabs>
  );
}
