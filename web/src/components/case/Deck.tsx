"use client";
import { useState } from "react";
import { useKeys } from "../desk/keys";

export type Panel = { id: string; label: string; count?: string; node: React.ReactNode };

/**
 * The bottom deck. Three panels, one number key each, and the key printed on the tab, because
 * a shortcut nobody can see is a shortcut nobody uses.
 */
export function Deck({ panels }: { panels: Panel[] }) {
  const [on, setOn] = useState(panels[0]?.id);

  useKeys(
    (e) => {
      const i = Number(e.key);
      if (i >= 1 && i <= panels.length) return setOn(panels[i - 1].id), true;
      return false;
    },
    [panels.length, panels.map((p) => p.id).join()],
  );

  return (
    <section className="grid min-h-0 grid-rows-[25px_minmax(0,1fr)]" aria-label="Case detail">
      <div role="tablist" aria-label="Case detail" className="flex items-stretch border-b border-rule">
        {panels.map((p, i) => (
          <button
            key={p.id}
            role="tab"
            id={`deck-${p.id}`}
            aria-selected={on === p.id}
            aria-controls={`deckpanel-${p.id}`}
            onClick={() => setOn(p.id)}
            className={`flex items-center gap-1.5 border-r border-rule px-3 text-[10px] uppercase tracking-[0.12em] transition-colors duration-150 ${
              on === p.id ? "bg-raise text-ochre shadow-[inset_0_-2px_0_var(--color-ochre)]" : "text-dim hover:bg-land hover:text-ink"
            }`}
          >
            <kbd aria-hidden className={`key ${on === p.id ? "key-on" : ""}`}>
              {i + 1}
            </kbd>
            {p.label}
            {p.count && <span className="num normal-case tracking-normal text-faint">{p.count}</span>}
          </button>
        ))}
      </div>
      {panels.map((p) => (
        <div
          key={p.id}
          role="tabpanel"
          id={`deckpanel-${p.id}`}
          aria-labelledby={`deck-${p.id}`}
          hidden={on !== p.id}
          className="min-h-0 overflow-auto"
        >
          {p.node}
        </div>
      ))}
    </section>
  );
}
