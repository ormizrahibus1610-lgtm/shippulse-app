import { createClient } from "@supabase/supabase-js";
export function supaEnv(env = process.env) {
  const url = env.PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = env.PUBLIC_SUPABASE_ANON_KEY
    || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return { url, key };
}
export function makeClient(jwt = "", env = process.env) {
  const { url, key } = supaEnv(env);
  if (!url || !key) throw new Error("Missing PUBLIC_SUPABASE_URL/ANON_KEY");
  const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {};
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers },
  });
}
export function bearer(req) {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}
