import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "path";

// Load .env.local first, then fall back to .env
// drizzle-kit runs its own process and doesn't pick up Next.js env loading
expand(config({ path: path.resolve(__dirname, ".env.local") }));
expand(config({ path: path.resolve(__dirname, ".env") }));

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
