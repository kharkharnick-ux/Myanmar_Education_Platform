// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { createLogger, loadEnv, type LogOptions } from "vite";

const getViteMode = () => {
  const modeIndex = process.argv.indexOf("--mode");
  if (modeIndex >= 0) return process.argv[modeIndex + 1] || "development";
  return process.env.NODE_ENV === "production" ? "production" : "development";
};

const loadServerEnvForLocalDev = () => {
  const mode = getViteMode();
  const env = loadEnv(mode, process.cwd(), "");
  const serverOnlyKeys = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "EMAILJS_SERVICE_ID",
    "EMAILJS_TEMPLATE_ID",
    "EMAILJS_PUBLIC_KEY",
    "EMAILJS_PRIVATE_KEY",
    "APP_ORIGIN",
    "SITE_URL",
    "VITE_APP_URL",
  ] as const;

  for (const key of serverOnlyKeys) {
    if (!process.env[key] && env[key]) {
      process.env[key] = env[key];
    }
  }
};

loadServerEnvForLocalDev();

const viteLogger = createLogger();
const suppressedWarningFragments = [
  '"createRequestHandler", "defineHandlerCallback", "transformPipeableStreamWithRouter" and "transformReadableStreamWithRouter"',
  '"RawStream" is imported from external module "@tanstack/router-core"',
  '"hydrate" and "json" are imported from external module "@tanstack/router-core/ssr/client"',
];

const shouldSuppressWarning = (message: string) =>
  suppressedWarningFragments.some((fragment) => message.includes(fragment));

const cleanLogger = {
  ...viteLogger,
  warn(message: string, options?: LogOptions) {
    if (shouldSuppressWarning(message)) return;
    viteLogger.warn(message, options);
  },
  warnOnce(message: string, options?: LogOptions) {
    if (shouldSuppressWarning(message)) return;
    viteLogger.warnOnce(message, options);
  },
};

export default defineConfig({
  // Local builds are not Lovable deploy builds, so disable Nitro explicitly to avoid noisy skip messages.
  nitro: false,
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    customLogger: cleanLogger,
    build: {
      chunkSizeWarningLimit: 1000,
    },
  },
});
