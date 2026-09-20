import type { Receipt as R } from "@/lib/api";

const usd = (n: number) => `${n < 0 ? "−" : ""}$${Math.abs(n).toFixed(2)}`;

// Totals are summed in cents so the check is exact, not float-close.
export function Receipt({ r }: { r: R }) {
  const cents = Math.round(r.base * 100) + r.lines.reduce((s, l) => s + Math.round(l.dollars * 100), 0);
  const exact = cents === Math.round(r.annual * 100);
  return (
    <section aria-labelledby="rc">
      <h3 id="rc" className="folio mb-2 flex justify-between">
        <span>Receipt</span>
        <span className={exact ? "" : "text-red"}>{exact ? "✓ lines sum exactly" : "× lines do not sum to the total"}</span>
      </h3>
      <table className="book text-[13px]">
        <tbody>
          <tr>
            <th scope="row" className="!py-[7px] !text-[13px] !font-medium !normal-case !tracking-normal !text-ink">Base rate</th>
            <td />
            <td className="r num">{usd(r.base)}</td>
          </tr>
          {r.lines.map((l) => (
            <tr key={l.label} title={l.source}>
              <th scope="row" className="!py-[7px] !text-[13px] !font-normal !normal-case !tracking-normal !text-ink">
                {l.label}
                <span className="block text-[12px] text-dim">{l.source}</span>
              </th>
              <td className="num w-[90px] text-dim">
                ×{l.multiplier.toFixed(2)}
                {l.capped && <span className="sc ml-1.5">cap</span>}
              </td>
              <td className="r num w-[90px]">{l.dollars > 0 ? "+" : ""}{usd(l.dollars)}</td>
            </tr>
          ))}
          <tr className="text-[14px]">
            <th scope="row" className="!py-2.5 !text-[14px] !font-medium !normal-case !tracking-normal !text-ink">Annual</th>
            <td className="num text-[12px] text-dim">{usd(r.annual / 12)} a month</td>
            <td className="r display-num text-[18px]">{usd(cents / 100)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-[12px] text-dim">{r.label}</p>
    </section>
  );
}
