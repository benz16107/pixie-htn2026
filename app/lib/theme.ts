// Cartographic palette, shared with web/src/app/globals.css.
export const C = {
  land: '#ECE6D6',
  paper: '#F3EFE4',
  ink: '#2F2A22',
  dim: '#6F6453',
  rule: '#D4CAB4',
  water: '#C8D2CB',
  ochre: '#8F6327',
  ochreSoft: '#E4D9BF',
  hex: '#B7813A',
  rust: '#A2492F',
  moss: '#5E6F4A',
};

export const F = {
  serif: 'Newsreader_600SemiBold',
  sans: 'PublicSans_400Regular',
  sansMedium: 'PublicSans_500Medium',
  sansBold: 'PublicSans_600SemiBold',
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
};

export const money = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(n).toFixed(2)}`;
