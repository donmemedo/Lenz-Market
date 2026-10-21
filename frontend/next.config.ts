import type { NextConfig } from "next";

const api = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8041").replace(/\/$/, "");
const dev = process.env.NODE_ENV !== "production";

// Next.js and next-themes inject small inline bootstrap scripts, hence 'unsafe-inline' for scripts.
// The session token is an httpOnly cookie, and connect-src limits where any script could send data.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `img-src 'self' data: blob: ${api} https://picsum.photos https://fastly.picsum.photos https://i.pravatar.cc`,
  `connect-src 'self' ${api}${dev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: false },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Content-Security-Policy", value: csp },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
      ],
    }];
  },
};

export default nextConfig;
