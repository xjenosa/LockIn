import { createClient } from "@supabase/supabase-js";

// Placeholder fallbacks keep `next build` prerendering working with no env
// configured; supabaseConfigured gates the landing-page warning instead of
// crashing. Only the public anon key is ever used client-side (RLS makes it
// read-only; writes go through the RPCs in lib/api.ts). No auth sessions:
// identity is localStorage tokens, see lib/identity.ts.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
