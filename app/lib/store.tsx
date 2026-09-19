import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Answers, Place } from './api';

const DEFAULT: Answers = { contentsValue: 30000, unitLevel: 'upper', claims3yr: 0, deductible: 1000, liability: 1_000_000 };

type Store = {
  place: Place | null;
  setPlace: (p: Place | null) => void;
  answers: Answers;
  setAnswers: (a: Partial<Answers>) => void;
};

const Ctx = createContext<Store | null>(null);

export function QuoteProvider({ children }: { children: ReactNode }) {
  const [place, setPlace] = useState<Place | null>(null);
  const [answers, set] = useState<Answers>(DEFAULT);
  return (
    <Ctx.Provider value={{ place, setPlace, answers, setAnswers: (a) => set((s) => ({ ...s, ...a })) }}>
      {children}
    </Ctx.Provider>
  );
}

export const useQuote = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useQuote outside QuoteProvider');
  return s;
};
