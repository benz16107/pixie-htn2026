import { router } from 'expo-router';
import { ActionCard, Panel, PhaseIntro, ProductSwitch } from '@/components/consumer';
import { Body, Kicker, Screen } from '@/components/ui';
import { useQuote } from '@/lib/store';

export default function RecoverScreen() {
  const { product, setProduct } = useQuote();
  return (
    <Screen>
      <ProductSwitch product={product} onChange={setProduct} />
      <PhaseIntro number={4} phase="Recover" title="Capture what happened once.">
        Build a clear evidence bundle for an advisor or insurer. Safety comes first, and you review every item before sharing it.
      </PhaseIntro>
      <Panel tone="ink">
        <Kicker style={{ color: '#AFC1C4' }}>Pixie + CrashClip</Kicker>
        <Body style={{ marginTop: 8, color: '#F7F3E9' }}>CrashClip records post-incident evidence. The app does not use witness footage as an underwriting or driving-score input.</Body>
      </Panel>
      <ActionCard
        title={product === 'auto' ? 'I was in a collision' : 'I have water or property damage'}
        detail="Open the safety checklist and prepare an evidence bundle."
        meta="START RECOVERY"
        onPress={() => router.push({ pathname: '/recovery-handoff', params: { product } })}
      />
      <ActionCard title="I witnessed an incident" detail="Record what you observed without making a claim on your own policy." meta="THIRD-PARTY REPORT" onPress={() => router.push({ pathname: '/recovery-handoff', params: { product: 'witness' } })} />
    </Screen>
  );
}
