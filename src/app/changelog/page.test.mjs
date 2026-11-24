import test from "node:test";
import assert from "node:assert/strict";
import { renderChangelogPage } from "./page.ts";

test("renderChangelogPage renders dark Matrix layout with #nav-board and #changelog-list entries", () => {
  const html = renderChangelogPage([
    {
      id: "log-1",
      title: "v1.0.0 Live Terminal Stream",
      body: "Shipped real-time execution output to the board.",
      featureId: "feat-1",
      publishedAt: "2026-11-24T10:00:00Z",
    },
  ]);

  assert.match(html, /#0B0E0C/);
  assert.match(html, /#EEF2EF/);
  assert.match(html, /#00FF66/);
  assert.match(html, /id="nav-board"[^>]*href="\/"/);
  assert.match(html, /id="changelog-list"/);
  assert.match(html, /data-id="log-1"/);
  assert.match(html, /v1\.0\.0 Live Terminal Stream/);
  assert.match(html, /Shipped real-time execution output to the board\./);
  assert.match(html, /feat-1/);
  assert.match(html, /2026-11-24T10:00:00Z/);

  const emptyHtml = renderChangelogPage([]);
  assert.match(emptyHtml, /id="nav-board"[^>]*href="\/"/);
  assert.match(emptyHtml, /id="changelog-list"/);
});

test("renderChangelogPage escapes HTML in title, body, featureId, and publishedAt", () => {
  const html = renderChangelogPage([
    {
      id: 'log-"1"',
      title: 'Release <script>alert("xss")</script> & Notes',
      body: "Supports <img src=x onerror=alert(1)> & 'quotes'",
      featureId: 'feat-<"2">',
      publishedAt: "2026-11-24<script>bad()</script>",
    },
  ]);

  assert.doesNotMatch(html, /<script>alert\("xss"\)<\/script>/);
  assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/);
  assert.doesNotMatch(html, /<script>bad\(\)<\/script>/);
  assert.match(
    html,
    /Release &lt;script&gt;alert\(&quot;xss&quot;\)&lt;\/script&gt; &amp; Notes/,
  );
  assert.match(
    html,
    /Supports &lt;img src=x onerror=alert\(1\)&gt; &amp; &#39;quotes&#39;/,
  );
  assert.match(html, /feat-&lt;&quot;2&quot;&gt;/);
  assert.match(html, /2026-11-24&lt;script&gt;bad\(\)&lt;\/script&gt;/);
});
