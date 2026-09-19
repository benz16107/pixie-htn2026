import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The demo is opened from another machine over Tailscale. Without this, `next dev` refuses the
  // cross-origin requests for /_next/* and the page never hydrates: every control looks dead.
  // For the demo itself prefer `npm run build && npm run start`, which has no HMR socket at all.
  allowedDevOrigins: ["100.95.223.110", "*.ts.net", "*.local", "192.168.*.*", "100.*.*.*"],
};

export default nextConfig;
