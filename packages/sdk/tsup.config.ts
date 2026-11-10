import { defineConfig } from "tsup";

export default defineConfig({
  entry: { "product-tour": "src/index.ts" },
  format: ["iife"],
  platform: "browser",
  target: "es2019",
  minify: true,
  sourcemap: false,
  clean: true,
  outDir: "dist",
  noExternal: [/.*/],
  outExtension: () => ({ js: ".js" }),
});
