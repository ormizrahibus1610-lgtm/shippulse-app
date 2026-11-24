import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createStore } from "../../lib/db/store.ts";
import { handleApiRoute } from "./routes.ts";

async function startRouteServer(user = null) {
  const store = createStore({});
  const unhandledPaths = [];
  const server = http.createServer(async (req, res) => {
    const handled = await handleApiRoute(req, res, store, user);
    if (!handled) {
      unhandledPaths.push(req.url || "/");
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "not_found" }));
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    baseUrl,
    unhandledPaths,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("feature and vote endpoints handle listing, creation, toggling, 400/404, and unknown paths", async () => {
  const srv = await startRouteServer({
    id: "u-builder",
    email: "builder@example.com",
    role: "user",
  });
  try {
    const listRes = await fetch(`${srv.baseUrl}/api/features`);
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.equal(listData.ok, true);
    assert.equal(listData.items.length, 2);
    assert.equal(listData.items[0].votes, 42);

    const blankRes = await fetch(`${srv.baseUrl}/api/features`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "   " }),
    });
    assert.equal(blankRes.status, 400);
    const blankData = await blankRes.json();
    assert.equal(blankData.ok, false);

    const createRes = await fetch(`${srv.baseUrl}/api/features`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "  Slack Alerts  " }),
    });
    assert.equal(createRes.status, 201);
    const createData = await createRes.json();
    assert.equal(createData.ok, true);
    assert.equal(createData.item.id, "feat-3");
    assert.equal(createData.item.title, "Slack Alerts");
    assert.equal(createData.item.authorId, "u-builder");

    const upRes = await fetch(`${srv.baseUrl}/api/votes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ featureId: "feat-1" }),
    });
    assert.equal(upRes.status, 200);
    const upData = await upRes.json();
    assert.equal(upData.ok, true);
    assert.equal(upData.voted, true);
    assert.equal(upData.feature.votes, 43);

    const downRes = await fetch(`${srv.baseUrl}/api/votes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ featureId: "feat-1" }),
    });
    assert.equal(downRes.status, 200);
    const downData = await downRes.json();
    assert.equal(downData.ok, true);
    assert.equal(downData.voted, false);
    assert.equal(downData.feature.votes, 42);

    const missingVoteRes = await fetch(`${srv.baseUrl}/api/votes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ featureId: "feat-missing" }),
    });
    assert.equal(missingVoteRes.status, 404);

    const unknownRes = await fetch(`${srv.baseUrl}/api/unknown`);
    assert.equal(unknownRes.status, 404);
    assert.deepEqual(srv.unhandledPaths, ["/api/unknown"]);
  } finally {
    await srv.close();
  }
});

test("changelog endpoints list entries, validate payloads, and publish new entries", async () => {
  const srv = await startRouteServer({
    id: "u-admin",
    email: "admin@example.com",
    role: "admin",
  });
  try {
    const listRes = await fetch(`${srv.baseUrl}/api/changelogs`);
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    assert.equal(listData.ok, true);
    assert.equal(listData.entries.length, 1);
    assert.equal(listData.entries[0].id, "log-1");

    const invalidRes = await fetch(`${srv.baseUrl}/api/changelogs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "  ", body: "Details", featureId: "feat-1" }),
    });
    assert.equal(invalidRes.status, 400);
    const invalidData = await invalidRes.json();
    assert.equal(invalidData.ok, false);

    const publishRes = await fetch(`${srv.baseUrl}/api/changelogs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "v1.1.0 - Live Terminal Stream",
        body: "Added real-time streaming logs.",
        featureId: "feat-1",
      }),
    });
    assert.equal(publishRes.status, 201);
    const publishData = await publishRes.json();
    assert.equal(publishData.ok, true);
    assert.equal(publishData.entry.id, "log-2");
    assert.equal(publishData.entry.title, "v1.1.0 - Live Terminal Stream");
    assert.equal(publishData.entry.body, "Added real-time streaming logs.");
    assert.equal(publishData.entry.featureId, "feat-1");
    assert.ok(Date.parse(publishData.entry.publishedAt) > 0);

    const afterRes = await fetch(`${srv.baseUrl}/api/changelogs`);
    const afterData = await afterRes.json();
    assert.equal(afterData.entries.length, 2);
  } finally {
    await srv.close();
  }
});
