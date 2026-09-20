export const metadata = { title: "Privacy · Pixie" };

export default function Privacy() {
  return (
    <main className="px-10 py-8">
      <h1 className="font-serif text-[32px] font-semibold leading-tight">Privacy</h1>
      <p className="mt-3 max-w-[65ch] text-[13px] leading-relaxed">
        Pixie is a Hack the North 2026 prototype. It stores no personal data. A tenant quote keeps the address you type,
        your three answers and the computed receipt so the underwriter view can open the same case; nothing is tied to a
        name, email or account, and the demo store is wiped after the event. Addresses are geocoded through
        OpenStreetMap&apos;s Nominatim, and map tiles come from OpenFreeMap. The underwriting data is Federato&apos;s
        synthetic hackathon dataset, not real customers.
      </p>
    </main>
  );
}
