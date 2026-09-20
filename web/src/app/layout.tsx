import type { Metadata } from "next";
import { Bodoni_Moda, Schibsted_Grotesk } from "next/font/google";
import { Colophon, Nav } from "@/components/Nav";
import "./globals.css";

const serif = Bodoni_Moda({ subsets: ["latin"], variable: "--font-bodoni", style: ["normal", "italic"], axes: ["opsz"] });
const sans = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-schibsted", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Pixie underwriting desk",
  description: "Five agents that find out what the decision depends on.",
};

/*
  DESIGN CONTRACT (D2, the printed report)
  THESIS: An underwriting decision is a document someone signs, so the desk is set as a printed
  report. A case reads top to bottom as a written argument: the decision and its reasons, the facts
  with their sources, how the score was built, the case against, the precedent, the record. It
  refuses the dashboard-of-panels arrangement.
  OWN-WORLD: Stone-white uncoated stock, one ink, one grey. Hairline rules, no boxes, no radius, no
  shadows. Bodoni Moda for titles, decisions and large numerals; Schibsted Grotesk for everything
  else. Red only where something is wrong or a limit is crossed.
  STORY: The reader opens the report, reads the decision as a sentence, checks each number against
  its source, drags the one fact that could flip the call, and signs at the foot by sending the
  broker request.
  FIRST VIEWPORT (case): running head; case number and place; the title in Bodoni; the decision
  line in Bodoni italic; the written explanation with its "every number checked" mark; the score as
  a printed number line; the facts table begins.
  FORM: A signed underwriting report, pinned by the brief.
*/
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="min-h-screen bg-paper text-ink">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-ink focus:px-3 focus:py-1 focus:text-paper">
          Skip to content
        </a>
        <Nav />
        <div id="main" tabIndex={-1} className="contents">
          {children}
        </div>
        <Colophon />
      </body>
    </html>
  );
}
