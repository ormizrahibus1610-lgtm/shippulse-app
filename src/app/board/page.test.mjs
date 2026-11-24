import test from "node:test";
import assert from "node:assert/strict";
import { renderBoardPage } from "./page.ts";

test("renderBoardPage outputs dark Matrix theme, escaped cards, and DOM contracts", () => {
  const html = renderBoardPage(
    [
      {
        id: "feat-1",
        title: "Live <script>Terminal</script> Stream",
        status: "in_progress",
        votes: 42,
        authorId: "seed",
      },
    ],
    null,
  );

  assert.match(html, /#0B0E0C/);
  assert.match(html, /#EEF2EF/);
  assert.match(html, /#00FF66/);
  assert.match(html, /id="nav-changelog"[^>]*href="\/changelog"/);
  assert.match(html, /id="feature-form"/);
  assert.match(html, /id="feature-title"/);
  assert.match(html, /id="feature-submit"/);
  assert.match(html, /id="feature-list"/);
  assert.match(html, /class="sp-card"[^>]*data-id="feat-1"/);
  assert.match(html, /class="upvote-btn"[^>]*data-id="feat-1"/);
  assert.match(html, /class="vote-count">42<\/span>/);
  assert.doesNotMatch(html, /<script>Terminal<\/script>/);
  assert.match(html, /Live &lt;script&gt;Terminal&lt;\/script&gt; Stream/);
});

test("renderBoardPage embeds x-demo-user header for votes and features API calls", () => {
  const defaultHtml = renderBoardPage([], null);
  assert.match(defaultHtml, /"x-demo-user":\s*DEMO_USER/);
  assert.match(defaultHtml, /"u-demo:builder@example\.com:user"/);
  assert.match(defaultHtml, /fetch\("\/api\/votes"/);
  assert.match(defaultHtml, /fetch\("\/api\/features"/);

  const activeHtml = renderBoardPage([], {
    id: "u-admin",
    email: "ops@shippulse.dev",
    role: "admin",
  });
  assert.match(activeHtml, /"u-admin:ops@shippulse\.dev:admin"/);
});
