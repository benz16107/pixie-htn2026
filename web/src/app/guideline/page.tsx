"use client";
import { useEffect, useMemo, useState } from "react";
import { money } from "@/components/bits";
import { api, type GuidelineDiff, type GuidelineDoc, type GuidelineEdit, type Pred } from "@/lib/api";

/**
 * The carrier's appetite, as a document you can edit (docs/GUIDELINE.md).
 *
 * It reads as a guideline first and a form second: the underwriting strategy is the thing on the
 * page, and the controls are the numbers inside its sentences. Edit a threshold or a band edge,
 * apply, and every case on the desk is re-scored against the new document; the diff underneath
 * names the cases that moved and the factor that moved them.
 */

const MONEY_FACTS = new Set(["tiv", "premium", "loss_5yr"]);
const BAND_TONE: Record<string, string> = {
  target: "border-moss text-moss",
  acceptable: "border-ochre text-ochre",
  not_acceptable: "border-rust text-rust",
};
const BTN =
  "rounded-sm border border-rule bg-paper px-2 py-1 text-[11.5px] transition-colors duration-150 hover:border-ink disabled:text-dim disabled:hover:border-rule";

// ---------- editing the document: one path for hand edits and for scenario buttons --------------

function applyEdit(doc: GuidelineDoc, e: GuidelineEdit): GuidelineDoc {
  const next: GuidelineDoc = structuredClone(doc);
  if (e.kind === "threshold") next.thresholds[e.key] = e.value;
  else if (e.kind === "cap") next.hardFailCap = e.value;
  else if (e.kind === "points") next.points[e.key] = e.value;
  else {
    const band = next.factors.find((f) => f.fact === e.fact)?.bands.find((b) => b.band === e.band);
    if (band) band.pred = { [e.op]: e.value } as Pred;
  }
  return next;
}

const num = (x: unknown) => (typeof x === "number" ? x : Number(x));

/** A number inside a sentence: type it, or hold the arrow keys. Styled as text, not as a form field. */
function Edge({ value, fact, onChange, label }: { value: number; fact: string; onChange: (n: number) => void; label: string }) {
  const step = MONEY_FACTS.has(fact) ? 5000 : 1;
  return (
    <span className="inline-flex items-baseline">
      <input
        type="number"
        value={value}
        step={step}
        aria-label={label}
        // Controlled on the document's own number: a scenario button and a keystroke both land here.
        // An empty or unparseable field keeps the last good value rather than writing NaN.
        onChange={(ev) => Number.isFinite(ev.target.valueAsNumber) && onChange(ev.target.valueAsNumber)}
        className={`num ${MONEY_FACTS.has(fact) ? "w-[14ch]" : "w-[9ch]"} border-b border-dashed border-dim bg-transparent px-0.5 text-center text-[13px] focus:border-solid focus:border-ink focus:outline-none`}
      />
      {MONEY_FACTS.has(fact) && value >= 1000 && <span className="ml-1 text-[11px] text-dim">{money(value)}</span>}
    </span>
  );
}

/** The state list, as chips. Click × to drop one, type two letters to add one. */
function States({ values, onChange }: { values: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {values.map((s) => (
        <span key={s} className="num inline-flex items-center gap-1 rounded-sm border border-rule bg-land px-1 text-[11.5px]">
          {s}
          <button onClick={() => onChange(values.filter((v) => v !== s))} aria-label={`remove ${s}`} className="text-dim hover:text-rust">
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        maxLength={2}
        placeholder="+"
        aria-label="add a state"
        onChange={(e) => setDraft(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || draft.length !== 2 || values.includes(draft)) return;
          onChange([...values, draft]);
          setDraft("");
        }}
        className="num w-[3.5ch] rounded-sm border border-dashed border-dim bg-transparent text-center text-[11.5px] placeholder:text-dim focus:border-solid focus:border-ink focus:outline-none"
      />
    </span>
  );
}

/** One band of one factor, rendered as the guideline's own sentence with its numbers editable. */
function Band({ fact, band, pred, onPred }: { fact: string; band: string; pred: Pred; onPred: (p: Pred) => void }) {
  const set = (op: string, value: unknown) => onPred({ [op]: value } as Pred);
  let body: React.ReactNode;
  if ("else" in pred) body = <span className="text-dim">anything else</span>;
  else if ("between" in pred) {
    const [lo, hi] = pred.between as [number, number];
    body = (
      <>
        <Edge fact={fact} value={lo} label={`${fact} ${band} lower edge`} onChange={(n) => set("between", [n, hi])} /> to{" "}
        <Edge fact={fact} value={hi} label={`${fact} ${band} upper edge`} onChange={(n) => set("between", [lo, n])} />
      </>
    );
  } else if ("in" in pred) body = <States values={pred.in as string[]} onChange={(v) => set("in", v)} />;
  else if ("eq" in pred) body = <span className="num">{String(pred.eq)}</span>;
  else if ("share_gt" in pred) {
    const [share, types] = pred.share_gt as [number, string[]];
    body = (
      <span>
        over <span className="num">{Math.round(share * 100)}%</span> of TIV in {types.join(", ")}
      </span>
    );
  } else {
    const op = (["lte", "lt", "gte", "gt"] as const).find((k) => k in pred)!;
    const word = { lte: "at most", lt: "under", gte: "at least", gt: fact === "year_built" ? "built after" : "over" }[op];
    body = (
      <>
        {word} <Edge fact={fact} value={num(pred[op])} label={`${fact} ${band} edge`} onChange={(n) => set(op, n)} />
      </>
    );
  }
  return (
    <div className="flex items-baseline gap-3 py-[3px]">
      <span className={`w-[104px] shrink-0 rounded-sm border px-1 text-center font-mono text-[9.5px] uppercase tracking-[0.06em] ${BAND_TONE[band]}`}>
        {band.replace("_", " ")}
      </span>
      <span className="text-[13px]">{body}</span>
    </div>
  );
}

// ---------- the thresholds: the two lines every decision is measured against ---------------------

function Thresholds({ doc, onEdit }: { doc: GuidelineDoc; onEdit: (e: GuidelineEdit) => void }) {
  const { decline, accept } = doc.thresholds;
  const cap = doc.hardFailCap ?? 0;
  return (
    <div>
      <div className="relative h-[58px] select-none rounded-sm border border-rule bg-land">
        {([
          ["Decline", 0, decline, "bg-rust/15", "text-rust"],
          ["Open · needs an underwriter", decline, accept, "bg-ochre/15", "text-ochre"],
          ["Accept", accept, 100, "bg-moss/20", "text-moss"],
        ] as const).map(([label, from, to, fill, tone]) => (
          <div key={label} className={`absolute inset-y-0 flex flex-col items-center justify-center ${fill}`}
               style={{ left: `${from}%`, width: `${Math.max(to - from, 0)}%` }}>
            <span className={`whitespace-nowrap px-1 text-[11.5px] font-semibold ${tone}`}>{to - from > 14 ? label : ""}</span>
            <span className="num whitespace-nowrap text-[10px] text-dim">{from} to {to}</span>
          </div>
        ))}
        {[decline, accept].map((at) => (
          <div key={at} className="absolute inset-y-0 border-l-[1.5px] border-ink" style={{ left: `${at}%` }} />
        ))}
        <div className="absolute inset-y-0 border-l border-dashed border-rust" style={{ left: `${cap}%` }}>
          <span className="absolute bottom-0 left-1 whitespace-nowrap font-mono text-[9.5px] text-rust">hard-fail cap {cap}</span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-6 text-[12px]">
        {([
          ["decline", decline, "Decline threshold"],
          ["accept", accept, "Accept threshold"],
        ] as const).map(([key, value, label]) => (
          <label key={key} className="flex items-center gap-2">
            <span className="kicker">{label}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={value}
              aria-label={label}
              onChange={(e) => onEdit({ kind: "threshold", key, value: Number(e.target.value) })}
              className="w-[160px] accent-[#a2492f]"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={value}
              aria-label={`${label}, typed`}
              onChange={(e) => onEdit({ kind: "threshold", key, value: Number(e.target.value) })}
              className="num w-[5ch] border-b border-dashed border-dim bg-transparent text-center focus:border-solid focus:border-ink focus:outline-none"
            />
          </label>
        ))}
        <label className="flex items-center gap-2">
          <span className="kicker">Hard-fail cap</span>
          <input
            type="range"
            min={0}
            max={100}
            value={cap}
            aria-label="Hard-fail cap"
            onChange={(e) => onEdit({ kind: "cap", value: Number(e.target.value) })}
            className="w-[120px] accent-[#a2492f]"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={cap}
            aria-label="Hard-fail cap, typed"
            onChange={(e) => onEdit({ kind: "cap", value: Number(e.target.value) })}
            className="num w-[5ch] border-b border-dashed border-dim bg-transparent text-center focus:border-solid focus:border-ink focus:outline-none"
          />
        </label>
      </div>
    </div>
  );
}

// ---------- the diff: what the edit did to the book ---------------------------------------------

function Diff({ diff }: { diff: GuidelineDiff }) {
  const headline =
    diff.tierChanges === 0
      ? `No decision changed. ${diff.changed} of ${diff.casesScored} cases re-banded.`
      : `${diff.tierChanges} case${diff.tierChanges === 1 ? "" : "s"} changed decision`;
  const moves = Object.entries(diff.counts).map(([k, n]) => `${n} ${k.replace("->", " became ")}`);
  return (
    <section aria-labelledby="diff-h" className="border-t-2 border-ink pt-2">
      <h2 id="diff-h" className="kicker text-ink">
        What changed
      </h2>
      <p className="mt-1 font-serif text-[21px] font-semibold leading-tight">{headline}</p>
      <p className="mt-0.5 text-[12.5px] text-dim">
        {[...moves, diff.valueIntoQueue > 0 ? `${money(diff.valueIntoQueue)} moved into the queue` : "", diff.valueOutOfQueue > 0 ? `${money(diff.valueOutOfQueue)} left the queue` : ""]
          .filter(Boolean)
          .join(" · ") || "The bands moved, the decisions did not."}
      </p>
      <p className="mt-0.5 font-mono text-[10.5px] text-dim">
        {diff.casesScored} submissions re-scored in {diff.ms} ms · {diff.change.join("; ") || "restored to the file on disk"}
      </p>

      {diff.cases.length > 0 && (
        <ul className="mt-2 divide-y divide-rule border-t border-rule">
          {diff.cases.slice(0, 8).map((c) => (
            <li key={c.caseId} className="py-1.5">
              <p className="flex items-baseline gap-2 text-[12.5px]">
                <a href={`/cases/${c.caseId}`} className="num w-[44px] shrink-0 underline decoration-rule underline-offset-2 hover:decoration-ink">
                  #{c.caseId}
                </a>
                <span className="min-w-0 flex-1 truncate" title={c.insured}>
                  {c.insured}
                </span>
                {c.tierChanged ? (
                  <span className="num shrink-0 font-semibold text-rust">
                    {c.tierBefore} → {c.tierAfter}
                  </span>
                ) : (
                  <span className="num shrink-0 text-dim">{c.tierAfter}, unchanged</span>
                )}
                <span className="num w-[58px] shrink-0 text-right text-dim">{money(c.valueAtStake)}</span>
              </p>
              <p className="mt-px pl-[52px] text-[11.5px] text-dim">
                {c.factors
                  .map((f) => `${f.fact.replaceAll("_", " ")}: ${f.from.join("/").replaceAll("_", " ")} → ${f.to.join("/").replaceAll("_", " ")}`)
                  .join("; ") || "no band moved"}
                <span className="num">
                  {" · "}
                  {c.scoreBefore ? `${c.scoreBefore.lo}-${c.scoreBefore.hi}` : "—"} → {c.scoreAfter ? `${c.scoreAfter.lo}-${c.scoreAfter.hi}` : "—"}
                </span>
              </p>
            </li>
          ))}
          {diff.cases.length > 8 && (
            <li className="py-1.5 text-[11.5px] text-dim">and {diff.cases.length - 8} more, all listed in the case ledgers</li>
          )}
        </ul>
      )}
      {diff.rankMoves.length > 0 && (
        <p className="mt-2 text-[12px]">
          <span className="kicker mr-2">Queue order</span>
          {diff.rankMoves.map((m) => (
            <span key={m.caseId} className="num mr-3">
              #{m.caseId} {m.from}
              <span className="text-dim">→</span>
              {m.to}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}

// ---------- the page ----------------------------------------------------------------------------

export default function GuidelinePage() {
  const [server, setServer] = useState<GuidelineDoc | null>(null);   // what the desk is scoring with
  const [doc, setDoc] = useState<GuidelineDoc | null>(null);          // what is on screen
  const [diff, setDiff] = useState<GuidelineDiff | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.guideline().then((g) => {
      if (g) {
        setServer(g);
        setDoc(g);
      }
    });
  }, []);

  const pending = useMemo(() => {
    if (!doc || !server) return { any: false, bands: new Set<string>(), thresholds: false };
    const bands = new Set<string>();
    for (const f of doc.factors) {
      const was = server.factors.find((x) => x.fact === f.fact);
      for (const b of f.bands) {
        const wasBand = was?.bands.find((x) => x.band === b.band);
        if (JSON.stringify(wasBand?.pred) !== JSON.stringify(b.pred)) bands.add(`${f.fact}.${b.band}`);
      }
    }
    const thresholds =
      JSON.stringify(doc.thresholds) !== JSON.stringify(server.thresholds) || doc.hardFailCap !== server.hardFailCap;
    return { any: bands.size > 0 || thresholds, bands, thresholds };
  }, [doc, server]);

  const edit = (e: GuidelineEdit) => setDoc((d) => (d ? applyEdit(d, e) : d));
  const runScenario = (edits: GuidelineEdit[]) => setDoc((d) => (d ? edits.reduce(applyEdit, d) : d));

  const apply = async () => {
    if (!doc) return;
    setBusy(true);
    const r = await api.putGuideline(doc);
    setBusy(false);
    if (!r.ok || !r.data) {
      setError(r.detail);
      return;
    }
    setError("");
    setServer(r.data.guideline);
    setDoc(r.data.guideline);
    setDiff(r.data.diff);
  };

  const reset = async () => {
    setBusy(true);
    const r = await api.resetGuideline();
    setBusy(false);
    if (!r.ok || !r.data) return setError(r.detail);
    setError("");
    setServer(r.data.guideline);
    setDoc(r.data.guideline);
    setDiff(r.data.diff.changed > 0 ? r.data.diff : null);
  };

  if (!doc || !server)
    return (
      <main className="px-10 pt-7 text-[13px] text-dim">
        <p>Reading the guideline from the desk API…</p>
      </main>
    );

  return (
    <main className="px-10 pb-16 pt-7">
      <div className="flex items-start justify-between gap-8">
        <div>
          <p className="font-mono text-[11px] text-dim">APPETITE · COMMERCIAL PROPERTY · IN FORCE</p>
          <h1 className="mt-0.5 font-serif text-[32px] font-semibold leading-tight">2025 commercial property underwriting guideline</h1>
          <p className="mt-1 max-w-[74ch] text-[12.5px]">
            This document is the desk. Every submission is scored against these bands, and the queue is ordered by the
            result. Change a threshold or a band edge below and apply it: all <span className="num">158</span> submissions
            are re-scored by the same deterministic engine, and the cases that move are listed with the factor that moved
            them. Nothing here is a model output.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="num text-[11px] text-dim">
            {server.id} · {server.hash}
          </p>
          <p className="mt-1">
            {server.edited ? (
              <span className="rounded-sm border border-rust bg-rust px-1.5 py-px font-mono text-[10px] tracking-[0.1em] text-paper">EDITED</span>
            ) : (
              <span className="rounded-sm border border-rule px-1.5 py-px font-mono text-[10px] tracking-[0.1em] text-dim">AS FILED</span>
            )}
          </p>
          <button onClick={reset} disabled={busy} className={`${BTN} mt-2`}>
            Restore the filed guideline
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_492px] gap-x-10">
        <div>
          <section aria-labelledby="sc-h" className="border-t border-rule pt-3">
            <h2 id="sc-h" className="kicker">
              Try a change · each effect below is measured against this book, not guessed
            </h2>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {doc.scenarios.map((s) => (
                <button key={s.id} onClick={() => runScenario(s.edits)} className={`${BTN} text-left`} title={s.note}>
                  <span className="font-semibold">{s.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-dim">{s.effect}</span>
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="th-h" className="mt-6 border-t border-ink pt-3">
            <h2 id="th-h" className="font-serif text-[20px] font-semibold">
              1 · Decision thresholds
              {pending.thresholds && <Pendant />}
            </h2>
            <p className="mb-3 mt-0.5 max-w-[68ch] text-[12px] text-dim">
              A case scores 0 to 100. Below the decline line it is declined outright; at or above the accept line it is
              accepted; in between it is open and needs an underwriter. A case that breaks a hard rule cannot score above
              the hard-fail cap, which is why the cap must sit below the accept line.
            </p>
            <Thresholds doc={doc} onEdit={edit} />
          </section>

          <section aria-labelledby="fa-h" className="mt-7 border-t border-ink pt-3">
            <h2 id="fa-h" className="font-serif text-[20px] font-semibold">
              2 · Factors
            </h2>
            <p className="mb-3 mt-0.5 max-w-[68ch] text-[12px] text-dim">
              Bands are checked in the order printed: the first one that matches wins, so target is listed before
              acceptable. A factor marked <em>hard fail</em> caps the whole score when it lands in not acceptable and the
              value is known. A missing value is never a pass: it keeps every band possible.
            </p>
            <ul className="divide-y divide-rule border-t border-rule">
              {doc.factors.map((f) => (
                <li key={f.fact} className="py-2.5">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-[14px] font-semibold">{f.label}</h3>
                    {f.hardFail && (
                      <span className="rounded-sm border border-rust px-1 font-mono text-[9.5px] uppercase tracking-[0.06em] text-rust">hard fail</span>
                    )}
                    {f.routes && (
                      <span className="rounded-sm border border-dashed border-dim px-1 font-mono text-[9.5px] uppercase tracking-[0.06em] text-dim">routes</span>
                    )}
                    {f.bands.some((b) => pending.bands.has(`${f.fact}.${b.band}`)) && <Pendant />}
                    <span className="num ml-auto text-[10.5px] text-dim">{f.source}</span>
                  </div>
                  <div className="mt-1">
                    {f.bands.map((b) => (
                      <div
                        key={b.band}
                        className={pending.bands.has(`${f.fact}.${b.band}`) ? "-ml-2 border-l-2 border-ochre pl-[6px]" : ""}
                      >
                        <Band fact={f.fact} band={b.band} pred={b.pred} onPred={(p) => edit({ kind: "band", fact: f.fact, band: b.band, op: Object.keys(p)[0], value: Object.values(p)[0] })} />
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] text-dim">
              Points per band: {["target", "acceptable", "not_acceptable"].map((b) => `${b.replace("_", " ")} ${doc.points[b]}`).join(", ")}. A
              factor is scored against its own best reachable band, so a factor with no target band is not penalised for
              lacking one.
            </p>
          </section>
        </div>

        <div className="sticky top-4 self-start">
          {error && (
            <p role="alert" className="mb-3 rounded-sm border border-rust bg-rust/10 px-3 py-2 text-[12.5px] text-rust">
              <span className="kicker mr-1 text-rust">Refused</span>
              {error}
            </p>
          )}
          {pending.any && (
            <div className="mb-3 flex items-center gap-3 rounded-sm border border-ochre bg-ochre-soft px-3 py-2">
              <span className="text-[12.5px]">
                <span className="font-semibold">{pending.bands.size + (pending.thresholds ? 1 : 0)} pending edit
                {pending.bands.size + (pending.thresholds ? 1 : 0) === 1 ? "" : "s"}</span>
                <span className="text-dim"> · the desk is still scoring the filed guideline</span>
              </span>
              <button onClick={apply} disabled={busy} className={`${BTN} ml-auto border-ink font-semibold`}>
                {busy ? "Re-scoring…" : "Apply"}
              </button>
              <button
                onClick={() => {
                  setDoc(server);
                  setError("");
                }}
                disabled={busy}
                className={BTN}
              >
                Discard
              </button>
            </div>
          )}
          {diff ? <Diff diff={diff} /> : (
            <p className="border-t border-rule pt-2 text-[12.5px] text-dim">
              Apply an edit and the re-score lands here: which cases changed decision, how far they moved in the queue,
              and how much value at stake crossed the line.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function Pendant() {
  return (
    <span className="rounded-sm border border-ochre bg-ochre-soft px-1 font-mono text-[9.5px] uppercase tracking-[0.06em] text-ochre">pending</span>
  );
}
