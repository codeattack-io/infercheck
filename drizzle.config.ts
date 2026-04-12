import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "path";

// DATABASE_URL_OVERRIDE lets scripts target a specific DB (e.g. prod) without
// touching .env.local. It must be set *before* the dotenv calls so it takes
// precedence — we capture it here before dotenv can clobber it.
const urlOverride = process.env.DATABASE_URL_OVERRIDE;

// Load .env.local first, then fall back to .env
// drizzle-kit runs its own process and doesn't pick up Next.js env loading
expand(config({ path: path.resolve(__dirname, ".env.local") }));
expand(config({ path: path.resolve(__dirname, ".env") }));

// Re-apply the override after dotenv so .env.local cannot win
if (urlOverride) {
  process.env.DATABASE_URL = urlOverride;
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
