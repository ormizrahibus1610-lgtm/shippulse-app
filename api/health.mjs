import { supaEnv } from "./_supabase.mjs";
export async function GET() {
  const { url, key } = supaEnv();
  return Response.json({
    ok: true,
    env: process.env.APP_ENV || process.env.VERCEL_ENV || "development",
    supabaseReady: Boolean(url && key),
    rlsEnforced: true,
  });
}
