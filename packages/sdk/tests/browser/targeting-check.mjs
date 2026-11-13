// Real-browser check of targeting rules, no-code identity, identify() and link-started tours.
// Usage: node tests/browser/targeting-check.mjs  (needs: API on :3000, local Postgres, Chrome)
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { chromium } from "playwright-core";
import { page as render } from "./shop.mjs";

const API = process.env.API_BASE ?? "http://localhost:3000";
const KEY = process.env.PROJECT_KEY ?? "pk_demoShop0000000000000000";
const TOUR = "seed_tour_find_product";
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const DB =
  process.env.DATABASE_URL ?? "postgresql://waypoint:waypoint_local_only@localhost:5432/waypoint";
const sql = (q) =>
  execFileSync("psql", [DB.replace(/\?.*$/, ""), "-Atc", q])
    .toString()
    .trim();

const server = createServer((req, res) => {
  const html = render(new URL(req.url, "http://x").pathname, `${API}/sdk/product-tour.js`, KEY);
  res.writeHead(html ? 200 : 404, { "content-type": "text/html" }).end(html ?? "not found");
}).listen(5173);

const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
};
const setTour = (fields) =>
  sql(`UPDATE "Tour" SET ${fields}, status='PUBLISHED', "triggerType"='AUTO' WHERE id='${TOUR}'`);
const resetRules = () =>
  setTour(
    `audience='ALL', "audienceDays"=NULL, "audienceBefore"=NULL, frequency='ONCE', "maxShows"=NULL, "intervalDays"=NULL, "startsAt"=NULL, "endsAt"=NULL`,
  );
/** Pretends the visitor's last activity was hours ago, so the next request is a new visit. */
const endVisits = () =>
  sql(`UPDATE "VisitorProfile" SET "lastSeenAt" = (now() at time zone 'utc') - interval '2 hours'`);

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });

/** A fresh browser profile ("device") where the site exposes customer_code in the dataLayer. */
async function device(customerCode, path = "/") {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript((code) => {
    window.dataLayer = [{ event: "gtm.js" }];
    if (code)
      window.dataLayer.push({ event: "home_page_view", customer_code: code, email_id: "x@y.z" });
  }, customerCode);
  const p = await ctx.newPage();
  await p.goto(`http://localhost:5173${path}`);
  return { ctx, p };
}
const tipShown = async (p, ms = 6000) => {
  try {
    await p.locator("[data-ptour-host] .tooltip").waitFor({ timeout: ms });
    return true;
  } catch {
    return false;
  }
};
const skip = async (p) => {
  await p.locator("[data-ptour-host] button", { hasText: "Skip" }).click();
  await p.evaluate(() => window.dispatchEvent(new Event("pagehide"))); // flush analytics now
  await p.waitForTimeout(1200);
};
const state = (col) =>
  sql(`SELECT coalesce(sum(${col}),0) FROM "TourVisitorState" WHERE "tourId"='${TOUR}'`);

try {
  sql(`DELETE FROM "TourVisitorState"; DELETE FROM "VisitorProfile"`);
  sql(
    `UPDATE "Project" SET "identitySource"='DATALAYER', "identityKey"='customer_code' WHERE "publicKey"='${KEY}'`,
  );
  resetRules();
  setTour(`frequency='UNTIL_COMPLETED', "maxShows"=2`);

  // 1. Until finished, at most 2 times, once per visit, following the user across devices.
  let d = await device("C1001");
  check("logged-in user sees the tour on first visit", await tipShown(d.p));
  await skip(d.p);
  check("skip recorded against the user", state(`shows`) === "1", `shows=${state("shows")}`);
  await d.p.reload();
  check("not shown again in the same visit", !(await tipShown(d.p, 3000)));
  await d.ctx.close();

  endVisits();
  d = await device("C1001");
  check("shown again on the next visit, on another device", await tipShown(d.p));
  await skip(d.p);
  await d.ctx.close();

  endVisits();
  d = await device("C1001");
  check("stops after the limit (2 times)", !(await tipShown(d.p, 4000)));

  // 2. A link starts the tour regardless of the rules, and cleans the address bar.
  await d.p.goto(`http://localhost:5173/?tour_start=${TOUR}&utm=x`);
  check("link starts the tour even after the limit", await tipShown(d.p));
  check(
    "link parameter removed from the address bar",
    !d.p.url().includes("tour_start") && d.p.url().includes("utm=x"),
    d.p.url(),
  );
  await d.ctx.close();

  // 3. New users only (first seen within 14 days).
  resetRules();
  setTour(`audience='NEW_USERS', "audienceDays"=14`);
  d = await device("C2002");
  check("new user sees a 'new users' tour", await tipShown(d.p));
  await d.ctx.close();
  sql(
    `UPDATE "VisitorProfile" SET "firstSeenAt" = (now() at time zone 'utc') - interval '30 days'`,
  );
  sql(`DELETE FROM "TourVisitorState"`);
  endVisits();
  d = await device("C2002");
  check("30-day-old user does not", !(await tipShown(d.p, 4000)));
  await d.ctx.close();

  // 4. Returning after a break (away 30+ days).
  resetRules();
  setTour(`audience='DORMANT_USERS', "audienceDays"=30`);
  sql(`DELETE FROM "TourVisitorState"`);
  sql(`UPDATE "VisitorProfile" SET "lastSeenAt" = (now() at time zone 'utc') - interval '3 days'`);
  d = await device("C2002");
  check("user back after 3 days does not see a 'dormant' tour", !(await tipShown(d.p, 4000)));
  await d.ctx.close();
  sql(`UPDATE "VisitorProfile" SET "lastSeenAt" = (now() at time zone 'utc') - interval '45 days'`);
  d = await device("C2002");
  check("user back after 45 days does", await tipShown(d.p));
  await d.ctx.close();
  const again = await device("C2002", "/cart"); // same visit, another device: new server call
  await again.p.waitForTimeout(2500);
  await again.ctx.close();
  const gap = sql(
    `SELECT ("visitStartedAt" - "previousVisitAt") > interval '40 days' FROM "VisitorProfile" WHERE identified ORDER BY "lastSeenAt" DESC LIMIT 1`,
  );
  check("…and stays 'returning' for the rest of that visit", gap === "t", gap);

  // 5. Existing users only + identify() with a sign-up date from the site.
  resetRules();
  setTour(`audience='EXISTING_USERS', "audienceBefore"=(now() at time zone 'utc')::date - 1`);
  sql(`DELETE FROM "TourVisitorState"`);
  d = await device(null);
  check("anonymous first-time visitor is not 'existing'", !(await tipShown(d.p, 3500)));
  await d.p.evaluate(() => window.ProductTour.identify("C3003", { signedUpAt: "2024-05-01" }));
  check("identify() with an old sign-up date makes them 'existing'", await tipShown(d.p));
  await d.ctx.close();

  // 6. Date window.
  resetRules();
  setTour(`"endsAt" = (now() at time zone 'utc')::date - 1`);
  d = await device("C4004");
  check("tour outside its date window is not shown", !(await tipShown(d.p, 4000)));
  await d.ctx.close();
  setTour(
    `"startsAt" = (now() at time zone 'utc')::date, "endsAt" = (now() at time zone 'utc')::date`,
  );
  d = await device("C4005");
  check("tour inside its date window is shown", await tipShown(d.p));
  await d.ctx.close();

  // 7. Privacy: raw ids never reach the database.
  const leaked = sql(
    `SELECT count(*) FROM "VisitorProfile" WHERE "visitorKey" LIKE '%C1001%' OR "visitorKey" !~ '^[a-f0-9]{64}$'`,
  );
  check("only hashed visitor keys stored", leaked === "0");
  const identified = sql(`SELECT count(*) FROM "VisitorProfile" WHERE identified`);
  check("logged-in visitors stored as identified", Number(identified) >= 4, identified);
} finally {
  resetRules();
  sql(
    `UPDATE "Project" SET "identitySource"='NONE', "identityKey"=NULL WHERE "publicKey"='${KEY}'`,
  );
  await browser.close();
  server.close();
}
const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} targeting checks passed`);
process.exit(passed === results.length ? 0 : 1);
