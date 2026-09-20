import Link from "next/link";
import { IntactQueue } from "@/components/intact/IntactQueue";
import { intactQuotes } from "@/lib/intact";

export const dynamic = "force-dynamic";

export default async function IntactHome() {
  const rows = await intactQuotes();
  const referred = rows.filter((row) => row.decision.kind === "refer").length;
  const priced = rows.flatMap((row) => row.quote?.receipt ? [row.quote.receipt.annual] : []);
  const average = priced.length ? priced.reduce((sum, n) => sum + n, 0) / priced.length : null;
  const expoUrl = process.env.NEXT_PUBLIC_EXPO_URL ?? "http://macserver:8081";

  return (
    <main className="intact-page">
      <div className="hidden" aria-hidden dangerouslySetInnerHTML={{ __html: "<!-- THESIS: Intact mode turns transparent pricing into a visible handoff from renter to advisor. OWN-WORLD: Toronto service wayfinding, blue-grey fields, navy type, and one vermilion action color. STORY: See live quote volume, inspect exact receipts, then open the consumer app or referred case. FIRST VIEWPORT: A split operations board with the queue on the left and the handoff on the right. FORM: A public-service operations board inside the established Pixie system. -->" }} />
      <section className="intact-intro">
        <div>
          <p className="intact-label">Pixie for Intact · Toronto renters</p>
          <h1>Every renter sees the price. Every referral reaches an advisor with the facts attached.</h1>
        </div>
        <p>
          This side of Pixie is built for tenant insurance. The Expo app collects three answers, prices them with Toronto data,
          and sends difficult cases into review. The numbers come from the same engine as the commercial desk, with a separate renter rulebook.
        </p>
      </section>

      <section className="intact-board" aria-label="Renter quote operations">
        <div className="intact-board-main">
          <div className="intact-section-heading">
            <div>
              <p className="intact-label">Live quote queue</p>
              <h2>What needs attention now</h2>
            </div>
            <Link href="/intact/quotes">View every quote →</Link>
          </div>
          <IntactQueue rows={rows} compact />
        </div>

        <aside className="intact-handoff">
          <p className="intact-label">One connected journey</p>
          <ol>
            <li><b>1</b><span><strong>Renter answers</strong><small>Address, unit, belongings, and coverage choices</small></span></li>
            <li><b>2</b><span><strong>Code prices</strong><small>Every dollar appears on an itemised receipt</small></span></li>
            <li><b>3</b><span><strong>Rules route</strong><small>Clear cases finish; water or claims issues reach an advisor</small></span></li>
          </ol>
          <a href={expoUrl} target="_blank" rel="noreferrer" className="intact-primary-link">
            Open the renter app <span aria-hidden>↗</span>
          </a>
          <p className="intact-fineprint">Illustrative Pixie pricing. This is not an Intact quote or offer of insurance.</p>
        </aside>
      </section>

      <section className="intact-metrics" aria-label="Current local quote data">
        <div><span>{rows.length}</span><p>quotes in this local demo</p></div>
        <div><span>{referred}</span><p>waiting for advisor review</p></div>
        <div><span>{average === null ? "—" : `$${average.toFixed(0)}`}</span><p>average illustrative annual price</p></div>
        <div><span>3</span><p>Toronto public datasets behind place factors</p></div>
      </section>

      <section className="intact-proof" id="pricing">
        <div>
          <p className="intact-label">The promise</p>
          <h2>A price the renter can audit</h2>
        </div>
        <div className="intact-proof-copy">
          <p>Base price, coverage choices, break-ins, fire protection, and basement flooding each get their own receipt line and source.</p>
          <p>Location factors are capped. Personal traits and credit never enter the model. The receipt shows every factor and source used to compute the price.</p>
        </div>
      </section>
    </main>
  );
}
