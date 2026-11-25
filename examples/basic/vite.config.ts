import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // clerk-solidjs reads CLERK_SECRET_KEY (and VITE_CLERK_*) from process.env on
  // the server. Fold .env files in for dev and preview; real env vars win.
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ""))) {
    process.env[key] ??= value;
  }

  return {
    plugins: [
      solid({
        start: { middleware: "./src/middleware.ts" },
        ssr: true,
        serverFunctions: true,
      }),
      tailwindcss(),
    ],
  };
});
