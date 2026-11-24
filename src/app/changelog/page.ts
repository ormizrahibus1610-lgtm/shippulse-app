import type { ChangelogEntry } from "../../shared/types.ts";
import {
  escapeHtml,
  MATRIX_THEME,
  renderMatrixStyles,
} from "../../components/board.ts";

function renderChangelogStyles(): string {
  return `<style>
  #nav-board {
    color: var(--sp-accent);
    text-decoration: none;
    font-size: 0.88rem;
    padding: 7px 12px;
    border: 1px solid var(--sp-accent-dim);
    border-radius: 6px;
    background: rgba(0, 255, 102, 0.06);
  }
  #nav-board:hover {
    background: rgba(0, 255, 102, 0.14);
  }
  #changelog-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .sp-changelog-entry {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 18px 20px;
    border: 1px solid var(--sp-border);
    border-radius: 10px;
    background: var(--sp-surface);
  }
  .sp-changelog-entry:hover {
    border-color: var(--sp-accent-dim);
    background: var(--sp-surface-hi);
  }
  .sp-changelog-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .sp-changelog-title {
    margin: 0;
    font-size: 1.05rem;
    color: var(--sp-text);
    word-break: break-word;
  }
  .sp-changelog-date {
    font-size: 0.78rem;
    color: var(--sp-muted);
    white-space: nowrap;
  }
  .sp-changelog-body {
    margin: 0;
    font-size: 0.9rem;
    color: var(--sp-text);
    word-break: break-word;
  }
  .sp-changelog-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.76rem;
    color: var(--sp-muted);
  }
  .sp-feature-ref {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--sp-accent-dim);
    color: var(--sp-accent);
    letter-spacing: 0.04em;
  }
  .sp-empty {
    margin: 0;
    padding: 20px;
    border: 1px dashed var(--sp-border);
    border-radius: 10px;
    background: var(--sp-surface);
    color: var(--sp-muted);
    font-size: 0.9rem;
  }
</style>`;
}

function renderChangelogEntry(entry: ChangelogEntry): string {
  const safeId = escapeHtml(entry.id);
  const safeTitle = escapeHtml(entry.title);
  const safeBody = escapeHtml(entry.body);
  const safeFeatureId = escapeHtml(entry.featureId);
  const safePublishedAt = escapeHtml(entry.publishedAt);

  return `<article class="sp-changelog-entry" data-id="${safeId}" data-feature-id="${safeFeatureId}">
    <div class="sp-changelog-head">
      <h2 class="sp-changelog-title">${safeTitle}</h2>
      <time class="sp-changelog-date" datetime="${safePublishedAt}">${safePublishedAt}</time>
    </div>
    <p class="sp-changelog-body">${safeBody}</p>
    <div class="sp-changelog-meta">
      <span class="sp-feature-ref">feature: ${safeFeatureId}</span>
    </div>
  </article>`;
}

export function renderChangelogPage(entries: ChangelogEntry[]): string {
  const content = entries.length > 0
    ? entries.map(renderChangelogEntry).join("\n")
    : `<p class="sp-empty">No changelog entries published yet.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ShipPulse Changelog</title>
  ${renderMatrixStyles()}
  ${renderChangelogStyles()}
</head>
<body style="background:${MATRIX_THEME.background};color:${MATRIX_THEME.text}">
  <main class="sp-shell">
    <header class="sp-header">
      <div class="sp-brand">
        <h1 class="sp-brand-title">SHIPPULSE // CHANGELOG</h1>
        <p class="sp-brand-sub">Shipped releases and roadmap milestones</p>
      </div>
      <nav class="sp-nav" aria-label="Primary">
        <a id="nav-board" href="/">Board</a>
      </nav>
    </header>
    <section id="changelog-list" aria-label="Release changelog">
      ${content}
    </section>
  </main>
</body>
</html>`;
}
