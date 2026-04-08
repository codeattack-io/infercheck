import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

/**
 * Shared Drizzle client for the app.
 *
 * Uses @neondatabase/serverless which works in both Node.js and Vercel's
 * Edge Runtime without a persistent TCP connection.
 *
 * DATABASE_URL must be set in your .env.local (development) or Vercel
 * environment variables (production).
 */

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, { schema });
