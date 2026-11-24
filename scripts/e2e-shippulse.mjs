import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { createShipPulseServer } from "../src/server.ts";

async function main() {
  const server = await createShipPulseServer(process.env);
  let browser;
  let serverClosed = false;

  const closeServer = async () => {
    if (serverClosed) return;
    serverClosed = true;
    await new Promise((resolve) => {
      server.close(() => resolve());
      server.closeAllConnections?.();
    });
  };

  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject);
        resolve();
      });
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve ephemeral localhost server address");
    }
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200, `GET /api/health returned ${healthRes.status}`);
    const health = await healthRes.json();
    assert.equal(health.ok, true, "GET /api/health ok must be true");
    assert.ok(
      Array.isArray(health.modules) && health.modules.includes("auth-e2e"),
      `GET /api/health modules must include auth-e2e, got ${JSON.stringify(health.modules)}`,
    );

    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    const errs = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errs.push(`console.error: ${msg.text()}`);
      }
    });
    page.on("pageerror", (err) => {
      errs.push(`pageerror: ${err.message}`);
    });
    page.on("requestfailed", (req) => {
      errs.push(`requestfailed: ${req.method()} ${req.url()} (${req.failure()?.errorText ?? "unknown"})`);
    });
    page.on("response", (res) => {
      if (res.status() >= 400) {
        errs.push(`http_${res.status()}: ${res.request().method()} ${res.url()}`);
      }
    });

    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });

    const upvoteBtn = page.locator(".sp-card[data-id='feat-1'] .upvote-btn");
    const voteCount = page.locator(".sp-card[data-id='feat-1'] .vote-count");
    await upvoteBtn.waitFor({ state: "visible" });
    await voteCount.waitFor({ state: "visible" });

    const v0 = (await voteCount.innerText()).trim();
    assert.equal(v0, "42", `Expected initial feat-1 vote count 42, got ${v0}`);

    const [voteRes1] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("/api/votes") && res.request().method() === "POST",
      ),
      upvoteBtn.click(),
    ]);
    assert.equal(voteRes1.ok(), true, `First upvote request failed with ${voteRes1.status()}`);
    await page.waitForFunction(() => {
      const el = document.querySelector(".sp-card[data-id='feat-1'] .vote-count");
      return el?.textContent?.trim() === "43";
    });
    const v1 = (await voteCount.innerText()).trim();

    const [voteRes2] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("/api/votes") && res.request().method() === "POST",
      ),
      upvoteBtn.click(),
    ]);
    assert.equal(voteRes2.ok(), true, `Second upvote request failed with ${voteRes2.status()}`);
    await page.waitForFunction(() => {
      const el = document.querySelector(".sp-card[data-id='feat-1'] .vote-count");
      return el?.textContent?.trim() === "42";
    });
    const v2 = (await voteCount.innerText()).trim();

    const upvote = `${v0}->${v1}->${v2}`;
    assert.equal(upvote, "42->43->42", `Expected upvote toggle 42->43->42, got ${upvote}`);

    await page.locator("#feature-form").waitFor({ state: "visible" });
    await page.fill("#feature-title", "Webhook Export");
    const [createRes] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("/api/features") && res.request().method() === "POST",
      ),
      page.click("#feature-submit"),
    ]);
    assert.equal(createRes.ok(), true, `POST /api/features failed with ${createRes.status()}`);
    await page.waitForFunction(() => {
      const list = document.querySelector("#feature-list");
      return Boolean(list?.textContent?.includes("Webhook Export"));
    });
    const listText = await page.locator("#feature-list").innerText();
    assert.ok(listText.includes("Webhook Export"), "Expected 'Webhook Export' to render in #feature-list");

    await page.screenshot({ path: "verify-shippulse.png", fullPage: true });

    await Promise.all([
      page.waitForURL("**/changelog"),
      page.click("#nav-changelog"),
    ]);
    await page.locator("#changelog-list").waitFor({ state: "visible" });
    const changelogText = (await page.locator("#changelog-list").innerText()).trim();
    assert.ok(changelogText.length > 0, "Expected #changelog-list to render content");

    assert.equal(errs.length, 0, `Expected 0 errors, got: ${errs.join("; ")}`);

    await browser.close();
    browser = undefined;
    await closeServer();

    console.log(
      JSON.stringify({
        ok: true,
        modules: health.modules,
        upvote,
        errs: errs.length,
      }),
    );
  } finally {
    if (browser) {
      await browser.close();
    }
    await closeServer();
  }
}

await main();
