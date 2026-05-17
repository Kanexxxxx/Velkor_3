# Phase 9 Production/VPS Design

## Objective

Prepare VOLKERR for a real Ubuntu VPS production deployment without recreating the project, changing branding, replacing the current frontend stack, or removing the validated demo/fallback paths before production validation.

Phase 9 is a deploy-readiness phase. The codebase should end with documented, repeatable production operations for:

- installing dependencies on Ubuntu
- configuring production environment variables
- running PostgreSQL migrations and seed
- running backend and frontend under PM2
- exposing the app through nginx and HTTPS
- validating health, checkout, auth, admin, emails, payments, SEO, and audits
- rolling back safely

## Current Architecture

- Frontend: Next.js app in `frontend`, served by `next start` on localhost behind nginx.
- Backend: Node/Express app in `backend/src/server.js`, served on localhost behind nginx.
- Database: PostgreSQL through Prisma when `DATABASE_URL` is present.
- Auth: server-side session with HttpOnly cookie.
- Email: Gmail SMTP service from Phase 7 with safe dev mode.
- Payments: Mercado Pago sandbox/production-capable routes from Phase 8.
- Admin: real role/session protected admin APIs from Phase 6, with legacy unlock still controlled by env for rollback.

## In Scope

### Deployment Artifacts

- Add a PM2 ecosystem file for backend and frontend.
- Add an nginx example config for reverse proxy, gzip, cache headers, HTTPS, and security headers.
- Keep all secrets in environment files only.
- Document exact commands for first deploy and future updates.

### Production Environment

- Document required backend envs:
  - `NODE_ENV=production`
  - `PORT=3001`
  - `DATABASE_URL`
  - `SESSION_SECRET`
  - `ALLOWED_ORIGINS`
  - `VELKOR_PUBLIC_URL`
  - `ADMIN_EMAIL`
  - `ADMIN_PASSWORD`
  - `LEGACY_ADMIN_UNLOCK_ENABLED=false`
  - Gmail SMTP envs from Phase 7
  - Mercado Pago envs from Phase 8
- Document required frontend envs:
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY`
  - optional analytics keys

### Operations

- Document install, build, migrate, seed, PM2 startup, nginx, Certbot, firewall, smoke tests, and audit commands.
- Add rollback instructions for code rollback, PM2 restart, migration caveats, and legacy admin fallback.
- Add a production checklist that can be followed before opening traffic.

### Validation

Run locally before committing the final phase:

- `npm test`
- `npm run build`
- `npm audit --prefix frontend --audit-level=moderate`
- `npm audit --prefix backend --audit-level=moderate`
- Prisma schema validation
- syntax validation for PM2 config

## Out of Scope

- Replacing the current frontend or Tailwind setup.
- Removing demo/fallback behavior.
- Implementing a new CI/CD provider.
- Changing Mercado Pago business rules beyond production documentation.
- Changing Gmail provider beyond the Phase 7 SMTP support.
- Adding broad E2E coverage in this same step; the deploy docs must list E2E as a required pre-production gate.

## Acceptance Criteria

- A new engineer can deploy VOLKERR to an Ubuntu VPS using only repo documentation plus their real secrets.
- PM2 process names and ports are stable and documented.
- nginx exposes only ports 80/443 publicly and proxies backend/frontend internally.
- Production env checklist includes all Phase 5/6/7/8 requirements.
- Rollback path documents both normal code rollback and the temporary legacy admin fallback.
- No credentials are committed.
- Local validation commands pass after the changes.

## Risks

- Real production deploy still depends on valid DNS, SSL, PostgreSQL, Gmail, and Mercado Pago accounts.
- Database migrations are forward-only by default; rollback requires backups or migration-specific planning.
- Mercado Pago webhook validation must be tested with the real sandbox dashboard URL after deploy.
- Email deliverability depends on Gmail app password, account security, and domain reputation.

## Rollback

- Keep the previous Git commit hash before deploy.
- If deploy fails before migrations, checkout the previous commit, reinstall dependencies, rebuild frontend, and restart PM2.
- If deploy fails after migrations, restore a database backup before rolling code back when schema compatibility is not guaranteed.
- Temporarily re-enable the old admin unlock only by setting `LEGACY_ADMIN_UNLOCK_ENABLED=true`, then restart backend, and disable it again after recovery.
