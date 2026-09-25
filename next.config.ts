import type { NextConfig } from "next";
import { biztonsagiFejlecek } from "./src/lib/biztonsagi-fejlecek";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  agentRules: false,
  async headers() {
    return [
      { source: "/:path*", headers: biztonsagiFejlecek(process.env.NODE_ENV === "production") },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;
