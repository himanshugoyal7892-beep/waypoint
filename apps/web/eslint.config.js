import { next } from "@waypoint/config/eslint";

export default [
  ...next,
  { ignores: ["public/sdk/**"] },
  {
    files: ["prisma/seed.ts"],
    rules: { "no-console": "off" },
  },
];
