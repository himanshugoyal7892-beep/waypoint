import { base } from "@waypoint/config/eslint";
import globals from "globals";

export default [
  ...base,
  { ignores: ["dist/**"] },
  {
    files: ["src/**/*.ts"],
    languageOptions: { globals: { ...globals.browser } },
    rules: { "no-console": ["error", { allow: ["warn"] }] },
  },
  {
    files: ["tests/**/*.ts", "tests/**/*.mjs", "scripts/**/*.mjs"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { "no-console": "off" },
  },
];
