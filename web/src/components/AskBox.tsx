"use client";
import { useState } from "react";
import type { AskResult } from "@/contract";
import { api } from "@/lib/api";

const cell = (v: unknown) =>
  typeof v === "number" ? (v >= 1000 ? `$${v.toLocaleString("en-US")}` : String(v)) : v === false ? "no" : v === true ? "yes" : String(v ?? "");

function Attempt({ a, i, last }: { a: AskResult["attempts"][number]; i: number; last: boolean }) {
  const ok = !a.error && !a.lint.length;
  return (
    <li className="relative border-l border-rule pb-4 pl-6 last:pb-0">
      <span
        aria-hidden
        className={`absolute -left-[7px] top-0.5 grid size-[13px] place-items-center rounded-full border text-[8px] ${ok ? "border-moss bg-moss text-paper" : "border-rust bg-paper text-rust"}`}
      >
        {ok ? "✓" : "×"}
      </span>
      <p className="kicker">
        Attempt {i + 1} · {ok ? <span className="text-moss">ran, {a.rows} rows</span> : <span className="text-rust">{a.error ? "API rejected it" : "lint stopped it"}</span>}
      </p>
      <pre className="mt-1 overflow-x-auto rounded-sm border border-rule bg-land p-2.5 font-mono text-[11px] leading-snug">{JSON.stringify(a.payload, null, 2)}</pre>
      {a.lint.map((l) => (
        <p key={l} className="mt-1 text-[12px]"><span className="mr-1.5 font-mono text-[10.5px] text-ochre">LINT</span>{l}</p>
      ))}
      {a.error && (
        <p className="mt-1 font-mono text-[11.5px] text-rust"><span className="mr-1.5 text-[10.5px]">ERROR</span>{a.error}</p>
      )}
      {!ok && !last && <p className="mt-1 text-[12px] text-dim">Fed back to Intake, which rewrote the query below.</p>}
    </li>
  );
}

export function AskBox({ canned }: { canned: string[] }) {
  const [q, setQ] = useState(canned[0] ?? "");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<AskResult | null>(null);
  const [miss, setMiss] = useState("");

  const ask = async (question: string) => {
    setQ(question);
    setBusy(true);
    setMiss("");
    const r = await api.ask(question.trim());
    setBusy(false);
    setRes(r ?? null);
    if (!r) setMiss("The API is unreachable and this question has no cached answer. Pick one of the questions below.");
  };

  const claimed = res ? Number(res.answer.match(/\d[\d,]*/)?.[0].replaceAll(",", "")) : NaN;
  const verified = res ? claimed === res.rows.length : false;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-12">
      <div>
        <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(q); }}>
          <label htmlFor="q" className="kicker">Question, in plain English</label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="q"
              name="question"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoComplete="off"
              aria-describedby={miss ? "q-miss" : undefined}
              aria-invalid={miss ? true : undefined}
              className="min-w-0 flex-1 rounded-sm border border-ink bg-paper px-3 py-2 text-[14px] placeholder:text-dim"
            />
            <button disabled={busy} className="rounded-sm border border-ink bg-ink px-4 text-[13px] font-medium text-paper transition-colors duration-150 hover:bg-ink/85 disabled:opacity-60">
              {busy ? "Asking…" : "Ask"}
            </button>
          </div>
          {miss && <p id="q-miss" className="mt-1.5 text-[12px] text-rust">{miss}</p>}
        </form>
        <p className="kicker mt-4">Cached questions</p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {canned.map((c) => (
            <li key={c}>
              <button
                onClick={() => ask(c)}
                aria-pressed={res?.question === c}
                className={`rounded-sm border px-2.5 py-1 text-left text-[12px] transition-colors duration-150 ${res?.question === c ? "border-ink bg-land" : "border-rule hover:border-ink"}`}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
        {res && (
          <>
            <p className="kicker mt-6">What Intake tried</p>
            <p className="mt-1 max-w-[60ch] text-[12.5px] text-dim">{res.rationale}</p>
            <ol className="mt-3 ml-1.5">
              {res.attempts.map((a, i) => <Attempt key={i} a={a} i={i} last={i === res.attempts.length - 1} />)}
            </ol>
          </>
        )}
      </div>

      <section aria-labelledby="ans-h">
        <div role="status" className="sr-only">{busy ? "Asking" : res ? `${res.rows.length} rows returned` : ""}</div>
        {!res && !busy && (
          <p className="pt-7 text-dim">Ask a question or pick a cached one. Intake writes the Federato query, lint checks it, and the rows appear here.</p>
        )}
        {busy && <div className="mt-7 h-40 animate-pulse rounded-sm bg-land motion-reduce:animate-none" />}
        {res && !busy && (
          <>
            <h2 id="ans-h" className="kicker">Answer</h2>
            <p className="mt-1 font-serif text-[20px] leading-snug">{res.answer}</p>
            <p className={`mt-1.5 text-[12px] ${verified ? "text-moss" : "text-rust"}`}>
              {verified ? "✓ Verified against rows" : "× Not verified"}: the answer says{" "}
              <span className="num">{Number.isNaN(claimed) ? "no number" : claimed}</span>, the query returned{" "}
              <span className="num">{res.rows.length}</span> rows.
            </p>
            <div className="mt-4 max-h-[520px] overflow-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead className="sticky top-0 bg-paper">
                  <tr className="border-b border-ink">
                    {res.columns.map((c) => <th key={c} scope="col" className="kicker py-1.5 pr-4 text-left font-normal">{c.replaceAll("_", " ")}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {res.rows.map((r, i) => (
                    <tr key={i} className="border-b border-rule">
                      {res.columns.map((c) => (
                        <td key={c} className={`py-1.5 pr-4 ${typeof r[c] === "number" ? "num" : ""}`}>{cell(r[c])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
