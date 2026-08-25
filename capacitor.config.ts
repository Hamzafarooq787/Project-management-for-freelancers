import type { CapacitorConfig } from "@capacitor/cli";

/**
 * This app is a full Next.js server (server actions, cookie-based auth,
 * server-only Supabase service-role calls) — it can't be exported as static
 * HTML and bundled on-device the way a plain SPA can. So instead of loading
 * bundled files from `webDir`, Capacitor points the native WebView straight
 * at the live production deployment. `webDir` still has to exist and hold
 * something on disk (Capacitor's CLI requires it), but its contents are only
 * ever seen as a brief fallback — the app always loads from `server.url`.
 *
 * Update `server.url` if the production domain changes (e.g. once a custom
 * domain is attached in Vercel instead of the default *.vercel.app one).
 */
const config: CapacitorConfig = {
  appId: "com.freelancehq.app",
  appName: "Freelance HQ",
  webDir: "www",
  server: {
    url: "https://project-management-for-freelancers.vercel.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
