// Server-only Neon client.
//
// NEVER import this from anything that runs in the browser. DATABASE_URL is a
// full-privilege Postgres credential; bundling it client-side would publish the
// database password to every player's phone. The only legitimate importers are
// the route handlers under app/api/. (This is also why the variable must not be
// named NEXT_PUBLIC_DATABASE_URL -- that prefix ships it to the client.)
//
// The HTTP driver issues each query as a one-shot fetch, which suits serverless:
// there is no pool to keep warm, and it lets Neon scale compute to zero between
// games instead of being held awake.
//
// ATOMICITY: every function in db/functions.sql is invoked as a SINGLE
// statement, which Postgres runs in its own implicit transaction. That is what
// keeps claim_buzz's `select ... for update` row lock meaningful -- the lock is
// held for the whole function body, so simultaneous buzzes still serialize and
// exactly one wins. Never split a function call across multiple statements here.
import { neon } from "@neondatabase/serverless";

let client: ReturnType<typeof neon> | null = null;

// Built lazily rather than at module scope so that merely importing this file
// (as `next build` does while collecting routes) cannot crash when
// DATABASE_URL is absent.
function sql() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    client = neon(url);
  }
  return client;
}

// Returns result ROWS. The driver's default is fullResults:false, so a query
// resolves straight to an array of row objects.
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const rows = await sql().query(text, params);
  return rows as T[];
}
