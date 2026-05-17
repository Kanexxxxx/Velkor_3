# Phase 7 Real Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe Gmail SMTP email flows for password reset, email verification, order confirmation, and newsletter unsubscribe while preserving demo fallback.

**Architecture:** Add a central backend email service with dev mode, extend Prisma with email verification tokens, wire auth/order/newsletter routes to the service, and keep failures non-blocking where user experience must continue.

**Tech Stack:** Node.js CommonJS, native HTTP server, Prisma/PostgreSQL, `nodemailer`, Next.js existing account pages.

---

### Task 1: Email Service and Templates

**Files:**
- Create: `backend/src/services/email.js`
- Create: `backend/src/services/email-templates.js`
- Create: `backend/test/email.test.js`
- Modify: `backend/package.json`
- Modify: `backend/package-lock.json`
- Modify: `backend/.env.example`

- [ ] Write failing tests for dev-mode sending and template generation.
- [ ] Run `npm run test --prefix backend`; expect missing module failure.
- [ ] Install `nodemailer`.
- [ ] Implement `email-templates.js` with password reset, email verification, order confirmation, and newsletter opt-in templates.
- [ ] Implement `email.js` with `isEmailConfigured`, `createEmailClient`, `sendEmail`, and typed helper functions.
- [ ] Add env examples for `GMAIL_HOST`, `GMAIL_PORT`, `GMAIL_USER`, `GMAIL_PASS`, `EMAIL_FROM`, `EMAIL_DEV_MODE`.
- [ ] Run `npm run test --prefix backend`; expect pass.
- [ ] Commit: `feat: add safe email service`.

### Task 2: Email Verification Data and Auth Repository

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260517140000_phase7_email_verification/migration.sql`
- Modify: `backend/src/db/auth.js`
- Modify: `backend/test/auth.test.js`

- [ ] Write failing tests for verification token creation and confirm helper in demo-disabled mode and pure token hashing behavior.
- [ ] Add `EmailVerificationToken` model and `User.verificationTokens`.
- [ ] Implement `createEmailVerificationToken(emailOrUserId)` and `consumeEmailVerificationToken(rawToken)`.
- [ ] Run `npm run test --prefix backend`; expect pass.
- [ ] Commit: `feat: add email verification tokens`.

### Task 3: Auth Email Routes

**Files:**
- Modify: `backend/src/routes/auth.js`
- Modify: `backend/test/auth.test.js`

- [ ] Write failing route tests for password-reset request calling mailer and email-verification request/confirm.
- [ ] Update `createAuthHandler` to accept `emailService` and `appConfig`.
- [ ] On reset request, create token and call `sendPasswordResetEmail` with `${VELKOR_PUBLIC_URL}/account/reset-password?token=...`.
- [ ] Add `POST /api/auth/email-verification/request`.
- [ ] Add `POST /api/auth/email-verification/confirm`.
- [ ] Keep all email failures non-enumerating and safe.
- [ ] Run `npm run test --prefix backend`; expect pass.
- [ ] Commit: `feat: send auth emails`.

### Task 4: Order Confirmation Email

**Files:**
- Modify: `backend/src/server.js`
- Modify: `backend/test/orders.test.js` or add route-level test in `backend/test/email.test.js`

- [ ] Write failing test that a successful order can attach/send an order confirmation result without blocking order creation.
- [ ] Wire order creation route to call `sendOrderConfirmation` after `createOrder()` returns a database order.
- [ ] Include `{ email: result }` in response when attempted.
- [ ] Run `npm run test --prefix backend`; expect pass.
- [ ] Commit: `feat: send order confirmation emails`.

### Task 5: Newsletter Unsubscribe and Opt-In Email

**Files:**
- Modify: `backend/src/db/newsletter.js`
- Modify: `backend/src/server.js`
- Modify: `backend/test/email.test.js` or `backend/test/newsletter` coverage inside existing tests.

- [ ] Write failing tests for idempotent unsubscribe.
- [ ] Implement `unsubscribeNewsletter(rawEmail, jsonFallback?)`.
- [ ] Add `POST /api/newsletter/unsubscribe`.
- [ ] Send opt-in/confirmation email after successful subscribe without blocking.
- [ ] Run `npm run test --prefix backend`; expect pass.
- [ ] Commit: `feat: add newsletter email controls`.

### Task 6: Verification and Push

**Files:**
- All touched files.

- [ ] Run `npm run test --prefix backend`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npx prisma validate --schema prisma/schema.prisma` from `backend`.
- [ ] Run frontend/backend `npm audit --audit-level=moderate`.
- [ ] Run `git status --short --branch`.
- [ ] Push `chore/project-cleanup-production-ready`.

Rollback:

- Set `EMAIL_DEV_MODE=true` to disable external sending.
- Revert the latest Phase 7 commit if only one slice fails.
- Leave fallback/demo auth behavior intact.
