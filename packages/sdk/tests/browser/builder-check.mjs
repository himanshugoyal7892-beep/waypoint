// Real-browser check of the visual builder on a live third-party site (redingtonpartner.com).
// The live Waypoint domain is routed to a local API (:3000) so the run uses local data.
// Usage: PASS=wpb_… node tests/browser/builder-check.mjs
import { chromium } from "playwright-core";

const LIVE = "https://waypoint-vfka.vercel.app";
const SITE = process.env.SITE ?? "https://www.redingtonpartner.com/en-ae";
const KEY = process.env.PROJECT_KEY ?? "pk_demoShop0000000000000000";
const PASS = process.env.PASS;
const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
};

const b = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
  args: ["--no-sandbox"],
});
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.route(`${LIVE}/**`, async (route) => {
  const url = route.request().url().replace(LIVE, "http://localhost:3000");
  route.fulfill({ response: await route.fetch({ url }) });
});
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("dialog", (d) => d.accept());
const panel = (sel) => p.locator(`[data-ptour-builder] ${sel}`);

try {
  await p.goto(`${LIVE}/sdk/preview.html?key=${KEY}`);
  const code = decodeURIComponent(
    (await p.locator("#builderBookmarklet").getAttribute("href")).slice("javascript:".length),
  );
  await p.goto(SITE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p
    .getByRole("button", { name: "Accept All" })
    .click({ timeout: 15000 })
    .catch(() => {});
  await p.waitForTimeout(1500);

  await p.evaluate(code); // = clicking the "Waypoint builder" bookmark
  await panel("#code").waitFor({ timeout: 15000 });
  check("builder panel opens and asks for a code", true);
  await panel("#code").fill(`junk`);
  await panel("button:has-text('Connect')").click();
  check(
    "rejects a malformed code",
    (await panel(".status").textContent()).includes("doesn't look like"),
  );
  await panel("#code").fill(PASS);
  await panel("button:has-text('Connect')").click();
  await panel("select#tour").waitFor({ timeout: 15000 });
  check("connects with a valid code and lists tours", true);
  await p.screenshot({ path: "/tmp/builder-1-connected.png" });

  // Step 1: pick the search box.
  const urlBefore = p.url();
  await panel("button:has-text('+ Add step')").click();
  const searchBox = p.locator('[data-testid="search-input-box"]:visible');
  await searchBox.hover();
  await p.waitForTimeout(200);
  await p.screenshot({ path: "/tmp/builder-2-picking.png" });
  await searchBox.click({ position: { x: 300, y: 5 } });
  await panel("#sel").waitFor();
  const sel1 = await panel("#sel").inputValue();
  const target1 = await p.evaluate((s) => {
    const visible = [...document.querySelectorAll(s)].filter(
      (e) => e.getBoundingClientRect().width > 0,
    );
    return visible.length === 1
      ? visible[0].closest('[data-testid="search-input-box"]') !== null
      : false;
  }, sel1);
  check(
    "picking gives a short selector that finds the visible search box",
    Boolean(target1) && sel1.length < 60,
    sel1,
  );
  console.log("   quality shown:", await panel(".badge").first().textContent());
  await panel("#title").fill("Find any product fast");
  await panel("#description").fill(
    "Search the whole catalogue by part number, product name or brand.",
  );
  await p.screenshot({ path: "/tmp/builder-3-form.png" });
  await panel("button:has-text('Save step')").click();
  await panel(".step").first().waitFor();
  check("saves step 1", (await panel(".step").count()) === 1);

  // Step 2: pick a navigation LINK; picking must not navigate.
  await panel("button:has-text('+ Add step')").click();
  await p.locator('[data-testid="navigation-list-brands-1"] a').click();
  await panel("#sel").waitFor();
  check("clicking a link while picking does not navigate", p.url() === urlBefore, p.url());
  const sel2 = await panel("#sel").inputValue();
  check(
    "link gets a selector matching exactly one element",
    (await p.evaluate((s) => document.querySelectorAll(s).length, sel2)) === 1,
    sel2,
  );
  await panel("#title").fill("Shop by brand");
  await panel("button:has-text('Save step')").click();
  await p.waitForFunction(
    () =>
      document.querySelector("[data-ptour-builder]").shadowRoot.querySelectorAll(".step").length ===
      2,
  );
  check("saves step 2", true);

  // Validation error comes back from the API and is shown.
  await panel("button:has-text('+ Add step')").click();
  await p.locator('[data-testid="navigation-list-new-arrivals-9"]').click();
  await panel("#sel").waitFor();
  await panel("button:has-text('Save step')").click(); // no title/description
  await p.waitForTimeout(800);
  check(
    "shows a validation error when title and description are empty",
    (await panel(".err-text").count()) > 0,
  );
  await panel("#description").fill("The latest products in the catalogue.");
  await panel("button:has-text('Save step')").click();
  await p.waitForFunction(
    () =>
      document.querySelector("[data-ptour-builder]").shadowRoot.querySelectorAll(".step").length ===
      3,
  );

  // Reorder: move step 3 up.
  await panel("button[aria-label='Move step 3 up']").click();
  const reordered = await p
    .waitForFunction(
      () =>
        document.querySelector("[data-ptour-builder]").shadowRoot.querySelectorAll(".step .ttl")[1]
          ?.textContent === "The latest products in the catalogue.",
      null,
      { timeout: 8000 },
    )
    .then(
      () => true,
      () => false,
    );
  check("reorders steps", reordered, (await panel(".step .ttl").allTextContents()).join(" | "));

  // Preview the draft with the real runtime.
  await panel("button:has-text('Preview')").click();
  const tip = p.locator("[data-ptour-host] .tooltip");
  await tip.waitFor({ timeout: 10000 });
  check(
    "preview plays the draft tour",
    (await p.locator("[data-ptour-host] .counter").textContent()) === "1 of 3",
  );
  await p.screenshot({ path: "/tmp/builder-4-preview.png" });
  await p.locator("[data-ptour-builder] .banner button").click();
  await panel("select#tour").waitFor();
  check("stop preview returns to the panel", (await p.locator("[data-ptour-host]").count()) === 0);

  // Publish.
  await panel("button:has-text('Publish')").click();
  const published = await p
    .waitForFunction(
      () =>
        document.querySelector("[data-ptour-builder]").shadowRoot.querySelector(".badge")
          ?.textContent === "Published",
      null,
      { timeout: 8000 },
    )
    .then(
      () => true,
      () => false,
    );
  check("publishes from the builder", published);
  await p.screenshot({ path: "/tmp/builder-5-published.png" });

  // Reload: stays signed in, no code needed.
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.evaluate(code); // immediately, while the site is still starting up
  await p.waitForTimeout(2500);
  await panel("select#tour").waitFor({ timeout: 15000 });
  check(
    "after reload (clicked during page start-up), the builder reopens without a new code",
    true,
  );
  // The site itself logs React hydration errors (#418) with or without Waypoint; only count ours.
  const ours = errors.filter((e) => /ptour|ProductTour|Waypoint|product-tour/i.test(e));
  check("no page errors caused by Waypoint", ours.length === 0, ours.slice(0, 3).join("; "));
} catch (err) {
  check("builder run", false, err.message.split("\n")[0]);
  await p.screenshot({ path: "/tmp/builder-error.png" });
} finally {
  await b.close();
}
const failed = results.filter((r) => !r).length;
console.log(`\nBUILDER CHECK: ${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
