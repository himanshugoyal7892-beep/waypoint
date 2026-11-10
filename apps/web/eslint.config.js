import { next } from "@waypoint/config/eslint";

export default [
  ...next,
  {
    files: ["prisma/seed.ts"],
    rules: { "no-console": "off" },
  },
];
