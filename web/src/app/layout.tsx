import type { Metadata } from "next";
import { DM_Mono, Newsreader, Public_Sans } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const serif = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", weight: ["400", "600"] });
const sans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans", weight: ["400", "500", "600"] });
const mono = DM_Mono({ subsets: ["latin"], variable: "--font-dm-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Pixie underwriting desk",
  description: "Five agents that find out what the decision depends on.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-paper text-ink antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-sm focus:bg-ink focus:px-3 focus:py-1 focus:text-paper">
          Skip to content
        </a>
        <Nav />
        <div id="main" tabIndex={-1} className="contents">
          {children}
        </div>
      </body>
    </html>
  );
}
