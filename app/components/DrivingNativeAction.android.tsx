import { Button, Host, Text } from '@expo/ui/jetpack-compose';

export function DrivingNativeAction({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Host style={{ width: '100%', height: 52 }} seedColor="#0066CC">
      <Button onClick={onPress} enabled={!disabled} colors={{ containerColor: '#0066CC', contentColor: '#FFFFFF' }}>
        <Text>{label}</Text>
      </Button>
    </Host>
  );
}
