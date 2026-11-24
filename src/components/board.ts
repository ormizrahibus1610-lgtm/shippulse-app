import type { FeatureItem, RoadmapStatus, SessionUser } from "../shared/types.ts";

export const MATRIX_THEME = {
  background: "#0B0E0C",
  surface: "#111714",
  surfaceElevated: "#16201B",
  border: "#1F3327",
  text: "#EEF2EF",
  muted: "#95A89C",
  accent: "#00FF66",
  accentDim: "#15803D",
} as const;

export const DEFAULT_DEMO_USER = "u-demo:builder@example.com:user";

const STATUS_LABELS: Record<RoadmapStatus, string> = {
  planned: "PLANNED",
  in_progress: "IN PROGRESS",
  shipped: "SHIPPED",
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatDemoUserHeader(user: SessionUser | null): string {
  if (!user) return DEFAULT_DEMO_USER;
  return `${user.id}:${user.email}:${user.role}`;
}

export function renderMatrixStyles(): string {
  const t = MATRIX_THEME;
  return `<style>
  :root {
    --sp-bg: ${t.background};
    --sp-surface: ${t.surface};
    --sp-surface-hi: ${t.surfaceElevated};
    --sp-border: ${t.border};
    --sp-text: ${t.text};
    --sp-muted: ${t.muted};
    --sp-accent: ${t.accent};
    --sp-accent-dim: ${t.accentDim};
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    background: ${t.background};
    color: ${t.text};
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    line-height: 1.5;
  }
  .sp-shell {
    max-width: 840px;
    margin: 0 auto;
    padding: 32px 20px 64px;
  }
  .sp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 20px;
    margin-bottom: 28px;
    border-bottom: 1px solid var(--sp-border);
  }
  .sp-brand {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sp-brand-title {
    margin: 0;
    font-size: 1.35rem;
    letter-spacing: 0.06em;
    color: var(--sp-accent);
  }
  .sp-brand-sub {
    margin: 0;
    font-size: 0.82rem;
    color: var(--sp-muted);
  }
  .sp-nav {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .sp-user-badge {
    font-size: 0.78rem;
    color: var(--sp-muted);
    padding: 5px 10px;
    border: 1px solid var(--sp-border);
    border-radius: 6px;
    background: var(--sp-surface);
  }
  #nav-changelog {
    color: var(--sp-accent);
    text-decoration: none;
    font-size: 0.88rem;
    padding: 7px 12px;
    border: 1px solid var(--sp-accent-dim);
    border-radius: 6px;
    background: rgba(0, 255, 102, 0.06);
  }
  #nav-changelog:hover {
    background: rgba(0, 255, 102, 0.14);
  }
  #feature-form {
    display: flex;
    gap: 10px;
    margin-bottom: 24px;
    padding: 14px;
    border: 1px solid var(--sp-border);
    border-radius: 10px;
    background: var(--sp-surface);
  }
  #feature-title {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid var(--sp-border);
    border-radius: 6px;
    background: var(--sp-bg);
    color: var(--sp-text);
    font: inherit;
  }
  #feature-title:focus {
    outline: 1px solid var(--sp-accent);
    border-color: var(--sp-accent);
  }
  #feature-submit {
    padding: 10px 16px;
    border: 1px solid var(--sp-accent);
    border-radius: 6px;
    background: rgba(0, 255, 102, 0.14);
    color: var(--sp-accent);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
  #feature-submit:hover {
    background: rgba(0, 255, 102, 0.24);
  }
  #feature-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .sp-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 18px;
    border: 1px solid var(--sp-border);
    border-radius: 10px;
    background: var(--sp-surface);
  }
  .sp-card:hover {
    border-color: var(--sp-accent-dim);
    background: var(--sp-surface-hi);
  }
  .sp-card-main {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .sp-card-title {
    margin: 0;
    font-size: 1rem;
    color: var(--sp-text);
    word-break: break-word;
  }
  .sp-card-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.75rem;
    color: var(--sp-muted);
  }
  .sp-status {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid var(--sp-accent-dim);
    color: var(--sp-accent);
    font-size: 0.72rem;
    letter-spacing: 0.05em;
  }
  .upvote-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border: 1px solid var(--sp-accent-dim);
    border-radius: 8px;
    background: var(--sp-bg);
    color: var(--sp-accent);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    flex-shrink: 0;
  }
  .upvote-btn:hover,
  .upvote-btn.is-voted {
    border-color: var(--sp-accent);
    background: rgba(0, 255, 102, 0.14);
  }
  .vote-count {
    min-width: 2ch;
    text-align: right;
  }
</style>`;
}

export function renderBoardHeader(user: SessionUser | null): string {
  const identity = user ? `${user.email} (${user.role})` : "builder@example.com (demo)";
  return `<header class="sp-header">
    <div class="sp-brand">
      <h1 class="sp-brand-title">SHIPPULSE // ROADMAP</h1>
      <p class="sp-brand-sub">Signal-driven feature board</p>
    </div>
    <nav class="sp-nav" aria-label="Primary">
      <span class="sp-user-badge">${escapeHtml(identity)}</span>
      <a id="nav-changelog" href="/changelog">Changelog</a>
    </nav>
  </header>`;
}

export function renderFeatureForm(): string {
  return `<form id="feature-form" autocomplete="off">
    <input id="feature-title" name="title" type="text" placeholder="Propose a new ShipPulse feature..." required />
    <button id="feature-submit" type="submit">Submit Feature</button>
  </form>`;
}

export function renderFeatureCard(item: FeatureItem): string {
  const safeId = escapeHtml(item.id);
  const safeTitle = escapeHtml(item.title);
  const safeStatus = escapeHtml(item.status);
  const statusLabel = STATUS_LABELS[item.status] ?? safeStatus.toUpperCase();
  const safeAuthor = escapeHtml(item.authorId);

  return `<article class="sp-card" data-id="${safeId}">
    <div class="sp-card-main">
      <h2 class="sp-card-title">${safeTitle}</h2>
      <div class="sp-card-meta">
        <span class="sp-status" data-status="${safeStatus}">${escapeHtml(statusLabel)}</span>
        <span class="sp-author">by ${safeAuthor}</span>
      </div>
    </div>
    <button class="upvote-btn" data-id="${safeId}" type="button" aria-label="Upvote ${safeTitle}">
      <span class="upvote-icon" aria-hidden="true">&#9650;</span>
      <span class="vote-count">${item.votes}</span>
    </button>
  </article>`;
}
