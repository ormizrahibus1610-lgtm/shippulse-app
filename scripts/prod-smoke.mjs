import fs from "node:fs";
import { chromium } from "playwright-core";
const BASE = (process.env.PROD_URL || "").replace(/\/$/, "");
const CHROME = process.env.CHROME_PATH || "/usr/bin/google-chrome";
const EMAIL = process.env.SMOKE_TEST_EMAIL || "alice@example.com";
const PASS = process.env.SMOKE_TEST_PASSWORD || process.env.DEMO_TEST_PASSWORD;
if (!BASE || !PASS) { console.error("Set PROD_URL & pass"); process.exit(1); }
const errors = [];
let browser, token = "", createdId = "";
try {
  browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(`pageerror:${e.message}`));
  page.on("response", (r) => r.status() >= 400 && errors.push(`http:${r.status()}`));
  await page.goto(BASE, { waitUntil: "networkidle" });
  const authRes = page.waitForResponse((r) => r.url().includes("/api/auth"));
  await page.fill("#auth-email", EMAIL); await page.fill("#auth-password", PASS);
  await Promise.all([authRes, page.click("#auth-submit")]);
  token = (await (await authRes).json()).accessToken || "";
  const title = `Prod Smoke ${Date.now().toString().slice(-4)}`;
  const mk = page.waitForResponse((r) =>
    r.url().includes("/api/features") && r.request().method() === "POST");
  await page.fill("#feature-title", title);
  await Promise.all([mk, page.click("#feature-submit")]);
  createdId = (await (await mk).json()).feature?.id || "";
  const card = page.locator(".feature-card", { hasText: title }).first();
  const v0 = (await card.locator(".vote-count").textContent()).trim();
  const vr = page.waitForResponse((r) => r.url().includes("/api/vote"));
  await Promise.all([vr, card.locator(".upvote-btn").click()]);
  await page.reload({ waitUntil: "networkidle" });
  const kept = page.locator(".feature-card", { hasText: title }).first();
  const v1 = (await kept.locator(".vote-count").textContent()).trim();
  const st = ((await page.locator("#storage-badge").textContent()) || "").trim();
  await page.screenshot({ path: "prod-shippulse.png" });
  const persisted = (await kept.count()) === 1 && v0 === "0" && v1 === "1";
  const out = { ok: persisted && !errors.length, host: new URL(BASE).host,
    persisted, upvote: `${v0}->${v1}`, storage: st, errs: errors.length };
  fs.writeFileSync("/tmp/prod-smoke-result.json", JSON.stringify(out) + "\n");
  console.log(JSON.stringify(out)); process.exitCode = out.ok ? 0 : 1;
} finally {
  if (createdId && token) {
    const u = `${BASE}/api/features?id=${encodeURIComponent(createdId)}`;
    await fetch(u, { method: "DELETE",
      headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  }
  await browser?.close();
}
