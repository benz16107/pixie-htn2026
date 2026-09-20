import { Platform } from 'react-native';

export const C = {
  background: '#F2F2F7',
  land: '#E9E9EF',
  paper: '#FFFFFF',
  ink: '#1C1C1E',
  dim: '#636366',
  rule: '#DCDCE1',
  water: '#C4DEEA',
  ochre: '#0066CC',
  ochreSoft: '#EDF4FD',
  hex: '#367783',
  rust: '#B42318',
  moss: '#217347',
};

const system = Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' });
const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
export const F = { serif: system, sans: system, sansMedium: system, sansBold: system, mono, monoMedium: mono };
export const money = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(n).toFixed(2)}`;
export const CONTENTS_MIN = 10000;
export const CONTENTS_MAX = 100000;
export const CONTENTS_STEP = 5000;
