import quotes from '@/fixtures/quotes.json';

// Shapes from docs/sketch/contract.ts (TenantRequest, QuoteView, Hex). `liability` and `address`
// on the quote are additions the backend should accept and echo.
export type UnitLevel = 'basement' | 'ground' | 'upper';
export type Deductible = 500 | 1000 | 2500;
export interface Answers {
  contentsValue: number;
  unitLevel: UnitLevel;
  claims3yr: number;
  deductible: Deductible;
  liability: 1_000_000 | 2_000_000;
}
export interface Hex { cell: string; ring: [number, number][]; value: number; level: 0 | 1 | 2 | 3 | 4 }
export interface ReceiptLine { label: string; multiplier: number; dollars: number; capped: boolean; source: string }
export interface QuoteView {
  caseId: string;
  address: string;
  decision: { kind: 'approve' | 'refer'; reasons: string[]; nextStep: string };
  annual: number;
  monthly: number;
  label: string;
  receipt: { lines: ReceiptLine[]; base: number };
  recommendations: { addOn: string; why: string }[];
  hexes: Hex[];
  center: [number, number];
  listSummary: string;
  underwriterUrl: string;
  answers: Answers;
}
export interface Place { address: string; lat: number; lng: number }

// ---------- Gemini (docs/EXPO-GEMINI.md): photo inventory, Maps-grounded context, quote speech ----

export interface InventoryLine {
  id: number;
  category: string;
  item: string;
  quantity: number;
  low: number;
  high: number;
  confidence: number;
  source: string;
}
export interface InventoryResult {
  lines: InventoryLine[];
  totalLow: number;
  totalHigh: number;
  suggestedContentsValue: number;
  cached: boolean;
  model: string;
}
export interface ContextCitation { title: string; uri: string }
export interface ContextNote {
  note: string;
  citations: ContextCitation[];
  grounded: boolean;
  label: string;
  cached: boolean;
}

const API = process.env.EXPO_PUBLIC_API_URL;
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3100';
const FIXTURES = quotes as unknown as QuoteView[];

export const EXAMPLES: (Place & { hint: string; answers: Answers })[] = FIXTURES.map((q) => ({
  address: q.address,
  lat: q.center[0],
  lng: q.center[1],
  hint: q.answers.unitLevel === 'basement' ? 'Basement unit' : q.address.startsWith('1100') ? 'Queen & Ossington' : 'Downtown condo',
  answers: q.answers,
}));

const km = (a: Place, lat: number, lng: number) =>
  Math.hypot((a.lat - lat) * 111.2, (a.lng - lng) * 111.2 * Math.cos((lat * Math.PI) / 180));

// The cached quotes stand in when the API is unreachable; they only exist for the three examples.
const cached = (p: Place) => FIXTURES.find((q) => km(p, q.center[0], q.center[1]) < 0.3);

async function call<T>(path: string, init?: RequestInit): Promise<T | undefined> {
  if (!API) return undefined;
  try {
    const res = await fetch(API + path, { ...init, signal: AbortSignal.timeout(6000) });
    return res.ok ? ((await res.json()) as T) : undefined;
  } catch {
    return undefined;
  }
}

export async function hexesNear(p: Place): Promise<Hex[]> {
  return (await call<Hex[]>(`/map/toronto?lat=${p.lat}&lng=${p.lng}&k=4`)) ?? cached(p)?.hexes ?? [];
}

export type QuoteResult = { quote: QuoteView; offline: boolean } | { error: string };

export async function quoteTenant(p: Place, answers: Answers): Promise<QuoteResult> {
  const live = await call<QuoteView>(`/quote/tenant`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ address: p.address, lat: p.lat, lng: p.lng, answers }),
  });
  if (live) return { quote: live, offline: false };
  const q = cached(p);
  return q
    ? { quote: q, offline: true }
    : { error: 'We could not reach the quote service, and only the three example addresses work offline.' };
}

export type InventoryOutcome = { result: InventoryResult } | { error: string };

// Photograph your apartment: uploads one or more picked/captured photos to Gemini vision.
// Gemini only identifies items and value ranges; the app decides what to do with the total.
export async function scanInventory(photoUris: string[]): Promise<InventoryOutcome> {
  if (!API) return { error: 'The photo scan needs a live connection to the quote service.' };
  const form = new FormData();
  photoUris.forEach((uri, i) => {
    const name = uri.split('/').pop() || `photo-${i}.jpg`;
    const ext = name.split('.').pop()?.toLowerCase();
    const type = ext === 'png' ? 'image/png' : ext === 'heic' ? 'image/heic' : 'image/jpeg';
    // React Native's fetch FormData accepts this {uri,name,type} shape in place of a Blob.
    form.append('photos', { uri, name, type } as unknown as Blob);
  });
  try {
    const res = await fetch(API + '/gemini/inventory', { method: 'POST', body: form, signal: AbortSignal.timeout(30000) });
    if (!res.ok) return { error: (await res.json().catch(() => null))?.detail ?? 'Gemini could not read that photo. Try a brighter, wider shot.' };
    return { result: (await res.json()) as InventoryResult };
  } catch {
    return { error: 'We could not reach the quote service to scan your photo.' };
  }
}

// "What's around you" (consumer) / underwriting note (commercial): Gemini Maps grounding.
// Advisory only -- the caller must never fold this into a price.
export async function nearbyContext(p: Place, kind: 'consumer' | 'commercial' = 'consumer'): Promise<ContextNote | undefined> {
  return call<ContextNote>(`/gemini/context?lat=${p.lat}&lng=${p.lng}&kind=${kind}`);
}

// URL for the cached Gemini TTS reading of `text`; undefined when no API is configured (the
// caller should fall back to on-device expo-speech, which needs no URL at all).
export function speechUrl(text: string): string | undefined {
  return API ? `${API}/gemini/speech?text=${encodeURIComponent(text)}` : undefined;
}
