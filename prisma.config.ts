import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

// Migrations need a direct (non-pooled) connection — Prisma Migrate holds a
// session-level Postgres advisory lock for the duration of the migration,
// and a pooled connection (Neon's `-pooler` host) can hand that same
// underlying backend to an unrelated later session, making a lock look
// "stuck" or causing a script that queries for lock holders to find and
// terminate its own connection. DATABASE_URL_UNPOOLED is set in production
// by the Neon integration; local dev has no pooler at all, so it falls back
// to the regular URL there.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED || env("DATABASE_URL"),
  },
});
