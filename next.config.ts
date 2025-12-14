import type { NextConfig } from "next";
import withPWAInit, { runtimeCaching as defaultRuntimeCaching } from "@ducanh2912/next-pwa";

const isDev = process.env.NODE_ENV === "development";

// If your browser ever talks directly to Supabase, never cache those responses.
const SUPABASE_ORIGIN = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : undefined;

// Defense-in-depth HTTP headers (protects CDN + browser caching even without SW)
const NO_STORE_HEADERS = [
  { key: "Cache-Control", value: "no-store, max-age=0" },
  { key: "Pragma", value: "no-cache" },
  { key: "Vary", value: "Cookie, Authorization" },
];

const customRuntimeCaching = [
  // 1) NEVER cache authenticated API responses.
  {
    urlPattern: ({ sameOrigin, url }: any) => sameOrigin && url.pathname.startsWith("/api/"),
    handler: "NetworkOnly",
    method: "GET",
    options: { cacheName: "dd-network-only-api" },
  },

  // 2) NEVER cache auth callback HTML/navigation (sets cookies, redirects, etc.)
  {
    urlPattern: ({ sameOrigin, url }: any) => sameOrigin && url.pathname === "/auth/callback",
    handler: "NetworkOnly",
    method: "GET",
    options: { cacheName: "dd-network-only-auth-callback" },
  },

  // 3) If client fetches Supabase directly, force NetworkOnly (no cross-user cache bleed).
  ...(SUPABASE_ORIGIN
    ? [
        {
          urlPattern: ({ url }: any) => url.origin === SUPABASE_ORIGIN,
          handler: "NetworkOnly",
          method: "GET",
          options: { cacheName: "dd-network-only-supabase" },
        },
      ]
    : []),
];

// `@ducanh2912/next-pwa`'s exported types don't include every Workbox strategy name (e.g. "NetworkOnly"),
// but the underlying Workbox config supports it. Cast to keep config strict in behavior.
const runtimeCaching = [...customRuntimeCaching, ...defaultRuntimeCaching] as any;

const withPWA = withPWAInit({
  dest: "public",
  disable: isDev,
  register: true,
  // Avoid caching "/" as a start URL during auth redirect + multi-user hardening.
  cacheStartUrl: false,
  // IMPORTANT: Explicit ordering. Workbox routes are evaluated in registration order.
  // Put our NetworkOnly rules BEFORE defaults.
  workboxOptions: {
    runtimeCaching,
  },
});

const nextConfig: NextConfig = {
  turbopack: {}, // Explicitly enable Turbopack to suppress warning
  // Defense-in-depth: set no-store on server responses too.
  async headers() {
    return [
      { source: "/api/:path*", headers: NO_STORE_HEADERS },
      { source: "/auth/callback", headers: NO_STORE_HEADERS },
    ];
  },
};

export default withPWA(nextConfig);
