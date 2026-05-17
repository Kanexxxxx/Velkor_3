# Phase 5 Real Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace demo-only localStorage auth with API-first server sessions while preserving the existing local fallback.

**Architecture:** Keep the current native Node HTTP server and add focused auth modules instead of introducing Express. Store raw session tokens only in an HttpOnly cookie, store SHA-256 token hashes in PostgreSQL, and keep localStorage auth as fallback when the backend/database is unavailable.

**Tech Stack:** Node.js CommonJS, native `http`, Prisma/PostgreSQL, `bcryptjs`, Next.js rewrites, React AuthProvider.

---

### Task 1: Backend Auth Repository and Tests

**Files:**
- Create: `backend/src/db/auth.js`
- Create: `backend/test/auth.test.js`
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260517120000_phase5_auth/migration.sql`
- Modify: `backend/package.json`
- Modify: `backend/package-lock.json`

- [ ] Write failing tests for password hashing, session token hashing, cookie parsing, and demo-disabled behavior.
- [ ] Run `npm run test --prefix backend` and confirm the new tests fail because `backend/src/db/auth.js` does not exist.
- [ ] Add `bcryptjs` to backend dependencies.
- [ ] Add `emailVerified`, `Session`, and `PasswordResetToken` to Prisma schema and migration SQL.
- [ ] Implement `backend/src/db/auth.js` with bcrypt hashing, SHA-256 token hashing, session creation/lookup/deletion, password reset token helpers, safe public user mapping, and null/demo handling when Prisma is unavailable.
- [ ] Run `npm run test --prefix backend` and confirm backend tests pass.

### Task 2: Backend Auth Routes and Tests

**Files:**
- Create: `backend/src/routes/auth.js`
- Modify: `backend/src/server.js`
- Modify: `backend/test/auth.test.js`

- [ ] Write failing route-level tests for register/login/me/logout/change-password/profile/session listing/reset stubs using injected fake repositories.
- [ ] Run `npm run test --prefix backend` and confirm failures point to missing route handler behavior.
- [ ] Implement route helpers in `backend/src/routes/auth.js`: cookie serializer/parser, JSON body validation, rate limiting, brute-force lockout, public user responses, and all `/api/auth/*` endpoints from the spec.
- [ ] Mount auth routes in `backend/src/server.js` before the existing fallback 404.
- [ ] Allow `Cookie` in CORS request headers and emit `Set-Cookie` when auth routes need it.
- [ ] Run `npm run test --prefix backend` and confirm backend tests pass.

### Task 3: Frontend API Client and AuthProvider Migration

**Files:**
- Create: `frontend/src/services/authApi.ts`
- Modify: `frontend/src/components/auth/AuthProvider.tsx`
- Modify: `frontend/next.config.ts`
- Modify: `frontend/src/types/user.ts` if needed for `emailVerified` compatibility.

- [ ] Add the Next.js rewrite for `/api/auth/:path*` to `http://localhost:3001/api/auth/:path*`.
- [ ] Implement `frontend/src/services/authApi.ts` with typed relative fetch calls, `credentials: 'include'`, and `AuthError`.
- [ ] Update `AuthProvider` to call `getMe()` on mount, try API-first register/login/logout/profile/password operations, and fall back to the existing localStorage service when API calls are unavailable.
- [ ] Preserve the public AuthContext interface used by existing pages.
- [ ] Run `npm run typecheck --prefix frontend` and fix type errors only in the touched auth files.

### Task 4: Dependency Audit Fixes

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `backend/package.json`
- Modify: `backend/package-lock.json`

- [ ] Inspect available safe package versions for Next/PostCSS and Prisma/Hono advisories.
- [ ] Upgrade to non-breaking current patch/minor versions where possible.
- [ ] Run `npm install --prefix frontend` and `npm install --prefix backend`.
- [ ] Run `npm audit --prefix frontend --audit-level=moderate` and `npm audit --prefix backend --audit-level=moderate`.

### Task 5: Full Verification and Git

**Files:**
- All touched files.

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `git status --short --branch`.
- [ ] Commit the Phase 5 implementation and dependency fixes in clear commits.
- [ ] Push `chore/project-cleanup-production-ready` to `origin`.
- [ ] Stop before server-side admin auth, Mercado Pago webhook, legal LGPD review, and Playwright E2E suite.
