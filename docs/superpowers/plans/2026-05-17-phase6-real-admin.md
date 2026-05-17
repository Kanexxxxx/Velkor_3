# Phase 6 Real Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the demo admin password gate with real `ADMIN` session authorization while preserving the current `/admin` UX and legacy fallback.

**Architecture:** Keep the native Node HTTP server. Add small reusable auth guards, a focused admin repository, an admin route handler, and a typed frontend admin API client consumed by the existing admin page.

**Tech Stack:** Node.js CommonJS, Prisma/PostgreSQL, native HTTP routes, Next.js/React, TypeScript, existing Tailwind/global CSS.

---

### Task 1: Admin Auth Guards

**Files:**
- Create: `backend/src/routes/guards.js`
- Modify: `backend/test/auth.test.js`

- [ ] **Step 1: Write failing tests**

Add tests that call `requireAuth` and `requireAdmin` with fake repos:

```js
test('admin guards reject missing sessions and customer users', async () => {
  const { requireAuth, requireAdmin } = require('../src/routes/guards');
  const missingRes = makeRes();
  const customerRes = makeRes();

  assert.equal(await requireAuth(makeReq(), missingRes, null, { findSessionUser: async () => null }), null);
  assert.equal(missingRes.statusCode, 401);

  assert.equal(await requireAdmin(
    makeReq({ headers: { cookie: `velkor_sid=${'c'.repeat(64)}` } }),
    customerRes,
    null,
    { findSessionUser: async () => ({ user: { id: 'usr_1', role: 'CUSTOMER' } }) }
  ), null);
  assert.equal(customerRes.statusCode, 403);
});

test('admin guards allow admin sessions', async () => {
  const { requireAdmin } = require('../src/routes/guards');
  const res = makeRes();
  const context = await requireAdmin(
    makeReq({ headers: { cookie: `velkor_sid=${'d'.repeat(64)}` } }),
    res,
    null,
    { findSessionUser: async () => ({ user: { id: 'adm_1', role: 'ADMIN' } }) }
  );

  assert.equal(context.user.id, 'adm_1');
  assert.equal(res.statusCode, 0);
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test --prefix backend`

Expected: FAIL with `Cannot find module '../src/routes/guards'`.

- [ ] **Step 3: Implement guards**

Create `backend/src/routes/guards.js`:

```js
const authRepo = require('../db/auth');
const { parseCookies } = require('./auth');

const COOKIE_NAME = 'velkor_sid';

function sendJson(res, statusCode, payload, corsOrigin) {
  const body = JSON.stringify(payload);
  const corsHeaders = corsOrigin ? {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  } : {};
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
    ...corsHeaders,
  });
  res.end(body);
}

function getSessionCookie(req) {
  return parseCookies(req.headers.cookie)[COOKIE_NAME] || '';
}

async function requireAuth(req, res, corsOrigin, repo = authRepo) {
  const sessionUser = await repo.findSessionUser(getSessionCookie(req));
  if (!sessionUser) {
    sendJson(res, 401, { error: 'Sessao invalida.' }, corsOrigin);
    return null;
  }
  return sessionUser;
}

async function requireAdmin(req, res, corsOrigin, repo = authRepo) {
  const context = await requireAuth(req, res, corsOrigin, repo);
  if (!context) return null;
  if (context.user?.role !== 'ADMIN') {
    sendJson(res, 403, { error: 'Acesso admin necessario.' }, corsOrigin);
    return null;
  }
  return context;
}

module.exports = { requireAuth, requireAdmin, sendJson };
```

- [ ] **Step 4: Verify GREEN**

Run: `npm run test --prefix backend`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/guards.js backend/test/auth.test.js
git commit -m "feat: add admin auth guards"
```

Rollback: revert this commit; Phase 5 auth remains intact.

### Task 2: Admin Repository

**Files:**
- Create: `backend/src/db/admin.js`
- Create: `backend/test/admin.test.js`

- [ ] **Step 1: Write failing repository tests**

Create tests for pure helpers and fake Prisma interactions:

```js
test('admin normalizes and validates coupon payloads', () => {
  const { validateCouponPayload } = require('../src/db/admin');

  assert.deepEqual(validateCouponPayload({ code: ' velkor20 ', discountType: 'PERCENT', discountValue: 20 }).value, {
    code: 'VELKOR20',
    discountType: 'PERCENT',
    discountValue: 20,
    active: true,
    startsAt: null,
    expiresAt: null,
    maxRedemptions: null,
  });
  assert.equal(validateCouponPayload({ code: 'x', discountType: 'PERCENT', discountValue: 101 }).error, 'Cupom percentual invalido.');
});

test('admin maps public users without password hashes', () => {
  const { toAdminUser } = require('../src/db/admin');
  const user = toAdminUser({ id: 'u1', email: 'a@b.com', name: null, role: 'ADMIN', emailVerified: true, passwordHash: 'secret', createdAt: new Date('2026-01-01') });

  assert.equal(user.passwordHash, undefined);
  assert.equal(user.role, 'ADMIN');
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test --prefix backend`

Expected: FAIL with `Cannot find module '../src/db/admin'`.

- [ ] **Step 3: Implement repository**

Create `backend/src/db/admin.js` with:

- `listAdminOrders()`
- `updateOrderStatus(id, status, adminUserId)`
- `listAdminUsers()`
- `updateAdminUser(id, patch, adminUserId)`
- `listCoupons()`
- `createCoupon(payload, adminUserId)`
- `updateCoupon(id, payload, adminUserId)`
- `listNewsletterSubscribers()`
- `updateNewsletterSubscriber(id, patch, adminUserId)`
- `logAdminAction(txOrPrisma, input)`
- `validateCouponPayload(payload)`
- `toAdminUser(user)`

Use `getPrisma()`. Return empty demo objects when Prisma is unavailable. Never return `passwordHash`.

- [ ] **Step 4: Verify GREEN**

Run: `npm run test --prefix backend`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/db/admin.js backend/test/admin.test.js
git commit -m "feat: add admin data repository"
```

Rollback: revert this commit; no schema changes are introduced.

### Task 3: Admin Routes and Legacy Unlock Flag

**Files:**
- Create: `backend/src/routes/admin.js`
- Modify: `backend/src/server.js`
- Modify: `backend/test/admin.test.js`
- Modify: `backend/.env.example`

- [ ] **Step 1: Write failing route tests**

Add tests for:

- `GET /api/admin/me` rejects customer.
- `PATCH /api/admin/orders/:id/status` calls repository and returns updated order for admin.
- `/api/admin/unlock` returns `410` when `LEGACY_ADMIN_UNLOCK_ENABLED=false`.

- [ ] **Step 2: Verify RED**

Run: `npm run test --prefix backend`

Expected: FAIL with missing route handler or missing behavior.

- [ ] **Step 3: Implement routes**

Create `backend/src/routes/admin.js` with `createAdminHandler({ repo, authRepo, appConfig })`.

Route map:

- `GET /api/admin/me`
- `GET /api/admin/orders`
- `PATCH /api/admin/orders/:id/status`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:id`
- `GET /api/admin/coupons`
- `POST /api/admin/coupons`
- `PATCH /api/admin/coupons/:id`
- `GET /api/admin/newsletter`
- `PATCH /api/admin/newsletter/:id`

Add in-memory admin rate limits:

- reads: 60/minute/IP
- writes: 20/minute/IP

Move legacy `/api/admin/unlock` behavior into the admin handler and gate it with `LEGACY_ADMIN_UNLOCK_ENABLED`.

Update `backend/.env.example`:

```env
LEGACY_ADMIN_UNLOCK_ENABLED=true
ADMIN_EMAIL=owner@example.com
ADMIN_PASSWORD=troque-por-uma-senha-forte-temporaria
```

- [ ] **Step 4: Mount routes**

In `backend/src/server.js`, mount `handleAdminRequest` after auth and before public APIs.

- [ ] **Step 5: Verify GREEN**

Run: `npm run test --prefix backend`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/admin.js backend/src/server.js backend/test/admin.test.js backend/.env.example
git commit -m "feat: add protected admin API routes"
```

Rollback: revert this commit, set `LEGACY_ADMIN_UNLOCK_ENABLED=true`, keep old unlock route behavior available from prior commit state.

### Task 4: Seed First Admin

**Files:**
- Modify: `backend/prisma/seed.js`
- Modify: `backend/test/admin.test.js`

- [ ] **Step 1: Write failing seed helper test**

Extract and test a helper:

```js
test('admin seed upserts configured admin without logging password', async () => {
  const { buildAdminSeedInput } = require('../prisma/seed');
  const input = buildAdminSeedInput({ ADMIN_EMAIL: 'OWNER@EXAMPLE.COM', ADMIN_PASSWORD: 'super-secret-password' });

  assert.equal(input.email, 'owner@example.com');
  assert.equal(input.role, 'ADMIN');
  assert.equal(input.password, 'super-secret-password');
});
```

- [ ] **Step 2: Verify RED**

Run: `npm run test --prefix backend`

Expected: FAIL because `buildAdminSeedInput` is not exported.

- [ ] **Step 3: Implement seed promotion**

Update `backend/prisma/seed.js` to:

- export `buildAdminSeedInput`
- when run directly, if env has `ADMIN_EMAIL` and `ADMIN_PASSWORD`, upsert/promote admin
- hash password with `hashPassword` from `src/db/auth`
- never log password

- [ ] **Step 4: Verify GREEN**

Run: `npm run test --prefix backend`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/seed.js backend/test/admin.test.js
git commit -m "feat: seed first admin from environment"
```

Rollback: revert commit or remove `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

### Task 5: Frontend Admin API Client

**Files:**
- Create: `frontend/src/services/adminApi.ts`
- Modify: `frontend/src/types/order.ts` only if status typing requires existing-safe extension.

- [ ] **Step 1: Add typed API client**

Create `frontend/src/services/adminApi.ts` with:

- `getAdminMe()`
- `fetchAdminOrders()`
- `updateAdminOrderStatus(id, status)`
- `fetchAdminUsers()`
- `updateAdminUser(id, patch)`
- `fetchAdminCoupons()`
- `createAdminCoupon(payload)`
- `updateAdminCoupon(id, payload)`
- `fetchNewsletterSubscribers()`
- `updateNewsletterSubscriber(id, patch)`
- `legacyUnlock(password)`

All real admin requests use relative `/api/admin/*`, `credentials: 'include'`, and throw typed errors.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck --prefix frontend`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/adminApi.ts frontend/src/types/order.ts
git commit -m "feat: add admin frontend API client"
```

Rollback: revert this commit; UI still uses old local behavior.

### Task 6: Frontend Admin Page API-First

**Files:**
- Modify: `frontend/src/app/admin/AdminPageClient.tsx`

- [ ] **Step 1: Preserve layout and change data source**

Modify the existing page only enough to:

- call `getAdminMe()` on mount
- show current loading state while checking admin
- if admin, load dashboard data from admin APIs
- if unauthorized, show existing restricted access shell
- keep legacy password unlock fallback using `legacyUnlock()`
- keep local `readOrders()` fallback for demo display when API is unavailable
- add retry button for admin API errors

Do not rewrite the visual structure.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck --prefix frontend`

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/admin/AdminPageClient.tsx
git commit -m "feat: connect admin page to real API"
```

Rollback: revert this commit; frontend returns to old admin behavior.

### Task 7: Phase 6 Verification

**Files:**
- All touched files.

- [ ] **Step 1: Backend tests**

Run: `npm run test --prefix backend`

Expected: all tests pass.

- [ ] **Step 2: Full test suite**

Run: `npm test`

Expected: backend tests, frontend typecheck, and lint pass.

- [ ] **Step 3: Build**

Run: `npm run build`

Expected: production build succeeds.

- [ ] **Step 4: Prisma validation**

Run from `backend`: `npx prisma validate --schema prisma/schema.prisma`

Expected: schema valid.

- [ ] **Step 5: Dependency audits**

Run:

```bash
npm audit --prefix frontend --audit-level=moderate
npm audit --prefix backend --audit-level=moderate
```

Expected: `found 0 vulnerabilities`.

- [ ] **Step 6: Final status**

Run: `git status --short --branch`

Expected: clean working tree after commits.

- [ ] **Step 7: Push**

Run: `git push origin chore/project-cleanup-production-ready`

Expected: branch pushed.
