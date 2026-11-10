// Shared flat ESLint config. Packages import `base` and, for Next.js apps, `next`.
import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Rules that keep plain-text-only content safe (Phase 1 §8: no unsafe HTML sinks). */
const noHtmlSinks = {
  "no-restricted-properties": [
    "error",
    {
      property: "innerHTML",
      message: "Use textContent. HTML sinks are banned (stored-XSS policy).",
    },
    { property: "outerHTML", message: "HTML sinks are banned (stored-XSS policy)." },
    { property: "insertAdjacentHTML", message: "HTML sinks are banned (stored-XSS policy)." },
  ],
  "no-restricted-syntax": [
    "error",
    {
      selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
      message: "dangerouslySetInnerHTML is banned (stored-XSS policy).",
    },
  ],
};

export const base = tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/coverage/**",
      "**/next-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      ...noHtmlSinks,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
);

export const next = tseslint.config(...base, {
  files: ["**/*.{ts,tsx}"],
  languageOptions: { globals: { ...globals.browser, ...globals.node } },
  plugins: { "@next/next": nextPlugin, "react-hooks": reactHooks },
  rules: {
    ...nextPlugin.configs.recommended.rules,
    ...nextPlugin.configs["core-web-vitals"].rules,
    ...reactHooks.configs.recommended.rules,
  },
});
