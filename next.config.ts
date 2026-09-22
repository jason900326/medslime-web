import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // LAN preview host confirmed by the user and the dev server log.
  allowedDevOrigins: ["192.168.68.102"],
};

export default nextConfig;
