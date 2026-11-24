import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "./store.ts";

test("seeded counts, mode detection, and upvote toggle 42->43->42", () => {
  const localStore = createStore({});
  assert.equal(localStore.mode, "local");

  const supabaseStore = createStore({ SUPABASE_URL: "https://shippulse.supabase.co" });
  assert.equal(supabaseStore.mode, "supabase");

  const features = localStore.listFeatures();
  assert.equal(features.length, 2);
  assert.deepEqual(features[0], {
    id: "feat-1",
    title: "Live Terminal Stream",
    status: "in_progress",
    votes: 42,
    authorId: "seed",
  });
  assert.deepEqual(features[1], {
    id: "feat-2",
    title: "Automated RLS Checks",
    status: "shipped",
    votes: 19,
    authorId: "seed",
  });
  assert.equal(localStore.listChangelogs().length, 1);

  const up = localStore.toggleUpvote("feat-1", "user-1");
  assert.ok(up);
  assert.equal(up.voted, true);
  assert.equal(up.feature.votes, 43);

  const down = localStore.toggleUpvote("feat-1", "user-1");
  assert.ok(down);
  assert.equal(down.voted, false);
  assert.equal(down.feature.votes, 42);

  assert.equal(localStore.toggleUpvote("feat-missing", "user-1"), null);
});

test("createFeature and publishChangelog append new records", () => {
  const store = createStore({});

  const created = store.createFeature("  Dark Mode Presets  ", "u-builder");
  assert.equal(created.id, "feat-3");
  assert.equal(created.title, "Dark Mode Presets");
  assert.equal(created.status, "planned");
  assert.equal(created.votes, 1);
  assert.equal(created.authorId, "u-builder");
  assert.equal(store.listFeatures().length, 3);

  const entry = store.publishChangelog("v1.1.0", "Added dark mode presets.", created.id);
  assert.equal(entry.id, "log-2");
  assert.equal(entry.title, "v1.1.0");
  assert.equal(entry.body, "Added dark mode presets.");
  assert.equal(entry.featureId, created.id);
  assert.ok(Date.parse(entry.publishedAt) > 0);
  assert.equal(store.listChangelogs().length, 2);
});
