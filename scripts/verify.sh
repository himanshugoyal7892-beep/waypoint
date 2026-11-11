#!/usr/bin/env bash
# Full verification for Waypoint. Requires network access (package registry), Docker
# (or an existing Postgres reachable via DATABASE_URL) and Node >= 20.18 with pnpm.
#
#   bash scripts/verify.sh            # everything
#   SKIP_BUILD=1 bash scripts/verify.sh
#
# Each step prints PASS/FAIL; the script stops at the first failure.
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }
pass() { printf '\033[32mPASS\033[0m %s\n' "$1"; }

step "0. Toolchain"
node --version
corepack enable >/dev/null 2>&1 || true
pnpm --version
pass "toolchain"

step "1. Environment files"
if [ ! -f apps/web/.env ]; then cp .env.example apps/web/.env; echo "created apps/web/.env from .env.example"; fi
if [ ! -f apps/web/.env.local ]; then cp .env.example apps/web/.env.local; echo "created apps/web/.env.local from .env.example"; fi
set -a; . apps/web/.env; set +a
pass "env"

step "2. Install dependencies"
# No lockfile is committed yet: the first successful install creates pnpm-lock.yaml (commit it).
if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install; fi
pass "install"

step "3. Database"
if command -v docker >/dev/null && [ -z "${SKIP_DOCKER:-}" ]; then
  docker compose up -d db
  for i in $(seq 1 30); do
    if docker compose exec -T db pg_isready -U waypoint -d waypoint >/dev/null 2>&1; then break; fi
    sleep 1
    [ "$i" = 30 ] && { echo "Postgres did not become ready"; exit 1; }
  done
fi
pass "database reachable"

step "4. Prisma client"
pnpm db:generate
pass "prisma generate"

step "5. Migrations"
pnpm db:migrate:deploy
# Fails if schema.prisma and the migration SQL disagree (hand-written migration check).
pnpm --filter @waypoint/web exec prisma migrate diff \
  --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
pass "migrate deploy + no drift"

step "6. Seed"
pnpm db:seed
pass "seed"

step "7. Lint"
pnpm lint
pass "lint"

step "8. Type-check"
pnpm typecheck
pass "typecheck"

step "9. Tests"
pnpm test
pass "tests"

step "9b. SDK bundle (≤ 25 KB gzip, no HTML sinks, committed copy up to date)"
before=$(cat apps/web/public/sdk/product-tour*.js 2>/dev/null | sha256sum | cut -d' ' -f1 || true)
pnpm --filter @waypoint/sdk build
after=$(cat apps/web/public/sdk/product-tour*.js | sha256sum | cut -d' ' -f1)
if [ "$before" != "$after" ]; then
  echo "NOTE: the SDK bundles in apps/web/public/sdk were rebuilt and changed. Commit them."
fi
pass "sdk bundle"

step "10. Formatting"
pnpm format:check
pass "prettier"

if [ -z "${SKIP_BUILD:-}" ]; then
  step "11. Production build"
  # Clerk refuses to pre-render without a publishable key. If none is configured, build with a
  # syntactically valid placeholder (verification only; never deploy this build).
  if [ -z "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" ]; then
    echo "No Clerk key set: building with a placeholder key for verification only."
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_$(printf 'example.clerk.accounts.dev$' | base64)" \
      CLERK_SECRET_KEY="sk_test_placeholder" pnpm --filter @waypoint/web build
  else
    pnpm --filter @waypoint/web build
  fi
  pass "next build"
fi

printf '\n\033[32mAll verification steps passed.\033[0m\n'
