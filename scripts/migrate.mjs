// Applies db/schema.sql then db/functions.sql to DATABASE_URL, in that order.
//
//   node scripts/migrate.mjs
//
// This replaces the old "paste both files into the Supabase SQL editor" step.
// Both files are idempotent, so running this over a live database is safe and is
// the normal way to pick up a schema or function change -- there is still no
// migrations folder.
//
// Uses Client (the real Postgres wire protocol over WebSocket) rather than the
// HTTP driver in lib/db.ts: the HTTP endpoint executes ONE statement per
// request, while these files are many statements including $$-quoted plpgsql
// bodies that a naive split on ";" would tear in half.

import { readFileSync } from "fs";
import { Client } from "@neondatabase/serverless";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = process.env.DATABASE_URL || env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Put it in .env.local (server-only, no NEXT_PUBLIC_ prefix).");
  process.exit(1);
}

const client = new Client(url);
await client.connect();

try {
  for (const rel of ["../db/schema.sql", "../db/functions.sql"]) {
    const name = rel.replace("../", "");
    process.stdout.write(`applying ${name} ... `);
    await client.query(readFileSync(new URL(rel, import.meta.url), "utf8"));
    console.log("ok");
  }

  const { rows: tables } = await client.query(
    `select table_name from information_schema.tables
      where table_schema = 'public' order by table_name`
  );
  const { rows: fns } = await client.query(
    `select p.proname from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' order by p.proname`
  );

  console.log(`\ntables (${tables.length}): ${tables.map((t) => t.table_name).join(", ")}`);
  console.log(`functions (${fns.length}): ${fns.map((f) => f.proname).join(", ")}`);
} finally {
  await client.end();
}
