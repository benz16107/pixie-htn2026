import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pixie renter quote operations",
  description: "Transparent Toronto renter quotes and the advisor referrals they create.",
};

export default function IntactLayout({ children }: LayoutProps<"/intact">) {
  return children;
}
