/**
 * Offline test runner (see scripts/offline-check.sh). Imports each pure test file, which
 * registers tests through the vitest shim, then executes them.
 */
import { runRegisteredTests } from "./vitest-shim";

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

async function main() {
  const files = process.argv.slice(2);
  let passed = 0;
  let failed = 0;
  for (const file of files) {
    console.log(`\n${file}`);
    await import(pathToFileURL(resolve(file)).href);
    const r = await runRegisteredTests();
    if (r.passed + r.failed === 0) {
      console.log("  ✗ no tests registered (module-format mismatch?)");
      failed++;
    }
    passed += r.passed;
    failed += r.failed;
  }
  console.log(`\nOFFLINE SHIM RESULT: ${passed} passed, ${failed} failed, ${files.length} files`);
  process.exitCode = failed ? 1 : 0;
}

void main();
