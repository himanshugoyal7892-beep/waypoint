// Copies the bundle into the web app's public folder and enforces the size budget
// (Phase 1: ≤ 25 KB gzipped). `--check-only` checks the size without copying.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const bundle = resolve(here, "../dist/product-tour.js");
const target = resolve(here, "../../../apps/web/public/sdk/product-tour.js");
const BUDGET = 25 * 1024;

const raw = readFileSync(bundle);
const gz = gzipSync(raw, { level: 9 }).length;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(
  `product-tour.js: ${kb(raw.length)} minified, ${kb(gz)} gzipped (budget ${kb(BUDGET)})`,
);

for (const banned of ["innerHTML", "outerHTML", "insertAdjacentHTML"]) {
  if (raw.includes(banned)) {
    console.error(`Bundle contains banned HTML sink: ${banned}`);
    process.exit(1);
  }
}
if (gz > BUDGET) {
  console.error("Bundle exceeds the 25 KB gzip budget.");
  process.exit(1);
}
if (!process.argv.includes("--check-only")) {
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(bundle, target);
  console.log(`Copied to ${target}`);
}
