import { Button, Host, Text } from '@expo/ui/jetpack-compose';

export function DrivingNativeAction({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Host style={{ width: '100%', height: 52 }} seedColor="#B64032">
      <Button onClick={onPress} enabled={!disabled} colors={{ containerColor: '#B64032', contentColor: '#F7F3E9' }}>
        <Text>{label}</Text>
      </Button>
    </Host>
  );
}
