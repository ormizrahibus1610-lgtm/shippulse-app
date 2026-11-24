import { bearer, makeClient } from "./_supabase.mjs";
export async function GET(req) {
  const sb = makeClient(bearer(req));
  const [fRes, vRes] = await Promise.all([
    sb.from("features").select("id,title,status,author_id,created_at").order("created_at", { ascending: false }),
    sb.from("votes").select("feature_id"),
  ]);
  if (fRes.error) return Response.json({ error: fRes.error.message }, { status: 500 });
  const counts = {};
  for (const v of vRes.data || []) counts[v.feature_id] = (counts[v.feature_id] || 0) + 1;
  const features = (fRes.data || []).map((f) => ({ ...f, votes: counts[f.id] || 0 }));
  return Response.json({ storage: "supabase", features });
}
export async function POST(req) {
  const jwt = bearer(req);
  if (!jwt) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { title = "", status = "planned" } = await req.json().catch(() => ({}));
  if (!title.trim()) return Response.json({ error: "title required" }, { status: 400 });
  const sb = makeClient(jwt);
  const { data: u, error: ue } = await sb.auth.getUser(jwt);
  if (ue || !u?.user) return Response.json({ error: "invalid token" }, { status: 401 });
  const ins = await sb.from("features")
    .insert({ title: title.trim(), status, author_id: u.user.id })
    .select("id,title,status,author_id,created_at").single();
  if (ins.error) return Response.json({ error: ins.error.message }, { status: 403 });
  return Response.json({ feature: { ...ins.data, votes: 0 } }, { status: 201 });
}
export async function DELETE(req) {
  const jwt = bearer(req);
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!jwt || !id) return Response.json({ error: "unauthorized or missing id" }, { status: 400 });
  const del = await makeClient(jwt).from("features").delete().eq("id", id).select("id");
  if (del.error) return Response.json({ error: del.error.message }, { status: 403 });
  return Response.json({ deleted: (del.data || []).length > 0, id });
}
