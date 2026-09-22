/**
 * Terminates any Postgres backend holding Prisma Migrate's advisory lock
 * (id 72707369), which sometimes gets stuck when two `prisma migrate
 * deploy` runs race against the same database (e.g. a Preview and
 * Production build triggered close together against a shared DATABASE_URL)
 * and one process dies without releasing the lock cleanly.
 *
 * Run against production (never prints or stores the pulled secrets):
 *   vercel env pull .env.production.local --environment=production --yes
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.production.local | cut -d'=' -f2- | tr -d '"') \
 *     npx tsx scripts/clear-migrate-lock.ts
 *   rm .env.production.local
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

const LOCK_ID = "72707369"; // Prisma Migrate's fixed advisory lock id

async function main() {
  const { prisma } = await import("../src/lib/prisma");

  const holders: { pid: number; state: string | null; query: string | null; query_start: Date | null }[] =
    await prisma.$queryRawUnsafe(`
      SELECT a.pid, a.state, a.query, a.query_start
      FROM pg_locks l
      JOIN pg_stat_activity a ON l.pid = a.pid
      WHERE l.locktype = 'advisory' AND l.objid = ${LOCK_ID}::bigint
    `);

  console.log(`Sessions holding advisory lock ${LOCK_ID}:`, holders);

  for (const h of holders) {
    console.log(`Terminating backend pid ${h.pid} (state: ${h.state}, started: ${h.query_start})...`);
    await prisma.$queryRawUnsafe(`SELECT pg_terminate_backend(${h.pid})`);
  }

  console.log(holders.length === 0 ? "No stuck sessions found — lock may already be clear." : `Terminated ${holders.length} session(s).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
