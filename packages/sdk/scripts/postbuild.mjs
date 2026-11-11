// Copies the bundles into the web app's public folder and enforces size budgets.
// The visitor bundle keeps the Phase 1 budget (≤ 25 KB gzip); the builder bundle loads only
// for tour authors. `--check-only` checks sizes without copying.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const BUNDLES = [
  { file: "product-tour.js", budget: 25 * 1024 },
  { file: "product-tour-builder.js", budget: 45 * 1024 },
];
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
let failed = false;

for (const { file, budget } of BUNDLES) {
  const src = resolve(here, "../dist", file);
  const raw = readFileSync(src);
  const gz = gzipSync(raw, { level: 9 }).length;
  console.log(`${file}: ${kb(raw.length)} minified, ${kb(gz)} gzipped (budget ${kb(budget)})`);
  for (const banned of ["innerHTML", "outerHTML", "insertAdjacentHTML"]) {
    if (raw.includes(banned)) {
      console.error(`${file} contains banned HTML sink: ${banned}`);
      failed = true;
    }
  }
  if (gz > budget) {
    console.error(`${file} exceeds its gzip budget.`);
    failed = true;
  }
  if (!failed && !process.argv.includes("--check-only")) {
    const target = resolve(here, "../../../apps/web/public/sdk", file);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(src, target);
  }
}
if (failed) process.exit(1);
