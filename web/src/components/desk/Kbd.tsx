const CONNECTOR = new Set(["then", "/", "+", "–", "-", "or"]);

/** "g then q / m" renders as keycaps with the joining words left as words. */
export function Kbd({ combo }: { combo: string }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {combo.split(" ").map((t, i) =>
        CONNECTOR.has(t) ? (
          <span key={i} className="text-[9px] text-faint">
            {t}
          </span>
        ) : (
          <kbd key={i} className="key">
            {t}
          </kbd>
        ),
      )}
    </span>
  );
}

/**
 * The line along the bottom of a full-height screen. Left is what the screen is showing,
 * right is what the keys do here. A desk never hides its controls in a menu.
 */
export function StatusBar({ left, keys }: { left: React.ReactNode; keys: [string, string][] }) {
  return (
    <footer className="flex h-[26px] shrink-0 items-center gap-4 overflow-hidden border-t border-edge bg-land px-3 text-[10px] text-dim">
      <span className="flex min-w-0 shrink items-center gap-3 truncate">{left}</span>
      <span className="ml-auto flex shrink-0 items-center gap-3">
        {keys.map(([k, what]) => (
          <span key={k} className="flex items-center gap-1 whitespace-nowrap">
            <Kbd combo={k} />
            <span className="text-faint">{what}</span>
          </span>
        ))}
      </span>
    </footer>
  );
}
