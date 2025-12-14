import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  extendDefaultRuntimeCaching: true,
  // IMPORTANT: Do not cache authenticated API responses.
  // Workbox caches by URL and does not vary by cookies, so caching `/api/*` can leak data between accounts.
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ sameOrigin, url: { pathname } }) =>
          sameOrigin && pathname.startsWith("/api/") && pathname !== "/api/auth/callback",
        handler: "NetworkOnly",
        method: "GET",
        options: {
          cacheName: "apis",
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  turbopack: {}, // Explicitly enable Turbopack to suppress warning
};

export default withPWA(nextConfig);
