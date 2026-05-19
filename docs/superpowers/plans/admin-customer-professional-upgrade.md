# Admin Customer Professional Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade VOLKERR admin, customer account, and operational UX into a professional e-commerce control system without breaking production flows.

**Architecture:** Stabilize navigation and shared UX primitives first, then migrate account and admin modules incrementally. Keep API-first behavior, existing auth/session guards, current branding, and rollback-friendly commits.

**Tech Stack:** Next.js, React, Tailwind CSS, Node.js, PostgreSQL, Prisma, PM2, Nginx.

---

## Implementation Rules

- Do not implement multiple phases in one commit.
- Do not edit payment, shipping, email, or auth behavior unless the current task explicitly requires it.
- Do not expose or edit secrets in any admin screen.
- Do not remove existing routes or fallback behavior during this plan.
- Run focused tests after each task and full validation before deploy.
- Commit after each task when validation passes.

## File Structure Map

Expected files to create gradually:

- `frontend/src/components/operational/PageHeader.tsx`: reusable page/module header.
- `frontend/src/components/operational/SectionCard.tsx`: consistent framed section wrapper.
- `frontend/src/components/operational/StatCard.tsx`: metric cards.
- `frontend/src/components/operational/DataTable.tsx`: simple responsive table.
- `frontend/src/components/operational/StatusBadge.tsx`: consistent status labels.
- `frontend/src/components/operational/EmptyState.tsx`: empty/retry state.
- `frontend/src/components/operational/LoadingSkeleton.tsx`: loading placeholders.
- `frontend/src/components/operational/ConfirmDialog.tsx`: confirmation for destructive/sensitive actions.
- `frontend/src/components/operational/ActionButton.tsx`: button with loading/disabled state.
- `frontend/src/components/operational/FormField.tsx`: field wrapper for labels/errors.
- `frontend/src/components/operational/Timeline.tsx`: order/status timeline.
- `frontend/src/components/operational/index.ts`: component exports.

Expected files to modify gradually:

- `frontend/src/app/account/AccountPageClient.tsx`: account shell and legacy tab migration.
- `frontend/src/app/account/orders/[id]/OrderDetailPageClient.tsx`: richer detail/timeline/actions.
- `frontend/src/app/account/coupons/CouponsPageClient.tsx`: consistent account UI.
- `frontend/src/app/account/*/page.tsx`: route wrappers as needed.
- `frontend/src/app/admin/AdminPageClient.tsx`: admin shell and module migration.
- `frontend/src/app/admin/*/page.tsx`: module wrappers as needed.
- `frontend/src/services/accountApi.ts`: account endpoints and typed helpers.
- `frontend/src/services/adminApi.ts`: admin endpoints and typed helpers.
- `backend/src/routes/account.js`: account endpoint additions only when needed.
- `backend/src/routes/admin.js`: admin endpoint additions only when needed.
- `backend/src/db/auth.js`: account/profile/address/session helpers only when needed.
- `backend/src/db/admin.js`: admin dashboard, settings, logs, catalog helpers.
- `backend/src/db/orders.js`: order detail/timeline/payment-link helpers when needed.
- `backend/test/account.test.js`: account route coverage.
- `backend/test/admin.test.js`: admin route coverage.
- `backend/test/payments.test.js`: payment regression coverage when payment payloads are touched.

## Phase 0: Documentation Commit

### Task 0: Save Spec and Plan

**Files:**
- Create: `docs/superpowers/specs/admin-customer-professional-upgrade.md`
- Create: `docs/superpowers/plans/admin-customer-professional-upgrade.md`

- [ ] Confirm both docs contain current-state analysis, risks, rollback, and exact commit order.
- [ ] Run `git diff -- docs/superpowers/specs/admin-customer-professional-upgrade.md docs/superpowers/plans/admin-customer-professional-upgrade.md`.
- [ ] Commit:

```bash
git add docs/superpowers/specs/admin-customer-professional-upgrade.md docs/superpowers/plans/admin-customer-professional-upgrade.md
git commit -m "docs: plan professional admin customer upgrade"
git push origin chore/project-cleanup-production-ready
```

## Phase 1: UX Foundation

### Task 1: Fix Account/Admin Scroll and Navigation Stability

**Files:**
- Modify: `frontend/src/app/account/AccountPageClient.tsx`
- Modify: `frontend/src/app/admin/AdminPageClient.tsx`
- Modify if needed: `frontend/src/app/account/*/page.tsx`
- Modify if needed: `frontend/src/app/admin/*/page.tsx`

- [ ] Inspect all account tab links and admin module links.
- [ ] Preserve route state without forcing unnecessary top jumps.
- [ ] Use `scroll={false}` on internal account/admin module links where route changes should feel like tab/module switching.
- [ ] Keep direct URLs working for `/account/orders`, `/account/addresses`, `/admin/orders`, `/admin/products`, and existing module routes.
- [ ] Validate manually in browser: tab/module changes, browser back, browser forward.
- [ ] Run:

```bash
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

- [ ] Commit:

```bash
git add frontend/src/app/account frontend/src/app/admin
git commit -m "fix: preserve account and admin navigation position"
```

### Task 2: Add Shared Operational UI Primitives

**Files:**
- Create: `frontend/src/components/operational/PageHeader.tsx`
- Create: `frontend/src/components/operational/SectionCard.tsx`
- Create: `frontend/src/components/operational/StatCard.tsx`
- Create: `frontend/src/components/operational/DataTable.tsx`
- Create: `frontend/src/components/operational/StatusBadge.tsx`
- Create: `frontend/src/components/operational/EmptyState.tsx`
- Create: `frontend/src/components/operational/LoadingSkeleton.tsx`
- Create: `frontend/src/components/operational/ConfirmDialog.tsx`
- Create: `frontend/src/components/operational/ActionButton.tsx`
- Create: `frontend/src/components/operational/FormField.tsx`
- Create: `frontend/src/components/operational/Timeline.tsx`
- Create: `frontend/src/components/operational/index.ts`
- Modify if needed: `frontend/src/styles/globals.css`

- [ ] Add components without replacing account/admin flows yet.
- [ ] Components must be controlled, accessible, keyboard-safe, and mobile-safe.
- [ ] Keep styling aligned with current dark VOLKERR theme.
- [ ] Run:

```bash
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

- [ ] Commit:

```bash
git add frontend/src/components/operational frontend/src/styles/globals.css
git commit -m "feat: add operational ui primitives"
```

## Phase 2: Customer Area Premium

### Task 3: Upgrade Account Overview

**Files:**
- Modify: `frontend/src/app/account/AccountPageClient.tsx`
- Modify: `frontend/src/services/accountApi.ts`

- [ ] Replace raw account overview blocks with `PageHeader`, `SectionCard`, `StatCard`, `StatusBadge`, and `ActionButton`.
- [ ] Show greeting, email status, most recent order, total purchased, wishlist count, address count, and quick links.
- [ ] Keep auth landing behavior unchanged.
- [ ] Add loading/empty/error states for order summary.
- [ ] Run:

```bash
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

- [ ] Commit:

```bash
git add frontend/src/app/account/AccountPageClient.tsx frontend/src/services/accountApi.ts
git commit -m "feat: apply account overview ux foundation"
```

### Task 4: Upgrade Customer Orders List

**Files:**
- Modify: `frontend/src/app/account/AccountPageClient.tsx`
- Modify if needed: `frontend/src/services/accountApi.ts`
- Modify if needed: `backend/src/routes/account.js`
- Test if backend changes: `backend/test/account.test.js`

- [ ] Add client-side search by order code.
- [ ] Add status filters.
- [ ] Add pagination when more than 10 orders are present.
- [ ] Show empty state and retry state.
- [ ] Ensure user can only see own orders through current backend ownership check.
- [ ] Run:

```bash
npm test --prefix backend
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

- [ ] Commit:

```bash
git add frontend/src/app/account/AccountPageClient.tsx frontend/src/services/accountApi.ts backend/src/routes/account.js backend/test/account.test.js
git commit -m "feat: improve customer order list ux"
```

### Task 5: Upgrade Customer Order Details

**Files:**
- Modify: `frontend/src/app/account/orders/[id]/OrderDetailPageClient.tsx`
- Modify if needed: `frontend/src/services/accountApi.ts`
- Modify if needed: `backend/src/routes/account.js`
- Test if backend changes: `backend/test/account.test.js`

- [ ] Add `Timeline` for created, awaiting payment, paid, preparing, shipped, delivered, canceled.
- [ ] Show payment, shipping, tracking, subtotal, discount, shipping total, and final total.
- [ ] Keep "pay now", "resend confirmation", "buy again", and support actions.
- [ ] Add loading state per action.
- [ ] Ensure resend confirmation cannot spam without backend rate-limit safety.
- [ ] Run:

```bash
npm test --prefix backend
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

- [ ] Commit:

```bash
git add frontend/src/app/account/orders/[id]/OrderDetailPageClient.tsx frontend/src/services/accountApi.ts backend/src/routes/account.js backend/test/account.test.js
git commit -m "feat: improve customer order detail timeline"
```

### Task 6: Upgrade Addresses and Security UX

**Files:**
- Modify: `frontend/src/app/account/AccountPageClient.tsx`
- Modify: `frontend/src/app/account/reset-password/ResetPasswordPageClient.tsx`
- Modify if needed: `frontend/src/services/accountApi.ts`
- Modify if needed: `backend/src/routes/account.js`
- Test if backend changes: `backend/test/account.test.js`

- [ ] Use `FormField`, `ActionButton`, `EmptyState`, and confirmation states for address forms.
- [ ] Add ViaCEP loading feedback.
- [ ] Enforce saved address limit in UI and backend if missing.
- [ ] Hide reset token from the reset password screen.
- [ ] Improve resend verification and logout-other-sessions feedback.
- [ ] Run:

```bash
npm test --prefix backend
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

- [ ] Commit:

```bash
git add frontend/src/app/account frontend/src/services/accountApi.ts backend/src/routes/account.js backend/test/account.test.js
git commit -m "feat: improve customer address and security ux"
```

### Task 7: Upgrade Wishlist, Coupons, and Support

**Files:**
- Modify: `frontend/src/app/wishlist/WishlistPageClient.tsx`
- Modify: `frontend/src/app/account/coupons/CouponsPageClient.tsx`
- Modify: `frontend/src/app/account/support/page.tsx`

- [ ] Add unavailable product state in wishlist.
- [ ] Add move-to-cart loading feedback.
- [ ] Present coupons with validity/rules and checkout CTA.
- [ ] Improve support section with order help links and policy links.
- [ ] Run:

```bash
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

- [ ] Commit:

```bash
git add frontend/src/app/wishlist/WishlistPageClient.tsx frontend/src/app/account/coupons/CouponsPageClient.tsx frontend/src/app/account/support/page.tsx
git commit -m "feat: improve customer wishlist coupons support"
```

## Phase 3: Professional Admin

### Task 8: Add Admin Operational Shell

**Files:**
- Modify: `frontend/src/app/admin/AdminPageClient.tsx`
- Modify: `frontend/src/app/admin/*/page.tsx`

- [ ] Apply shared `PageHeader`, `SectionCard`, `StatusBadge`, `ActionButton`, and `EmptyState` to the admin shell.
- [ ] Keep existing auth and legacy unlock behavior unchanged.
- [ ] Do not move business logic yet unless required for safe rendering.
- [ ] Run:

```bash
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

- [ ] Commit:

```bash
git add frontend/src/app/admin
git commit -m "feat: add admin operational shell"
```

### Task 9: Upgrade Admin Dashboard Metrics

**Files:**
- Modify: `frontend/src/app/admin/AdminPageClient.tsx`
- Modify: `frontend/src/services/adminApi.ts`
- Modify if needed: `backend/src/routes/admin.js`
- Modify if needed: `backend/src/db/admin.js`
- Test if backend changes: `backend/test/admin.test.js`

- [ ] Add dashboard cards for revenue today, revenue month, pending/paid/shipped orders, new customers, and average order value.
- [ ] Add simple service status cards for backend, database, SMTP, Mercado Pago, and Melhor Envio using safe booleans only.
- [ ] Do not expose tokens or secret values.
- [ ] Run:

```bash
npm test --prefix backend
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

- [ ] Commit:

```bash
git add frontend/src/app/admin/AdminPageClient.tsx frontend/src/services/adminApi.ts backend/src/routes/admin.js backend/src/db/admin.js backend/test/admin.test.js
git commit -m "feat: improve admin dashboard metrics"
```

### Task 10: Upgrade Admin Orders

**Files:**
- Modify: `frontend/src/app/admin/AdminPageClient.tsx`
- Modify: `frontend/src/services/adminApi.ts`
- Modify if needed: `backend/src/routes/admin.js`
- Modify if needed: `backend/src/db/admin.js`
- Test: `backend/test/admin.test.js`

- [ ] Add search, filters, pagination, and mobile cards.
- [ ] Add detail panel with timeline, address, items, totals, payment, shipping, and tracking.
- [ ] Add confirmed actions for status updates, tracking code, resend email, payment link, and cancel.
- [ ] Log every critical action in admin audit logs.
- [ ] Run:

```bash
npm test --prefix backend
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

- [ ] Commit:

```bash
git add frontend/src/app/admin/AdminPageClient.tsx frontend/src/services/adminApi.ts backend/src/routes/admin.js backend/src/db/admin.js backend/test/admin.test.js
git commit -m "feat: improve admin order operations"
```

### Task 11: Upgrade Admin Products UX

**Files:**
- Modify: `frontend/src/app/admin/AdminPageClient.tsx`
- Modify: `frontend/src/services/adminApi.ts`
- Modify if needed: `backend/src/routes/admin.js`
- Modify if needed: `backend/src/db/admin.js`
- Test if backend changes: `backend/test/admin.test.js`

- [ ] Improve product form layout, image preview, import preview, and active/inactive review flow.
- [ ] Add better validation messages for required catalog fields.
- [ ] Keep current product schema unchanged in this task.
- [ ] Preserve existing upload endpoint and Nginx `/uploads/` behavior.
- [ ] Run:

```bash
npm test --prefix backend
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

- [ ] Commit:

```bash
git add frontend/src/app/admin/AdminPageClient.tsx frontend/src/services/adminApi.ts backend/src/routes/admin.js backend/src/db/admin.js backend/test/admin.test.js
git commit -m "feat: improve admin product management ux"
```

### Task 12: Add Product Catalog Operational Fields

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_add_product_operational_fields/migration.sql`
- Modify: `backend/src/db/admin.js`
- Modify: `backend/src/db/products.js`
- Modify: `backend/src/services/nuvemshop-import.js`
- Modify: `frontend/src/types/product.ts`
- Modify: `frontend/src/services/adminApi.ts`
- Modify: `frontend/src/app/admin/AdminPageClient.tsx`
- Test: `backend/test/admin.test.js`

- [ ] Add nullable/backwards-compatible fields: `sku`, `stock`, `weightGrams`, `widthCm`, `heightCm`, `lengthCm`, `seoTitle`, `seoDescription`, `featured`.
- [ ] Make imports populate safe defaults where possible.
- [ ] Keep checkout tolerant if these fields are missing.
- [ ] Run:

```bash
npm run db:generate --prefix backend
npm test --prefix backend
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

- [ ] Commit:

```bash
git add backend/prisma backend/src frontend/src backend/test
git commit -m "feat: add product catalog operational fields"
```

### Task 13: Upgrade Admin Customers

**Files:**
- Modify: `frontend/src/app/admin/AdminPageClient.tsx`
- Modify: `frontend/src/services/adminApi.ts`
- Modify if needed: `backend/src/routes/admin.js`
- Modify if needed: `backend/src/db/admin.js`
- Test: `backend/test/admin.test.js`

- [ ] Add search, filters, total spent, order count, address summary, and email status.
- [ ] Add confirmation for promote/demote admin.
- [ ] Ensure audit logs capture role/email verification changes.
- [ ] Run validation commands.
- [ ] Commit:

```bash
git add frontend/src/app/admin/AdminPageClient.tsx frontend/src/services/adminApi.ts backend/src/routes/admin.js backend/src/db/admin.js backend/test/admin.test.js
git commit -m "feat: improve admin customer operations"
```

### Task 14: Upgrade Payments, Shipping, Coupons, Newsletter, and Logs

**Files:**
- Modify: `frontend/src/app/admin/AdminPageClient.tsx`
- Modify: `frontend/src/services/adminApi.ts`
- Modify if needed: `backend/src/routes/admin.js`
- Modify if needed: `backend/src/db/admin.js`
- Test: `backend/test/admin.test.js`

- [ ] Improve payments table/status and webhook log visibility.
- [ ] Improve shipping status, quote tester, and policy display.
- [ ] Improve coupons list/form with validity and limits.
- [ ] Improve newsletter list and export CSV.
- [ ] Add filters to audit logs.
- [ ] Do not implement secret editing.
- [ ] Run validation commands.
- [ ] Commit:

```bash
git add frontend/src/app/admin/AdminPageClient.tsx frontend/src/services/adminApi.ts backend/src/routes/admin.js backend/src/db/admin.js backend/test/admin.test.js
git commit -m "feat: improve admin payments shipping coupons newsletter logs"
```

## Phase 4: Operational Automations

### Task 15: Add Safe Admin and Account Automations

**Files:**
- Modify: `frontend/src/app/admin/AdminPageClient.tsx`
- Modify: `frontend/src/app/account/orders/[id]/OrderDetailPageClient.tsx`
- Modify: `frontend/src/services/adminApi.ts`
- Modify: `frontend/src/services/accountApi.ts`
- Modify: `backend/src/routes/admin.js`
- Modify: `backend/src/routes/account.js`
- Modify: `backend/src/db/admin.js`
- Modify: `backend/src/db/orders.js`
- Test: `backend/test/admin.test.js`
- Test: `backend/test/account.test.js`

- [ ] Add resend confirmation with loading/disabled state.
- [ ] Add resend verification where appropriate.
- [ ] Add generate/copy payment link for pending orders.
- [ ] Add mark shipped plus tracking email.
- [ ] Add cancel order with confirmation.
- [ ] Audit every admin action.
- [ ] Run:

```bash
npm test --prefix backend
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

- [ ] Commit:

```bash
git add frontend/src backend/src backend/test
git commit -m "feat: add operational admin automations"
```

## Phase 5: Hardening and Quality

### Task 16: Backend and Frontend Regression Tests

**Files:**
- Modify/create: `backend/test/account.test.js`
- Modify/create: `backend/test/admin.test.js`
- Modify: `backend/test/payments.test.js`
- Modify if test scripts needed: `frontend/package.json`

- [ ] Cover account ownership for orders and addresses.
- [ ] Cover admin requireAdmin behavior.
- [ ] Cover upload validation.
- [ ] Cover order status updates and audit logs.
- [ ] Cover Mercado Pago payload fields if payment payloads changed.
- [ ] Run:

```bash
npm test --prefix backend
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

- [ ] Commit:

```bash
git add backend/test frontend/package.json
git commit -m "test: cover account and admin critical flows"
```

### Task 17: Playwright E2E Smoke Coverage

**Files:**
- Create/modify: `frontend/e2e/account.spec.ts`
- Create/modify: `frontend/e2e/admin.spec.ts`
- Create/modify: `frontend/e2e/checkout.spec.ts`
- Modify if needed: `frontend/package.json`

- [ ] Cover login.
- [ ] Cover account overview.
- [ ] Cover order detail.
- [ ] Cover adding address.
- [ ] Cover admin orders.
- [ ] Cover admin products and image upload.
- [ ] Cover checkout smoke without real money by using test/safe mode only.
- [ ] Run:

```bash
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

- [ ] Run Playwright command defined by the repo after scripts are confirmed.
- [ ] Commit:

```bash
git add frontend/e2e frontend/package.json
git commit -m "test: add e2e smoke coverage"
```

### Task 18: Production Deploy and Rollback Checklist

**Files:**
- Create/modify: `docs/deploy/production-checklist.md`
- Create/modify: `docs/deploy/rollback.md`

- [ ] Document exact VPS update command sequence.
- [ ] Document database backup before migrations.
- [ ] Document smoke checks for home, products, checkout, admin, account, uploads, API, Mercado Pago, Melhor Envio, and Gmail.
- [ ] Document rollback to previous commit and PM2 restart.
- [ ] Run:

```bash
npm audit --prefix backend
npm audit --prefix frontend
npm test --prefix backend
npm run typecheck --prefix frontend
npm run build --prefix frontend
```

- [ ] Commit:

```bash
git add docs/deploy
git commit -m "docs: add production deploy and rollback checklist"
```

## Final Deployment Sequence

Run on local/workstation first:

```bash
npm test --prefix backend
npm run typecheck --prefix frontend
npm run build --prefix frontend
git status --short
git push origin chore/project-cleanup-production-ready
```

Run on VPS after push:

```bash
cd /var/www/volkerr
git pull origin chore/project-cleanup-production-ready
npm install --prefix backend
npm install --prefix frontend
npm run db:generate --prefix backend
npm run db:deploy --prefix backend
npm run build --prefix frontend
pm2 restart velkor-backend --update-env
pm2 restart velkor-frontend --update-env
pm2 save
curl -I https://volkerr.com.br
curl https://volkerr.com.br/api/products | head -c 200
```

## Rollback Commands

Use when a deploy breaks production:

```bash
cd /var/www/volkerr
git log --oneline -5
git checkout <previous-good-commit>
npm install --prefix backend
npm install --prefix frontend
npm run db:generate --prefix backend
npm run build --prefix frontend
pm2 restart velkor-backend --update-env
pm2 restart velkor-frontend --update-env
pm2 save
curl -I https://volkerr.com.br
```

If a database migration caused the break, restore the PostgreSQL backup created before deployment. Do not manually edit production tables unless the restore path has failed and the exact SQL repair has been reviewed.

## Plan Self-Review

- Spec coverage: all requested phases are represented in ordered tasks.
- Placeholder scan: no task relies on an unspecified implementation step.
- Risk control: payment, shipping, email, auth, and secrets are protected by explicit non-goals and task constraints.
- Commit size: each task maps to one small commit.
- Rollback: each implementation area can be reverted independently, with special caution for migrations.
