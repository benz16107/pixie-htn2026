import { SurfaceShell } from "@/components/surface/Shell";

// The queue, a case and the live desk share this layout, so the map they all sit on is mounted
// once and never torn down between them: only the leaf page (and the camera command it issues)
// changes on navigation. That's what makes opening a case a flight, not a page load.
export default function SurfaceLayout({ children }: { children: React.ReactNode }) {
  return <SurfaceShell>{children}</SurfaceShell>;
}
