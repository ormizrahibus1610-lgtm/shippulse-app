import type { FeatureItem, SessionUser } from "../../shared/types.ts";
import {
  formatDemoUserHeader,
  MATRIX_THEME,
  renderBoardHeader,
  renderFeatureCard,
  renderFeatureForm,
  renderMatrixStyles,
} from "../../components/board.ts";

function renderBoardClientScript(demoUserHeader: string): string {
  const serializedUser = JSON.stringify(demoUserHeader).replaceAll("<", "\\u003c");
  return `<script>
(() => {
  const DEMO_USER = ${serializedUser};
  const HEADERS = {
    "content-type": "application/json",
    "x-demo-user": DEMO_USER,
  };
  const STATUS_LABELS = {
    planned: "PLANNED",
    in_progress: "IN PROGRESS",
    shipped: "SHIPPED",
  };

  function buildCardElement(item) {
    const card = document.createElement("article");
    card.className = "sp-card";
    card.dataset.id = String(item.id);

    const main = document.createElement("div");
    main.className = "sp-card-main";

    const heading = document.createElement("h2");
    heading.className = "sp-card-title";
    heading.textContent = String(item.title);

    const meta = document.createElement("div");
    meta.className = "sp-card-meta";

    const status = document.createElement("span");
    status.className = "sp-status";
    status.dataset.status = String(item.status || "planned");
    status.textContent = STATUS_LABELS[item.status] || String(item.status || "planned").toUpperCase();

    const author = document.createElement("span");
    author.className = "sp-author";
    author.textContent = "by " + String(item.authorId || "u-demo");

    meta.append(status, author);
    main.append(heading, meta);

    const btn = document.createElement("button");
    btn.className = "upvote-btn";
    btn.dataset.id = String(item.id);
    btn.type = "button";
    btn.setAttribute("aria-label", "Upvote " + String(item.title));

    const icon = document.createElement("span");
    icon.className = "upvote-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "\\u25B2";

    const count = document.createElement("span");
    count.className = "vote-count";
    count.textContent = String(item.votes);

    btn.append(icon, count);
    card.append(main, btn);
    return card;
  }

  const listEl = document.getElementById("feature-list");
  if (listEl) {
    listEl.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const btn = target.closest(".upvote-btn");
      if (!(btn instanceof HTMLElement)) return;
      const featureId = btn.dataset.id;
      if (!featureId) return;

      const res = await fetch("/api/votes", {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ featureId }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !data.feature) return;
      const countEl = btn.querySelector(".vote-count");
      if (countEl) {
        countEl.textContent = String(data.feature.votes);
      }
      btn.classList.toggle("is-voted", Boolean(data.voted));
    });
  }

  const formEl = document.getElementById("feature-form");
  if (formEl) {
    formEl.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = document.getElementById("feature-title");
      if (!(input instanceof HTMLInputElement)) return;
      const title = input.value.trim();
      if (!title) return;

      const res = await fetch("/api/features", {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ title }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !data.item || !listEl) return;

      listEl.appendChild(buildCardElement(data.item));
      input.value = "";
    });
  }
})();
</script>`;
}

export function renderBoardPage(items: FeatureItem[], user: SessionUser | null): string {
  const cards = items.map(renderFeatureCard).join("\n");
  const demoUserHeader = formatDemoUserHeader(user);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ShipPulse Board</title>
  ${renderMatrixStyles()}
</head>
<body style="background:${MATRIX_THEME.background};color:${MATRIX_THEME.text}">
  <main class="sp-shell">
    ${renderBoardHeader(user)}
    ${renderFeatureForm()}
    <section id="feature-list" aria-label="Feature requests">
      ${cards}
    </section>
  </main>
  ${renderBoardClientScript(demoUserHeader)}
</body>
</html>`;
}
