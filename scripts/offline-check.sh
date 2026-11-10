#!/usr/bin/env bash
# Partial verification that works WITHOUT installing dependencies (no network).
# It is NOT a substitute for scripts/verify.sh. It only exercises code that has no
# third-party imports, using whatever tsx/tsc/prettier/psql happen to be on the machine.
#
#   1. Type-checks the dependency-free modules with the system TypeScript.
#   2. Runs the dependency-free test files through a Vitest-compatible shim.
#   3. Applies the migration SQL to a throwaway local Postgres cluster (if pg binaries exist).
#   4. Runs prettier --check (if prettier exists).
set -uo pipefail
cd "$(dirname "$0")/.."

PURE_SRC=(
  packages/shared/src/product-config.ts packages/shared/src/enums.ts packages/shared/src/limits.ts
  packages/shared/src/text.ts packages/shared/src/url.ts packages/shared/src/origins.ts
  packages/shared/src/ordering.ts packages/shared/src/publish-rules.ts packages/shared/src/api-types.ts
  apps/web/src/server/authz.ts apps/web/src/server/http/errors.ts apps/web/src/server/crypto.ts
  apps/web/src/server/auth/user-sync.ts apps/web/src/server/auth/types.ts
  apps/web/src/server/builder-pass/core.ts apps/web/src/server/rate-limit/types.ts
  apps/web/src/server/rate-limit/memory.ts apps/web/src/server/public/cors-core.ts
  apps/web/src/server/public/event-rows.ts
)
PURE_TESTS=(
  packages/shared/tests/url.test.ts packages/shared/tests/origins.test.ts
  packages/shared/tests/ordering.test.ts packages/shared/tests/publish-rules.test.ts
  apps/web/tests/unit/authz.test.ts apps/web/tests/unit/user-sync.test.ts
  apps/web/tests/unit/crypto.test.ts apps/web/tests/unit/builder-pass.test.ts
  apps/web/tests/unit/rate-limit.test.ts apps/web/tests/unit/cors.test.ts
  apps/web/tests/unit/event-rows.test.ts
)
status=0

echo "== [offline 1/4] tsc on dependency-free modules + their tests =="
mkdir -p .offline-check
node -e '
const fs = require("fs");
const include = [...process.argv.slice(1).map((f) => "../" + f), "../scripts/offline/*.ts"];
fs.writeFileSync(".offline-check/tsconfig.json", JSON.stringify({ extends: "../scripts/offline/tsconfig.json", include }, null, 2));
' "${PURE_SRC[@]}" "${PURE_TESTS[@]}"
if tsc -p .offline-check/tsconfig.json; then echo "tsc: OK"; else echo "tsc: FAILED"; status=1; fi

echo "== [offline 2/4] pure tests via vitest shim =="
if ! tsx --tsconfig scripts/offline/tsconfig.json scripts/offline/run.ts "${PURE_TESTS[@]}"; then status=1; fi

echo "== [offline 3/4] migration SQL against a throwaway Postgres =="
PGBIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1)
if [ -n "$PGBIN" ] && [ -x "$PGBIN/initdb" ]; then
  TMP=$(mktemp -d)
  PORT=55432
  RUNAS=""
  if [ "$(id -u)" = "0" ]; then chown -R postgres "$TMP"; RUNAS="runuser -u postgres --"; fi
  $RUNAS "$PGBIN/initdb" -D "$TMP/data" -A trust -U waypoint >/dev/null
  $RUNAS "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP" -l "$TMP/log" -w start >/dev/null
  PSQL=(psql -h "$TMP" -p "$PORT" -U waypoint -v ON_ERROR_STOP=1 -q)
  if "${PSQL[@]}" -d postgres -c "CREATE DATABASE waypoint_check" &&
    "${PSQL[@]}" -d waypoint_check -f apps/web/prisma/migrations/20261110000000_init/migration.sql &&
    "${PSQL[@]}" -d waypoint_check -f scripts/offline/migration-smoke.sql; then
    echo "migration: OK"
  else
    echo "migration: FAILED"
    status=1
  fi
  $RUNAS "$PGBIN/pg_ctl" -D "$TMP/data" -m fast stop >/dev/null
  rm -rf "$TMP"
else
  echo "migration: SKIPPED (no postgres binaries)"
fi

echo "== [offline 4/4] prettier --check =="
if command -v prettier >/dev/null; then
  if prettier --check . >/dev/null 2>&1; then
    echo "prettier: OK"
  else
    prettier --check . 2>&1 | tail -20
    echo "prettier: FAILED"
    status=1
  fi
else
  echo "prettier: SKIPPED"
fi

exit $status
