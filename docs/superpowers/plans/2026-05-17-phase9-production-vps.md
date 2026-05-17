# Phase 9 Production/VPS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make VOLKERR deploy-ready for a real Ubuntu VPS with PM2, nginx, SSL, production env documentation, validation, and rollback guidance.

**Architecture:** Keep the current split app architecture: Next.js frontend on localhost `3000`, Express backend on localhost `3001`, both supervised by PM2 and exposed only through nginx. Production behavior is controlled through envs and existing Phase 5-8 services; this phase adds deployment artifacts and operational documentation rather than changing business logic.

**Tech Stack:** Ubuntu 22.04/24.04, Node.js 20 LTS, npm, PM2, nginx, Certbot, PostgreSQL, Prisma, Next.js, Express.

---

## File Structure

- Create: `ecosystem.config.cjs`
  - PM2 process definitions for `velkor-backend` and `velkor-frontend`.
- Create: `docs/deploy/nginx/velkor.conf.example`
  - Production nginx reverse proxy example with HTTPS, gzip, cache, proxy headers, and security headers.
- Modify: `docs/deploy/VPS-DEPLOY.md`
  - Replace the outdated guide with the current Phase 5-9 production flow.
- Create: `docs/deploy/PRODUCTION-CHECKLIST.md`
  - Operator checklist for envs, build, migrations, PM2, nginx, SSL, smoke, SEO, payments, email, rollback.
- Create: `docs/deploy/ROLLBACK.md`
  - Safe rollback procedures, including legacy admin fallback env.
- Modify: `backend/.env.example`
  - Clarify production values for legacy admin, email dev mode, and Mercado Pago dev mode.

## Task 1: PM2 Ecosystem Config

**Files:**
- Create: `ecosystem.config.cjs`

- [x] **Step 1: Add PM2 app definitions**

```js
module.exports = {
  apps: [
    {
      name: 'velkor-backend',
      cwd: './backend',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
      max_memory_restart: '512M',
      time: true,
    },
    {
      name: 'velkor-frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 127.0.0.1 -p 3000',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
      max_memory_restart: '768M',
      time: true,
    },
  ],
};
```

- [ ] **Step 2: Validate syntax**

Run: `node --check ecosystem.config.cjs`

Expected: exit code `0`.

- [ ] **Step 3: Commit**

```bash
git add ecosystem.config.cjs
git commit -m "chore: add production pm2 ecosystem"
```

## Task 2: nginx Production Example

**Files:**
- Create: `docs/deploy/nginx/velkor.conf.example`

- [x] **Step 1: Add nginx example**

The config must include:

- HTTP to HTTPS redirect.
- `/api/` proxy to `127.0.0.1:3001`.
- all other routes proxy to `127.0.0.1:3000`.
- gzip.
- immutable cache for Next static assets.
- conservative security headers.
- proxy headers required for cookies, CORS, logs, and rate limits.

- [ ] **Step 2: Commit**

```bash
git add docs/deploy/nginx/velkor.conf.example
git commit -m "docs: add production nginx example"
```

## Task 3: Deployment Guide Refresh

**Files:**
- Modify: `docs/deploy/VPS-DEPLOY.md`

- [x] **Step 1: Rewrite the guide around the current app**

The guide must include exact commands for:

- OS packages.
- Node 20.
- PostgreSQL setup assumptions.
- copying env files.
- installing backend/frontend dependencies.
- Prisma migrate deploy and seed.
- frontend build.
- PM2 start with `ecosystem.config.cjs`.
- nginx config installation.
- Certbot.
- UFW firewall.
- post-deploy smoke tests.
- future updates.

- [ ] **Step 2: Commit**

```bash
git add docs/deploy/VPS-DEPLOY.md
git commit -m "docs: refresh vps deployment guide"
```

## Task 4: Production Checklist And Rollback

**Files:**
- Create: `docs/deploy/PRODUCTION-CHECKLIST.md`
- Create: `docs/deploy/ROLLBACK.md`
- Modify: `backend/.env.example`

- [x] **Step 1: Add production checklist**

The checklist must cover:

- no secrets committed.
- backend envs.
- frontend envs.
- database backup.
- migrations.
- admin promotion/seed.
- Gmail SMTP.
- Mercado Pago sandbox and webhook.
- nginx/SSL/security headers.
- smoke tests.
- audit commands.
- E2E tests still required before production traffic.

- [x] **Step 2: Add rollback guide**

The rollback guide must include:

- record previous commit.
- rollback before migration.
- rollback after migration with backup.
- PM2 restart.
- legacy admin env fallback.
- Mercado Pago webhook disable/retry guidance.

- [x] **Step 3: Clarify production env examples**

Ensure examples mention:

- `LEGACY_ADMIN_UNLOCK_ENABLED=false` for production.
- `EMAIL_DEV_MODE=false` for real email.
- `MERCADO_PAGO_DEV_MODE=false` for real checkout.

- [ ] **Step 4: Commit**

```bash
git add docs/deploy/PRODUCTION-CHECKLIST.md docs/deploy/ROLLBACK.md backend/.env.example
git commit -m "docs: add production checklist and rollback"
```

## Task 5: Final Validation And Push

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run full tests**

Run: `npm test`

Expected: backend tests pass, frontend typecheck passes, frontend lint passes.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: Next.js build exits `0`.

- [ ] **Step 3: Run security audits**

Run:

```bash
npm audit --prefix frontend --audit-level=moderate
npm audit --prefix backend --audit-level=moderate
```

Expected: `found 0 vulnerabilities` for both.

- [ ] **Step 4: Validate Prisma schema**

Run: `npx prisma validate --schema prisma/schema.prisma` from `backend`.

Expected: schema is valid.

- [ ] **Step 5: Push branch**

```bash
git push origin chore/project-cleanup-production-ready
```

Expected: push succeeds.

## Self-Review

- Spec coverage: PM2, nginx, SSL, production envs, health checks, docs, rollback, audits, and no secret commits are covered.
- Placeholder scan: no task depends on unspecified implementation.
- Type consistency: all file names and commands match the current repo structure.
