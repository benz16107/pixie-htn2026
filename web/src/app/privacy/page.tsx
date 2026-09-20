export const metadata = { title: "Privacy · Pixie" };

export default function Privacy() {
  return (
    <main className="mx-auto max-w-[1320px] px-8 pt-12">
      <h1 className="display display-lg">Privacy</h1>
      <p className="measure mt-5 text-[15.5px] leading-[1.6]">
        Pixie is a Hack the North 2026 prototype. It stores no personal data. A tenant quote keeps the address you type,
        your three answers and the computed receipt so the underwriter view can open the same case; nothing is tied to a
        name, email or account, and the demo store is wiped after the event. Addresses are geocoded through
        OpenStreetMap&apos;s Nominatim, and map tiles come from OpenFreeMap. The underwriting data is Federato&apos;s
        synthetic hackathon dataset, not real customers.
      </p>
    </main>
  );
}
