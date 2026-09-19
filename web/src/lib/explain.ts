import type { DecisionView, Interval } from "@/contract";
import { API, PROXY } from "./live";

export type StepKind = "factor" | "cap" | "hazard" | "portfolio" | "clamp";

export type Step = {
  key: string;
  label: string;
  band?: string;
  kind: StepKind;
  pointsLo: number;
  pointsHi: number;
  runningLo: number;
  runningHi: number;
  capped: boolean;
  rule?: string;
  value?: string;
  provenance?: string;
  source?: string;
  layer?: string;
  multiplier?: number;
  evidence?: string;
  citation?: string;
  cells?: string[];
};

export type Explain = {
  caseId: string;
  kind: "commercial" | "tenant";
  score: Interval | null;
  decision: DecisionView;
  thresholds: { decline: number; accept: number };
  rulesId: string;
  reconciles: boolean;
  steps: Step[];
};

export type Flip = { at: number; display: string; from: string; to: string; text: string };
export type Sensitivity = {
  caseId: string;
  facts: {
    fact: string;
    label: string;
    provenance: string;
    resolver?: string;
    low: { value: number; display: string; decision: string };
    high: { value: number; display: string; decision: string };
    flip?: Flip | null;
    movesDecision: boolean;
    spread?: number;
  }[];
};

export type WhatIf = {
  before: { score: Interval | null; decision: DecisionView };
  after: { score: Interval | null; decision: DecisionView };
  changed: { fact: string; from?: string; to?: string }[];
  decisiveOverride?: string | null;
  notes?: string[];
};

export type Precedent = {
  backend: string;
  basisExplained: string;
  hits: {
    policyNumber?: string;
    insured: string;
    state: string;
    tiv: number;
    premium: number;
    status: string;
    incurred: number;
    lossRatio: number;
    summary: string;
    similarity: number;
    basis?: string[];
  }[];
};

export type Challenge = {
  argument: string;
  verified?: boolean;
  risks: { risk: string; size: string; likelihood?: string; remedy: string; grounded?: boolean }[];
  changeMyMind: string[];
  responses?: { risk: string; response: string; accepted?: boolean }[];
  verdictChanged?: boolean;
};

/** Server-side reads go straight to the API; the browser uses the same-origin proxy. */
const base = typeof window === "undefined" ? API : PROXY;

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(base + path, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export const explainCase = (id: string) => get<Explain>(`/cases/${id}/explain`);
export const sensitivityOf = (id: string) => get<Sensitivity>(`/cases/${id}/sensitivity`);
export const precedentFor = (id: string) => get<Precedent>(`/cases/${id}/precedent`);

export async function whatIf(id: string, overrides: Record<string, number | string>): Promise<WhatIf | null> {
  try {
    const res = await fetch(`${PROXY}/cases/${id}/whatif`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ overrides }),
      signal: AbortSignal.timeout(4000),
    });
    return res.ok ? ((await res.json()) as WhatIf) : null;
  } catch {
    return null;
  }
}

export const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
export const signed = (n: number, d = 1) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toFixed(d)}`;
