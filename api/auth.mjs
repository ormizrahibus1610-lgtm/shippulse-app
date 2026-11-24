import { makeClient } from "./_supabase.mjs";
export async function POST(req) {
  const { email = "", password = "" } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return Response.json({ error: "email and password required" }, { status: 400 });
  }
  const sb = makeClient();
  let res = await sb.auth.signInWithPassword({ email, password });
  if (res.error || !res.data?.session) {
    res = await sb.auth.signUp({ email, password });
  }
  if (res.error || !res.data?.session) {
    return Response.json({ error: res.error?.message || "auth failed" }, { status: 401 });
  }
  return Response.json({
    accessToken: res.data.session.access_token,
    user: { id: res.data.user.id, email: res.data.user.email },
  });
}
