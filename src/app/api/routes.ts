import type http from "node:http";
import type { SessionUser, ShipPulseStore } from "../../shared/types.ts";

type JsonBodyResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false };

function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req: http.IncomingMessage): Promise<JsonBodyResult> {
  let raw = "";
  for await (const chunk of req) {
    raw += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
  }
  if (!raw.trim()) {
    return { ok: true, data: {} };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return { ok: true, data: parsed as Record<string, unknown> };
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

function readTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function handleApiRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  store: ShipPulseStore,
  user: SessionUser | null,
): Promise<boolean> {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const method = (req.method || "GET").toUpperCase();
  const { pathname } = url;

  if (pathname === "/api/features" && method === "GET") {
    sendJson(res, 200, { ok: true, items: store.listFeatures() });
    return true;
  }

  if (pathname === "/api/features" && method === "POST") {
    const body = await readJsonBody(req);
    if (!body.ok) {
      sendJson(res, 400, { ok: false, error: "invalid_json" });
      return true;
    }
    const title = readTrimmedString(body.data.title);
    if (!title) {
      sendJson(res, 400, { ok: false, error: "title_required" });
      return true;
    }
    const item = store.createFeature(title, user?.id ?? "u-demo");
    sendJson(res, 201, { ok: true, item });
    return true;
  }

  if (pathname === "/api/votes" && method === "POST") {
    const body = await readJsonBody(req);
    if (!body.ok) {
      sendJson(res, 400, { ok: false, error: "invalid_json" });
      return true;
    }
    const featureId = readTrimmedString(body.data.featureId);
    const result = featureId ? store.toggleUpvote(featureId, user?.id ?? "u-demo") : null;
    if (!result) {
      sendJson(res, 404, { ok: false, error: "feature_not_found" });
      return true;
    }
    sendJson(res, 200, { ok: true, feature: result.feature, voted: result.voted });
    return true;
  }

  if (pathname === "/api/changelogs" && method === "GET") {
    sendJson(res, 200, { ok: true, entries: store.listChangelogs() });
    return true;
  }

  if (pathname === "/api/changelogs" && method === "POST") {
    const body = await readJsonBody(req);
    if (!body.ok) {
      sendJson(res, 400, { ok: false, error: "invalid_json" });
      return true;
    }
    const title = readTrimmedString(body.data.title);
    const entryBody = readTrimmedString(body.data.body);
    const featureId = readTrimmedString(body.data.featureId);
    if (!title || !entryBody || !featureId) {
      sendJson(res, 400, { ok: false, error: "invalid_changelog" });
      return true;
    }
    const entry = store.publishChangelog(title, entryBody, featureId);
    sendJson(res, 201, { ok: true, entry });
    return true;
  }

  return false;
}
