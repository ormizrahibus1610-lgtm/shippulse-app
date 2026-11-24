import { bearer, makeClient } from "./_supabase.mjs";
export async function POST(req) {
  const jwt = bearer(req);
  if (!jwt) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { featureId = "" } = await req.json().catch(() => ({}));
  if (!featureId) return Response.json({ error: "featureId required" }, { status: 400 });
  const sb = makeClient(jwt);
  const { data: u, error: ue } = await sb.auth.getUser(jwt);
  if (ue || !u?.user) return Response.json({ error: "invalid token" }, { status: 401 });
  const cur = await sb.from("votes").select("id")
    .eq("feature_id", featureId).eq("user_id", u.user.id).maybeSingle();
  let voted = false;
  if (cur.data?.id) {
    const d = await sb.from("votes").delete().eq("id", cur.data.id);
    if (d.error) return Response.json({ error: d.error.message }, { status: 403 });
  } else {
    const ins = await sb.from("votes").insert({ feature_id: featureId, user_id: u.user.id });
    if (ins.error) return Response.json({ error: ins.error.message }, { status: 403 });
    voted = true;
  }
  const all = await sb.from("votes").select("id", { count: "exact", head: true })
    .eq("feature_id", featureId);
  return Response.json({ voted, votes: all.count || 0 });
}
