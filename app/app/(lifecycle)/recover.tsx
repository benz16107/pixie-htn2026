import { router } from 'expo-router';
import { View } from 'react-native';
import { ActionCard, ConsumerHeader, MiniStat, Panel, ProductSwitch } from '@/components/consumer';
import { Body, Button, Kicker, Screen, Title } from '@/components/ui';
import { useQuote } from '@/lib/store';

export default function RecoverScreen() {
  const { product, setProduct, driveSummary } = useQuote();
  return (
    <Screen>
      <ConsumerHeader title="Help when you need it" detail="Safety first, then one clear record." />
      <ProductSwitch product={product} onChange={setProduct} />
      <Title style={{ marginTop: 24 }}>{product === 'auto' ? 'Something happened on the road?' : 'Something happened at home?'}</Title>
      <Body style={{ marginTop: 9, marginBottom: 18 }}>Start with immediate safety, then keep the details you may need in one local plan.</Body>
      {product === 'auto' ? (
        <Panel tone="warm">
          <Kicker>Driving context</Kicker>
          {driveSummary ? (
            <>
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <MiniStat value={String(driveSummary.score)} label="LAST SCORE" />
                <MiniStat value={`${driveSummary.maxSpeedKmh}`} label="MAX KM/H" />
                <MiniStat value={`${driveSummary.speedingEvents + driveSummary.hardBrakeEvents}`} label="EVENTS" />
              </View>
              <Body style={{ marginBottom: 12, fontSize: 13 }}>{driveSummary.area}. This coaching record remains separate from your incident plan.</Body>
            </>
          ) : <Body style={{ marginTop: 8, marginBottom: 12 }}>No recent drive is saved in this session. Driving insights can still help explain the road context before an incident.</Body>}
          <Button kind="secondary" label={driveSummary ? 'Review last drive' : 'Open driving insights'} onPress={() => router.push('/driving-context')} />
        </Panel>
      ) : null}
      <Panel tone="ink">
        <Kicker style={{ color: '#AFC1C4' }}>Your private recovery plan</Kicker>
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
