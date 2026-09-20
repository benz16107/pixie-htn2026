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
        className={`absolute -left-[7px] top-0.5 grid size-[13px] place-items-center rounded-full border text-[8px] ${ok ? "border-ink bg-ink text-paper" : "border-red bg-paper text-red"}`}
      >
        {ok ? "✓" : "×"}
      </span>
      <p className="folio">
        Attempt {i + 1}, {ok ? <span>ran, {a.rows} rows</span> : <span className="text-red">{a.error ? "API rejected it" : "lint stopped it"}</span>}
      </p>
      <pre className="mt-1 overflow-x-auto border-l border-rule pl-3 font-mono text-[11px] leading-snug">{JSON.stringify(a.payload, null, 2)}</pre>
      {a.lint.map((l) => (
        <p key={l} className="mt-1 text-[12px]"><span className="sc mr-1.5">lint</span>{l}</p>
      ))}
      {a.error && (
        <p className="mt-1 text-[12px] text-red"><span className="sc mr-1.5">error</span>{a.error}</p>
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
          <label htmlFor="q" className="folio">Question, in plain English</label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="q"
              name="question"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoComplete="off"
              aria-describedby={miss ? "q-miss" : undefined}
              aria-invalid={miss ? true : undefined}
              className="min-w-0 flex-1 border-b border-ink bg-transparent px-0 py-2 text-[16px] placeholder:text-dim"
            />
            <button disabled={busy} className="btn btn-primary">
              {busy ? "Asking…" : "Ask"}
            </button>
          </div>
          {miss && <p id="q-miss" className="mt-1.5 text-[12px] text-red">{miss}</p>}
        </form>
        <p className="folio mt-6">Cached questions</p>
        <ul className="mt-2">
          {canned.map((c) => (
            <li key={c} className="rule-faint">
              <button
                onClick={() => ask(c)}
                aria-pressed={res?.question === c}
                className={`block w-full py-1.5 text-left text-[13px] transition-colors duration-150 ${res?.question === c ? "underline underline-offset-4" : "text-dim hover:text-ink"}`}
              >
                {c}
              </button>
            </li>
          ))}
        </ul>
        {res && (
          <>
            <p className="folio mt-8">What Intake tried</p>
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
        {busy && <div className="mt-7 h-40 bg-faint" />}
        {res && !busy && (
          <>
            <h2 id="ans-h" className="folio">Answer</h2>
            <p className="display display-md mt-2 max-w-[40ch]">{res.answer}</p>
            <p className={`mt-3 text-[12.5px] ${verified ? "text-dim" : "text-red"}`}>
              {verified ? "✓ Verified against rows" : "× Not verified"}: the answer says{" "}
              <span className="num">{Number.isNaN(claimed) ? "no number" : claimed}</span>, the query returned{" "}
              <span className="num">{res.rows.length}</span> rows.
            </p>
            <div className="mt-4 max-h-[520px] overflow-auto">
              <table className="book text-[12.5px]">
                <thead className="sticky top-0 bg-paper">
                  <tr>
                    {res.columns.map((c) => (
                      // Federato column names are dot-paths. Wrapping them keeps the table inside
                      // a 1280 screen; the full path stays on hover.
                      <th key={c} scope="col" title={c}
                          className="max-w-[120px] break-words !normal-case !tracking-normal leading-tight">
                        {c.replaceAll("_", " ").replaceAll(".", ". ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {res.rows.map((r, i) => (
                    <tr key={i}>
                      {res.columns.map((c) => (
                        <td key={c} className={typeof r[c] === "number" ? "num" : ""}>{cell(r[c])}</td>
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
