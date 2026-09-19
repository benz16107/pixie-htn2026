import MapView, { Marker, Polygon } from 'react-native-maps';
import type { Hex } from '@/lib/api';
import { C } from '@/lib/theme';
import { shader } from './hexStyle';

// Native: Apple/Google map with server-computed H3 rings. No H3 math on the phone.
export default function HexMap({ hexes, center, home, label }: { hexes: Hex[]; center: [number, number]; home?: string; label: string }) {
  const fill = shader(hexes);
  return (
    <MapView
      style={{ flex: 1 }}
      mapType="mutedStandard"
      initialRegion={{ latitude: center[0], longitude: center[1], latitudeDelta: 0.014, longitudeDelta: 0.014 }}
      showsPointsOfInterests={false}
      pitchEnabled={false}
      accessibilityLabel={label}
    >
      {hexes.map((h) => (
        <Polygon
          key={h.cell}
          coordinates={h.ring.map(([latitude, longitude]) => ({ latitude, longitude }))}
          fillColor={fill(h)}
          strokeColor={h.cell === home ? C.ink : 'rgba(143,99,39,0.55)'}
          strokeWidth={h.cell === home ? 2.5 : 0.8}
        />
      ))}
      <Marker coordinate={{ latitude: center[0], longitude: center[1] }} pinColor={C.rust} />
    </MapView>
  );
}
