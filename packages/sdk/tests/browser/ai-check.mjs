// End-to-end check of the three AI features against a local fake of the Claude API.
// Needs: Waypoint on :3000 started with ANTHROPIC_API_KEY=<anything> and
// AI_API_URL=http://localhost:4010/v1/messages, plus a signed-in dashboard (local review only).
// Usage: PROJECT_ID=… node tests/browser/ai-check.mjs
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

/* ---------- fake Claude: answers each tool from the prompt it receives ---------- */
const prompts = [];
const ai = createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const body = JSON.parse(raw);
    const prompt = body.messages[0].content;
    prompts.push({ key: req.headers["x-api-key"], tool: body.tool_choice.name, prompt });
    let input;
    if (body.tool_choice.name === "tour_draft") {
      const n = Number(/Propose a (\d+)-step/.exec(prompt)[1]);
      const els = [...prompt.matchAll(/^\[(\d+)\] (\S+).*?(?:text "([^"]*)"|label "([^"]*)")/gm)];
      input = {
        name: "Shop: find and buy",
        steps: els.slice(0, n).map((m, i) => ({
          element: Number(m[1]),
          title: `Step ${i + 1}: ${(m[3] || m[4]).slice(0, 30)}`,
          description: `What the ${m[2]} does.`,
          placement: "AUTO",
        })),
      };
    } else if (body.tool_choice.name === "tip_text") {
      input = { title: "Search in seconds", description: "Type a name to filter." };
    } else {
      const order = Number(/^Step (\d+)/m.exec(prompt.split("<tour>")[1])[1]);
      input = {
        summary: "Visitors leave because the ask is unclear.",
        suggestions: [
          {
            stepOrder: order,
            why: "Clearer ask",
            title: "AI rewrite",
            description: "Short and clear.",
          },
        ],
      };
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({ content: [{ type: "tool_use", name: body.tool_choice.name, input }] }),
    );
  });
}).listen(4010);

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
  return { status: r.status, data: await r.json().catch(() => null) };
};

const b = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  args: ["--no-sandbox"],
});
let tourId;
try {
  const { data: t } = await admin("POST", `/api/admin/v1/projects/${PROJECT}/tours`, {
    name: "AI check tour",
    startUrl: "/",
    triggerType: "MANUAL",
  });
  tourId = t.tour.id;
  const { data: pass } = await admin("POST", `/api/admin/v1/projects/${PROJECT}/builder-sessions`, {
    mode: "BUILD",
    tourId,
    targetUrl: "http://localhost:5173/",
  });

  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const panel = (sel) => p.locator(`[data-ptour-builder] ${sel}`);

  /* 1. Draft a tour from the page */
  await p.goto(pass.builderSession.launchUrl);
  await panel("select#tour").waitFor({ timeout: 15000 });
  await p.locator('[data-tour-id="search-input"]').fill("my secret search");
  await panel("button:has-text('Draft steps with AI')").click();
  await panel("#aigoal").fill("help shoppers find a product");
  await panel("#aicount").selectOption("4");
  await panel("button:has-text('Scan this page and draft')").click();
  await panel("li.draft").first().waitFor({ timeout: 20000 });
  const drafted = await panel("li.draft").count();
  const draftCall = prompts.find((x) => x.tool === "tour_draft");
  check(
    "page scan sends elements and the goal, never typed text",
    Boolean(draftCall) &&
      draftCall.prompt.includes("help shoppers find a product") &&
      !draftCall.prompt.includes("my secret search"),
  );
  check("the API key travels in the header from the server", draftCall?.key === "fake-local-key");
  check("builder shows the proposed steps", drafted >= 3 && drafted <= 4, `${drafted} steps`);
  await panel("li.draft").first().hover();
  await p.waitForTimeout(200);
  check("hovering a proposal outlines its element", await panel(".pick-box").isVisible());
  await p.screenshot({ path: "/tmp/ai-1-draft.png" });
  await panel("li.draft").nth(1).locator("input[type=checkbox]").uncheck();
  const firstTitle = panel("li.draft").first().locator("input[aria-label$='title']");
  await firstTitle.fill("Edited title");
  await panel("button:has-text('Add')").first().click();
  await panel(".status:has-text('Added')").waitFor({ timeout: 15000 });
  const { data: after } = await admin("GET", `/api/admin/v1/tours/${tourId}`);
  const steps = after.tour.steps;
  check("unticked step left out, the rest added", steps.length === drafted - 1, `${steps.length}`);
  check("edited title kept", steps[0].title === "Edited title");
  const resolves = await p.evaluate(
    (sels) => sels.every((s) => document.querySelectorAll(s).length === 1),
    steps.map((s) => s.cssSelector),
  );
  check("every added selector finds exactly one element", resolves);
  await p.screenshot({ path: "/tmp/ai-2-added.png" });

  /* 2. Wording help in the step editor */
  await p.goto(`${API}/dashboard/projects/${PROJECT}/tours/${tourId}/steps/${steps[0].id}`);
  await p.getByRole("button", { name: "Shorten" }).click();
  await p.getByText("Search in seconds").waitFor({ timeout: 15000 });
  await p.screenshot({ path: "/tmp/ai-3-wording.png", fullPage: true });
  await p.getByRole("button", { name: "Use this" }).click();
  check(
    "wording suggestion fills the title",
    (await p.locator("#step-title").inputValue()) === "Search in seconds",
  );
  check(
    "live preview shows the new title",
    await p.getByRole("img", { name: /Search in seconds/ }).isVisible(),
  );

  /* 3. Explain drop-offs / review */
  await p.goto(`${API}/dashboard/projects/${PROJECT}/tours/${tourId}`);
  await p.getByRole("button", { name: /Review the text|Explain drop-offs/ }).click();
  await p.getByText("Visitors leave because the ask is unclear.").waitFor({ timeout: 15000 });
  await p.locator("#ai-review").screenshot({ path: "/tmp/ai-4-review.png" });
  await p.getByRole("button", { name: /Apply to step/ }).click();
  await p.getByRole("button", { name: "Applied" }).waitFor({ timeout: 10000 });
  const { data: reviewed } = await admin("GET", `/api/admin/v1/tours/${tourId}`);
  check(
    "applying a rewrite updates the step",
    reviewed.tour.steps.some((s) => s.title === "AI rewrite"),
  );
  check("no page errors", errors.length === 0, errors.join(" | "));
} finally {
  if (tourId) await admin("DELETE", `/api/admin/v1/tours/${tourId}`);
  await b.close();
  ai.close();
  shop.close();
}
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} AI checks passed`);
process.exit(failed ? 1 : 0);
