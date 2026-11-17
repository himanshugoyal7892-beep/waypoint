// End-to-end check of AI demo mode (no ANTHROPIC_API_KEY): New tour → "Draft with AI" opens the
// site, the builder drafts by itself, steps are added and the tour renamed; Arabic wording; review.
// Needs Waypoint on :3000 WITHOUT an AI key and a signed-in dashboard (local review only).
// Usage: PROJECT_ID=… node tests/browser/ai-demo-check.mjs
import { createServer } from "node:http";
import { chromium } from "playwright-core";
import { page as render } from "./shop.mjs";

const API = "http://localhost:3000";
const KEY = process.env.PROJECT_KEY ?? "pk_demoShop0000000000000000";
const PROJECT = process.env.PROJECT_ID;
const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
};
const shop = createServer((req, res) => {
  const html = render(new URL(req.url, "http://x").pathname, `${API}/sdk/product-tour.js`, KEY);
  res.writeHead(html ? 200 : 404, { "content-type": "text/html" }).end(html ?? "nf");
}).listen(5173);
const admin = async (method, path, body) => {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { "content-type": "application/json", origin: API },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json().catch(() => null);
};

const b = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--no-sandbox"],
});
let tourId;
try {
  const ctx = await b.newContext({ viewport: { width: 1360, height: 880 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));

  /* 1. New tour → Draft with AI */
  await p.goto(`${API}/dashboard/projects/${PROJECT}/tours/new`);
  await p.getByRole("radio", { name: /Draft with AI/ }).waitFor();
  check(
    "New tour opens on 'Draft with AI'",
    (await p.getByRole("radio", { name: /Draft with AI/ }).getAttribute("aria-checked")) === "true",
  );
  await p.locator("#ai-url").fill("http://localhost:5173/");
  await p.getByRole("button", { name: "+ Find products fast" }).click();
  await p.screenshot({ path: "/tmp/demo-1-newtour.png", fullPage: true });
  const [site] = await Promise.all([
    ctx.waitForEvent("page"),
    p.getByRole("button", { name: "Open my site and draft" }).click(),
  ]);
  site.on("pageerror", (e) => errors.push(`site: ${e.message}`));
  await p.waitForURL(/\/tours\/(?!new)[^/]+$/, { timeout: 15000 });
  tourId = p.url().split("/").pop();
  check("dashboard moves to the new tour", Boolean(tourId));

  const panel = (sel) => site.locator(`[data-ptour-builder] ${sel}`);
  await panel("li.draft").first().waitFor({ timeout: 25000 });
  check("builder drafts by itself on the site", (await panel("li.draft").count()) >= 3);
  check("draft is marked as demo mode", await panel(".badge:has-text('Demo mode')").isVisible());
  check(
    "site address bar is clean",
    !site.url().includes("ai=1") && !site.url().includes("wpb_"),
    site.url(),
  );
  const titles = await panel("li.draft input[aria-label$='title']").evaluateAll((els) =>
    els.map((e) => e.value),
  );
  check(
    "search step comes from the page",
    titles.includes("Find any product fast"),
    titles.join(" / "),
  );
  await site.screenshot({ path: "/tmp/demo-2-draft.png" });
  await panel("button:has-text('Add')").first().click();
  await panel(".status:has-text('Added')").waitFor({ timeout: 15000 });
  const t = await admin("GET", `/api/admin/v1/tours/${tourId}`);
  check("steps saved", t.tour.steps.length === titles.length, `${t.tour.steps.length}`);
  check("tour renamed from the draft", t.tour.name === "Home page: guided tour", t.tour.name);

  await p.bringToFront();
  await p.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await p.getByText("Find any product fast").first().waitFor({ timeout: 10000 });
  check("dashboard shows the new steps when you come back", true);
  await p.screenshot({ path: "/tmp/demo-3-tour.png", fullPage: true });

  /* 2. Arabic wording */
  const step = t.tour.steps.find((s) => s.title === "Find any product fast");
  await p.goto(`${API}/dashboard/projects/${PROJECT}/tours/${tourId}/steps/${step.id}`);
  await p.getByRole("button", { name: /Arabic/ }).click();
  await p.getByText("ابحث عن أي منتج بسرعة").waitFor({ timeout: 10000 });
  await p.getByRole("button", { name: "Use this" }).click();
  check(
    "Arabic fills the title",
    (await p.locator("#step-title").inputValue()) === "ابحث عن أي منتج بسرعة",
  );
  check(
    "preview tip reads right to left",
    await p
      .locator('[role="img"] p[dir="auto"]')
      .first()
      .evaluate((el) => getComputedStyle(el).direction === "rtl"),
  );
  await p.screenshot({ path: "/tmp/demo-4-arabic.png", fullPage: true });
  await p.locator("#step-title").fill("Something completely new");
  await p.locator("#step-description").fill("Text the phrase book has never seen.");
  await p.getByRole("button", { name: /Arabic/ }).click();
  await p.getByText(/Demo mode translates/).waitFor({ timeout: 10000 });
  check("unknown text gets a clear demo-mode message", true);

  /* 3. Review */
  await p.goto(`${API}/dashboard/projects/${PROJECT}/tours/${tourId}`);
  await p.getByRole("button", { name: /Review the text|Explain drop-offs/ }).click();
  await p.locator("#ai-review").getByText("Demo mode").waitFor({ timeout: 10000 });
  check("review answers in demo mode", true);
  await p.locator("#ai-review").screenshot({ path: "/tmp/demo-5-review.png" });
  check("no page errors", errors.length === 0, errors.join(" | "));
} finally {
  if (tourId) await admin("DELETE", `/api/admin/v1/tours/${tourId}`);
  await b.close();
  shop.close();
}
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} demo checks passed`);
process.exit(failed ? 1 : 0);
