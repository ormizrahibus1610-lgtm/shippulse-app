import http from "node:http";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import type {
  ChangelogEntry, FeatureItem, SessionUser, ShipPulseStore,
} from "./shared/types.ts";

// Lane module contracts (read-only host router; each lane owns its own directory)
// Auth header: "x-demo-user": "<id>:<email>:<role>"
// API: GET/POST /api/features ({title}->{ok,item}), POST /api/votes ({featureId}->{ok,feature,voted}),
//      GET/POST /api/changelogs ({title,body,featureId}->{ok,entry})
// DOM: .sp-card[data-id="feat-1"] .upvote-btn .vote-count, #feature-form, #feature-title,
//      #feature-submit, #feature-list, #nav-changelog, #changelog-list
type StoreMod = { createStore: (env?: NodeJS.ProcessEnv) => ShipPulseStore };
type ApiMod = {
  handleApiRoute: (
    req: http.IncomingMessage,
    res: http.ServerResponse,
    store: ShipPulseStore,
    user: SessionUser | null,
  ) => Promise<boolean>;
};
type BoardMod = { renderBoardPage: (items: FeatureItem[], user: SessionUser | null) => string };
type LogMod = { renderChangelogPage: (entries: ChangelogEntry[]) => string };
type MwMod = {
  resolveSession: (req: http.IncomingMessage) => SessionUser | null;
  checkAuthMiddleware: (
    user: SessionUser | null, method: string, pathname: string,
  ) => { allowed: boolean; status: number; error?: string };
};

async function loadOpt<T>(rel: string): Promise<T | null> {
  const url = new URL(rel, import.meta.url);
  if (!existsSync(url)) return null;
  return (await import(url.href)) as T;
}

function makeIsolatedFallback() {
  const items: FeatureItem[] = [
    { id: "feat-1", title: "Live Terminal Stream", status: "in_progress", votes: 42, authorId: "seed" },
    { id: "feat-2", title: "Automated RLS Checks", status: "shipped", votes: 19, authorId: "seed" },
  ];
  const voted = new Set<string>();
  const boardHtml = () => {
    const cards = items.map((f) =>
      `<article class="sp-card" data-id="${f.id}"><div><h2>${f.title}</h2></div>` +
      `<button class="upvote-btn" data-id="${f.id}" type="button">` +
      `<span class="vote-count">${f.votes}</span></button></article>`,
    ).join("");
    return `<!doctype html><html><body style="background:#0B0E0C;color:#EEF2EF">` +
      `<a id="nav-changelog" href="/changelog">Changelog</a>` +
      `<form id="feature-form"><input id="feature-title" required />` +
      `<button id="feature-submit" type="submit">Submit</button></form>` +
      `<section id="feature-list">${cards}</section><script>` +
      `const H={"content-type":"application/json","x-demo-user":"u-demo:builder@example.com:user"};` +
      `document.getElementById("feature-list").addEventListener("click",async(e)=>{` +
      `const b=e.target.closest(".upvote-btn");if(!b)return;` +
      `const r=await fetch("/api/votes",{method:"POST",headers:H,body:JSON.stringify({featureId:b.dataset.id})});` +
      `if(!r.ok)return;const d=await r.json();b.querySelector(".vote-count").textContent=String(d.feature.votes);});` +
      `document.getElementById("feature-form").addEventListener("submit",async(e)=>{e.preventDefault();` +
      `const i=document.getElementById("feature-title");` +
      `const r=await fetch("/api/features",{method:"POST",headers:H,body:JSON.stringify({title:i.value})});` +
      `if(!r.ok)return;const {item}=await r.json();const c=document.createElement("article");` +
      `c.className="sp-card";c.dataset.id=item.id;c.textContent=item.title;` +
      `document.getElementById("feature-list").appendChild(c);i.value="";});` +
      `</script></body></html>`;
  };
  const logHtml = () => `<!doctype html><html><body><a id="nav-board" href="/">Board</a>` +
    `<section id="changelog-list"><article>v1.0.0</article></section></body></html>`;
  return async (req: http.IncomingMessage, res: http.ServerResponse, pathname: string, method: string) => {
    let raw = "";
    if (method === "POST") for await (const ch of req) raw += ch;
    const body = raw.trim() ? (JSON.parse(raw) as Record<string, unknown>) : {};
    if (method === "POST" && pathname === "/api/votes") {
      const f = items.find((x) => x.id === body.featureId);
      if (!f) { res.writeHead(404); res.end("{}"); return true; }
      const on = voted.has(f.id);
      if (on) { voted.delete(f.id); f.votes -= 1; } else { voted.add(f.id); f.votes += 1; }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, feature: f, voted: !on }));
      return true;
    }
    if (method === "POST" && pathname === "/api/features") {
      const item: FeatureItem = {
        id: `feat-${items.length + 1}`, title: String(body.title || ""), status: "planned", votes: 1, authorId: "u-demo",
      };
      items.push(item);
      res.writeHead(201, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, item }));
      return true;
    }
    if (pathname === "/changelog") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(logHtml());
      return true;
    }
    if (pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(boardHtml());
      return true;
    }
    return false;
  };
}

export async function createShipPulseServer(env: NodeJS.ProcessEnv = process.env) {
  const storeMod = await loadOpt<StoreMod>("./lib/db/store.ts");
  const apiMod = await loadOpt<ApiMod>("./app/api/routes.ts");
  const boardMod = await loadOpt<BoardMod>("./app/board/page.ts");
  const logMod = await loadOpt<LogMod>("./app/changelog/page.ts");
  const mwMod = await loadOpt<MwMod>("./middleware.ts");

  const modules: string[] = [];
  if (storeMod && apiMod) modules.push("db-api");
  if (boardMod && logMod) modules.push("ui-board");
  if (mwMod) modules.push("auth-e2e");

  const store = storeMod ? storeMod.createStore(env) : null;
  const fallback = (!storeMod || !apiMod || !boardMod || !logMod) ? makeIsolatedFallback() : null;

  return http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const method = req.method || "GET";
    if (url.pathname === "/favicon.ico") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (url.pathname === "/api/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, mode: store?.mode ?? "local", modules }));
      return;
    }
    const user = mwMod ? mwMod.resolveSession(req) : null;
    if (mwMod) {
      const gate = mwMod.checkAuthMiddleware(user, method, url.pathname);
      if (!gate.allowed) {
        res.writeHead(gate.status, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: gate.error || "unauthorized" }));
        return;
      }
    }
    if (url.pathname.startsWith("/api/") && apiMod && store) {
      const handled = await apiMod.handleApiRoute(req, res, store, user);
      if (handled) return;
    }
    if (url.pathname === "/changelog" && logMod && store) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(logMod.renderChangelogPage(store.listChangelogs()));
      return;
    }
    if (url.pathname === "/" && boardMod && store) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(boardMod.renderBoardPage(store.listFeatures(), user));
      return;
    }
    if (fallback && await fallback(req, res, url.pathname, method)) return;
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "not_found" }));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 4193);
  const srv = await createShipPulseServer(process.env);
  srv.listen(port, "127.0.0.1", () => {
    process.stdout.write(`ready http://127.0.0.1:${port}
`);
  });
}
