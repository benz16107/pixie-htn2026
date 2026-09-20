// Intact consumer palette. The Federato desk has its own dark operating palette.
export const C = {
  land: '#E1E9EA',
  paper: '#F4F7F6',
  ink: '#17343A',
  dim: '#586E73',
  rule: '#C1D0D2',
  water: '#B7D3D8',
  ochre: '#C83B31',
  ochreSoft: '#F3D8D4',
  hex: '#367783',
  rust: '#A42D27',
  moss: '#14755F',
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

// Contents-value bounds for the question-two slider.
export const CONTENTS_MIN = 5000;
export const CONTENTS_MAX = 100000;
export const CONTENTS_STEP = 5000;
