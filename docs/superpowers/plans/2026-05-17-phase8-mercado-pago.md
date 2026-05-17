# Phase 8 Mercado Pago Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Mercado Pago sandbox preference creation and secure idempotent webhook handling without changing checkout layout.

**Architecture:** Add payment columns/models in Prisma, a focused payments repository, a small Mercado Pago client with dev mode, native HTTP payment routes, and a frontend payment API used only when checkout selects Mercado Pago.

**Tech Stack:** Node.js CommonJS, native fetch, Prisma/PostgreSQL, Next.js checkout.

---

### Task 1: Payment Schema and Repository

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260517150000_phase8_payments/migration.sql`
- Create: `backend/src/db/payments.js`
- Create: `backend/test/payments.test.js`

- [ ] Write failing tests for payment status mapping and demo mode repository behavior.
- [ ] Add `PaymentStatus`, order payment fields, and `PaymentWebhookEvent`.
- [ ] Implement `createPaymentPreferenceRecord`, `processPaymentWebhook`, and helper mappers.
- [ ] Run `npm run test --prefix backend`.
- [ ] Commit: `feat: add payment persistence`.

### Task 2: Mercado Pago Client and Routes

**Files:**
- Create: `backend/src/services/mercado-pago.js`
- Create: `backend/src/routes/payments.js`
- Modify: `backend/src/server.js`
- Modify: `backend/.env.example`
- Modify: `backend/test/payments.test.js`

- [ ] Write failing tests for dev preference and webhook secret verification.
- [ ] Implement dev-mode preference client.
- [ ] Implement real fetch wrapper for Mercado Pago `/checkout/preferences` and payment detail lookup.
- [ ] Add `POST /api/payments/create-preference`.
- [ ] Add `POST /api/payments/webhook`.
- [ ] Mount routes before 404.
- [ ] Run `npm run test --prefix backend`.
- [ ] Commit: `feat: add mercado pago payment routes`.

### Task 3: Frontend Checkout Integration

**Files:**
- Create: `frontend/src/services/paymentsApi.ts`
- Modify: `frontend/src/app/checkout/CheckoutPageClient.tsx`
- Modify: `frontend/.env.example`

- [ ] Add typed `createPaymentPreference(orderId)`.
- [ ] After successful order creation with `payment === 'mercado-pago'`, call preference endpoint and redirect to `initPoint`.
- [ ] Preserve existing demo fallback if preference call fails.
- [ ] Run `npm run typecheck --prefix frontend`.
- [ ] Commit: `feat: connect checkout to mercado pago preference`.

### Task 4: Verification and Push

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run Prisma validate.
- [ ] Run frontend/backend audits.
- [ ] Push branch.

Rollback:

- Set `MERCADO_PAGO_DEV_MODE=true`.
- Revert latest Phase 8 commit if checkout redirect has issues.
- Existing order creation remains untouched.
