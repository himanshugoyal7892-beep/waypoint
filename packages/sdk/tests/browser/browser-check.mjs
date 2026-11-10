// Real-browser end-to-end check of the SDK against a running Waypoint API.
// Usage: node tests/browser/browser-check.mjs  (needs: API on :3000, Chrome, published seed tour)
import { createServer } from "node:http";
import { chromium } from "playwright-core";
import { page as render } from "./shop.mjs";

const API = process.env.API_BASE ?? "http://localhost:3000";
const KEY = process.env.PROJECT_KEY ?? "pk_demoShop0000000000000000";
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const SHOTS = process.env.SHOTS_DIR ?? "/tmp";

const server = createServer((req, res) => {
  const html = render(new URL(req.url, "http://x").pathname, `${API}/sdk/product-tour.js`, KEY);
  res.writeHead(html ? 200 : 404, { "content-type": "text/html" }).end(html ?? "not found");
}).listen(5173);

const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
};

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const tip = () => p.locator("[data-ptour-host] .tooltip");
  const counter = () => p.locator("[data-ptour-host] .counter").textContent();
  const press = (label) => p.locator("[data-ptour-host] button", { hasText: label }).click();

  await p.goto("http://localhost:5173/");
  await tip().waitFor({ timeout: 8000 });
  check("tour auto-starts on /", (await counter()) === "1 of 5");
  const font = await tip().evaluate(
    (el) => getComputedStyle(el).fontFamily + "|" + getComputedStyle(el).color,
  );
  check(
    "host CSS does not leak into tooltip",
    !font.includes("Comic") && !font.includes("204, 0, 0"),
    font,
  );
  const focused = await p.evaluate(
    () => document.querySelector("[data-ptour-host]").shadowRoot.activeElement?.textContent,
  );
  check("focus moves to the Next button", focused === "Next");
  await p.screenshot({ path: `${SHOTS}/tour-step1.png` });

  await press("Next");
  await p.waitForFunction(
    () =>
      document.querySelector("[data-ptour-host]")?.shadowRoot.querySelector(".counter")
        ?.textContent === "2 of 5",
  );
  await p.waitForTimeout(1000); // smooth scrolling takes a moment
  const inView = await p.evaluate(() => {
    const r = document
      .querySelector('[data-tour-id="product-card-aurora-headphones"]')
      .getBoundingClientRect();
    return r.top >= 0 && r.bottom <= innerHeight;
  });
  check("scrolls off-screen target into view", inView);
  const scrollable = await p.evaluate(async () => {
    const before = scrollY;
    scrollBy(0, -200);
    await new Promise((r) => setTimeout(r, 200));
    return scrollY !== before;
  });
  check("page can still scroll during the tour", scrollable);
  const placed = await p.evaluate(() => {
    const t = document
      .querySelector("[data-ptour-host]")
      .shadowRoot.querySelector(".tooltip")
      .getBoundingClientRect();
    const a = document
      .querySelector('[data-tour-id="product-card-aurora-headphones"]')
      .getBoundingClientRect();
    return (
      Math.abs(t.top - a.bottom) < 80 ||
      Math.abs(t.bottom - a.top) < 80 ||
      Math.abs(t.left - a.right) < 80
    );
  });
  check("tooltip repositions next to the target after scrolling", placed);

  await press("Next"); // step 3 is on another page → navigation + resume
  await p.waitForURL("**/products/aurora-headphones");
  await tip().waitFor({ timeout: 8000 });
  check("cross-page: resumes step 3 after navigation", (await counter()) === "3 of 5");
  await p.screenshot({ path: `${SHOTS}/tour-step3.png` });

  await press("Next");
  await p.waitForFunction(
    () =>
      document.querySelector("[data-ptour-host]")?.shadowRoot.querySelector(".counter")
        ?.textContent === "4 of 5",
  );
  await press("Back");
  await p.waitForFunction(
    () =>
      document.querySelector("[data-ptour-host]")?.shadowRoot.querySelector(".counter")
        ?.textContent === "3 of 5",
  );
  check("Back works", true);
  await press("Next");
  await p.waitForFunction(
    () =>
      document.querySelector("[data-ptour-host]")?.shadowRoot.querySelector(".counter")
        ?.textContent === "4 of 5",
  );
  await press("Next");
  await p.waitForURL("**/cart");
  await tip().waitFor({ timeout: 8000 });
  check("reaches step 5 on /cart", (await counter()) === "5 of 5");
  await press("Finish");
  await p.waitForTimeout(300);
  check("Finish removes all SDK nodes", (await p.locator("[data-ptour-host]").count()) === 0);

  await p.goto("http://localhost:5173/");
  await p.waitForTimeout(1500);
  check(
    "completed tour does not auto-start again",
    (await p.locator("[data-ptour-host]").count()) === 0,
  );

  // Manual start + Escape + focus restore
  await p.locator('[data-tour-id="search-input"]').focus();
  await p.evaluate(() => window.ProductTour.start("seed_tour_find_product"));
  await tip().waitFor({ timeout: 8000 });
  await p.keyboard.press("Tab");
  await p.keyboard.press("Tab");
  await p.keyboard.press("Tab");
  const stillInside = await p.evaluate(() =>
    Boolean(document.querySelector("[data-ptour-host]").shadowRoot.activeElement),
  );
  check("Tab keeps focus inside the tooltip", stillInside);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(200);
  const restored = await p.evaluate(() => document.activeElement?.getAttribute("data-tour-id"));
  check(
    "Escape closes and restores focus",
    (await p.locator("[data-ptour-host]").count()) === 0 && restored === "search-input",
    restored,
  );

  // SPA navigation via pushState
  await p.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.ProductTour.reset();
  });
  await p.goto("http://localhost:5173/products/aurora-headphones");
  await p.evaluate(() => window.ProductTour.start("seed_tour_find_product"));
  await p.waitForURL("http://localhost:5173/"); // start() navigates to step 1's page
  await tip().waitFor({ timeout: 8000 });
  await press("Next");
  await p.waitForFunction(
    () =>
      document.querySelector("[data-ptour-host]")?.shadowRoot.querySelector(".counter")
        ?.textContent === "2 of 5",
  );
  await p.evaluate(() => {
    const main = document.querySelector("main");
    main.replaceChildren();
    const b = document.createElement("button");
    b.setAttribute("data-tour-id", "add-to-cart");
    b.textContent = "Add to cart";
    main.append(b);
    history.pushState({}, "", "/products/aurora-headphones");
  });
  await p.waitForFunction(
    () =>
      document.querySelector("[data-ptour-host]")?.shadowRoot.querySelector(".counter")
        ?.textContent === "3 of 5",
    null,
    { timeout: 8000 },
  );
  check("SPA pushState route change advances the tour", true);
  await p.waitForTimeout(2500); // let analytics flush
  check("no uncaught page errors", errors.length === 0, errors.join("; "));
} catch (err) {
  check("browser run", false, err.message);
} finally {
  await browser.close();
  server.close();
}
const failed = results.filter((r) => !r).length;
console.log(`\nBROWSER CHECK: ${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
