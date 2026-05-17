# Admin Complete 2 and 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish admin customer/order operations and store configuration/status panels without changing the public VOLKERR layout.

**Architecture:** Extend the existing admin repository and route handler, then consume the new typed admin API in the current admin client. Keep secrets server-only and return only safe integration status flags.

**Tech Stack:** Node.js HTTP routes, Prisma, Next.js App Router client components, TypeScript services, Playwright E2E, Node test runner.

---

### Task 1: Admin Customer Details

**Files:**
- Modify: `backend/src/db/admin.js`
- Modify: `backend/src/routes/admin.js`
- Modify: `backend/test/admin.test.js`
- Modify: `frontend/src/services/adminApi.ts`
- Modify: `frontend/src/app/admin/AdminPageClient.tsx`

- [ ] **Step 1: Add failing backend tests**

Add tests proving admin users include safe addresses/order summaries and profile updates accept name/email/role/emailVerified.

- [ ] **Step 2: Run backend admin test**

Run: `node --test backend/test/admin.test.js`
Expected: fail because customer details are not exposed yet.

- [ ] **Step 3: Implement repository and route support**

Update admin repository to map addresses and order summaries, include them in `listAdminUsers`, and allow safe user updates. Keep password fields out of responses.

- [ ] **Step 4: Run backend admin test**

Run: `npm run check --prefix backend; node --test backend/test/admin.test.js`
Expected: pass.

- [ ] **Step 5: Add frontend user/order UI**

Load users alongside orders/products. Add sections for order status updates and customer cards with editable name/email/role/emailVerified plus addresses/orders summaries.

- [ ] **Step 6: Run frontend typecheck**

Run: `npm run typecheck --prefix frontend`
Expected: pass.

- [ ] **Step 7: Commit**

Commit message: `feat: manage customers and orders in admin`

### Task 2: Admin Store Operations

**Files:**
- Modify: `backend/src/db/admin.js`
- Modify: `backend/src/routes/admin.js`
- Modify: `backend/test/admin.test.js`
- Modify: `frontend/src/services/adminApi.ts`
- Modify: `frontend/src/app/admin/AdminPageClient.tsx`
- Modify: `backend/.env.example`
- Modify: `frontend/tests/e2e/volkerr-core.spec.ts`

- [ ] **Step 1: Add failing backend tests**

Add tests for `/api/admin/settings` returning public store config and secret presence flags only.

- [ ] **Step 2: Run backend admin test**

Run: `node --test backend/test/admin.test.js`
Expected: fail because settings route does not exist.

- [ ] **Step 3: Implement settings API**

Add safe settings builder that reads app config/env and returns brand/contact values plus integration status booleans for Mercado Pago, Gmail and Melhor Envio.

- [ ] **Step 4: Extend frontend admin**

Load coupons, newsletter and settings. Add compact panels to create/update coupons, toggle newsletter subscribers, and inspect store/integration readiness.

- [ ] **Step 5: Add E2E coverage**

Extend admin protected-shell test to keep route coverage stable.

- [ ] **Step 6: Run full validation**

Run: `npm test`, `npm run build`, `npm run e2e --prefix frontend`, `npm audit --prefix frontend --audit-level=moderate`, `npm audit --prefix backend --audit-level=moderate`, and `npx prisma validate --schema backend/prisma/schema.prisma`.

- [ ] **Step 7: Commit and push**

Commit message: `feat: add admin store operations`

Push: `git push origin chore/project-cleanup-production-ready`
