import { router } from 'expo-router';
import { ActionCard, Panel, PhaseIntro, ProductSwitch } from '@/components/consumer';
import { Body, Kicker, Screen } from '@/components/ui';
import { useQuote } from '@/lib/store';

export default function RecoverScreen() {
  const { product, setProduct } = useQuote();
  return (
    <Screen>
      <ProductSwitch product={product} onChange={setProduct} />
      <PhaseIntro number={4} phase="Recover" title={product === 'auto' ? 'Make the next hour easier.' : 'Take control after damage.'}>
        Pixie turns a stressful incident into a short safety check, a record of what you have, and a recovery plan you can save locally.
      </PhaseIntro>
      <Panel tone="ink">
        <Kicker style={{ color: '#AFC1C4' }}>Pixie recovery</Kicker>
        <Body style={{ marginTop: 8, color: '#F7F3E9' }}>
          Your checklist and notes stay in this flow until you choose to export them. Recovery details never change the estimate shown elsewhere in Pixie.
        </Body>
      </Panel>
      <ActionCard
        title={product === 'auto' ? 'Start an auto recovery plan' : 'Start a home recovery plan'}
        detail={product === 'auto' ? 'Check safety, record the scene, and prepare one clear summary.' : 'Limit further damage, record affected rooms, and prepare one clear summary.'}
        meta="WORKS WITHOUT A NETWORK"
        onPress={() => router.push({ pathname: '/recovery-plan', params: { product } })}
      />
      <Body style={{ marginTop: 14, marginBottom: 24, fontSize: 13, lineHeight: 19 }}>
        If anyone is hurt or the area is unsafe, call emergency services before using this checklist. Pixie organizes recovery information; it does not submit a claim.
      </Body>
    </Screen>
  );
}
