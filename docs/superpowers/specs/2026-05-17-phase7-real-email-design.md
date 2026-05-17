# Phase 7 — Real Email

**Date:** 2026-05-17  
**Status:** Approved for implementation  
**Branch:** chore/project-cleanup-production-ready

---

## 1. Goal

Add a production-ready email layer for account and order communications without removing the existing demo fallback. This phase centralizes email sending, supports Gmail SMTP, adds email verification tokens, sends password reset links, sends order confirmations after server-side order creation, and keeps newsletter administration ready for future sending.

---

## 2. Non-Goals

- No marketing campaign builder.
- No bulk newsletter sending in Phase 7.
- No redesign of account/reset pages.
- No removal of local reset fallback before validation.
- No hardcoded Gmail credentials.
- No Gmail API OAuth unless SMTP is not configured later.
- No payment email logic from Mercado Pago; payment-specific events belong to Phase 8.

---

## 3. Environment

Add backend envs:

```env
GMAIL_HOST=smtp.gmail.com
GMAIL_PORT=587
GMAIL_USER=
GMAIL_PASS=
EMAIL_FROM=VELKOR <velkor.officiall@gmail.com>
EMAIL_DEV_MODE=true
```

Rules:

- `GMAIL_PASS` must be an app password, never a normal Gmail password.
- No secret may be logged.
- If SMTP config is missing or `EMAIL_DEV_MODE=true`, do not send externally; return a safe dev result and log only recipient, template name, and message subject.
- Production should set `EMAIL_DEV_MODE=false`.

---

## 4. Data Model

Add `EmailVerificationToken`:

```prisma
model EmailVerificationToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([userId])
}
```

Update `User` relation:

```prisma
verificationTokens EmailVerificationToken[]
```

Password reset already has `PasswordResetToken` from Phase 5.

---

## 5. Email Service

Create `backend/src/services/email.js`.

Responsibilities:

- `createEmailClient(env?)`
- `isEmailConfigured(env?)`
- `sendEmail({ to, subject, text, html, template })`
- `sendPasswordResetEmail({ to, resetUrl })`
- `sendEmailVerification({ to, verificationUrl })`
- `sendOrderConfirmation({ to, order })`
- `sendNewsletterOptIn({ to })`

Implementation:

- Use `nodemailer`.
- Lazy-create transporter only when sending.
- In dev mode, return `{ sent: false, mode: 'dev' }`.
- In SMTP mode, return `{ sent: true, mode: 'smtp' }`.
- Templates live in `backend/src/services/email-templates.js`.

Logging:

- allowed: template, recipient, subject, mode.
- forbidden: SMTP password, reset token hash, raw reset token in logs.

---

## 6. Auth Email Flows

### 6a. Password Reset Request

Endpoint remains:

```http
POST /api/auth/password-reset/request
```

Behavior:

- Always returns `{ ok: true }`.
- If user exists and DB is configured, create hashed reset token.
- Send reset email with URL:

```text
${APP_PUBLIC_URL}/account/reset-password?token=<rawToken>
```

- If email sending fails, log safe error and still return `{ ok: true }`.
- Do not enumerate emails.

### 6b. Password Reset Confirm

Endpoint remains:

```http
POST /api/auth/password-reset/confirm
```

Behavior:

- Validate raw token.
- Set password.
- Mark token used.
- Invalidate sessions.
- Return `{ ok: true }` or `{ error: 'token_invalid' }`.

### 6c. Email Verification Request

Add:

```http
POST /api/auth/email-verification/request
```

Authenticated endpoint.

Behavior:

- Create hashed verification token.
- Send verification email with URL:

```text
${APP_PUBLIC_URL}/account/verify-email?token=<rawToken>
```

- Return `{ ok: true }`.

### 6d. Email Verification Confirm

Add:

```http
POST /api/auth/email-verification/confirm
```

Behavior:

- Validate token.
- Mark `User.emailVerified=true`.
- Mark token used.
- Return `{ ok: true }` or `{ error: 'token_invalid' }`.

Frontend for verification page is optional in Phase 7; route-level API must exist.

---

## 7. Order Confirmation

After `createOrder()` succeeds with database storage:

- Send order confirmation email to `order.email`.
- Do not block order creation if email fails.
- Log a safe warning.
- Response may include:

```json
{ "email": { "sent": true, "mode": "smtp" } }
```

Demo mode:

- Do not send external email.
- Preserve existing fallback behavior.

---

## 8. Newsletter

Phase 7 only adds transactional opt-in confirmation after subscription:

- `POST /api/newsletter` may send an opt-in/confirmation email.
- No campaigns.
- No bulk sending.
- No admin send button.

Unsubscribe basics:

Add:

```http
POST /api/newsletter/unsubscribe
```

Input:

```json
{ "email": "customer@example.com" }
```

Behavior:

- If DB configured: set `isActive=false`.
- If JSON fallback: update local JSON entry if present, otherwise no-op.
- Always return `{ ok: true }`.

---

## 9. Testing

Backend tests:

- email service returns dev result without SMTP credentials.
- templates include expected subject/body values without secrets.
- password reset request calls mailer when token is created.
- email verification creates hashed token and confirms it.
- order confirmation email is attempted after DB order success.
- unsubscribe is idempotent.

Validation:

- `npm run test --prefix backend`
- `npm test`
- `npm run build`
- `npx prisma validate --schema prisma/schema.prisma`
- `npm audit --prefix frontend --audit-level=moderate`
- `npm audit --prefix backend --audit-level=moderate`

---

## 10. Rollback

If SMTP fails:

- Set `EMAIL_DEV_MODE=true`.
- Keep credentials in env but no external send occurs.
- Auth/order flows continue.

If email code causes regressions:

- Revert the Phase 7 email service commit.
- Existing password reset confirm endpoint from Phase 5 remains usable server-side.

If verification tokens cause issues:

- Revert migration before production migration is applied.
- If already migrated, leave table unused and disable request endpoint by setting `EMAIL_DEV_MODE=true` while fixing.

---

## 11. Acceptance Criteria

- Central email service exists.
- Gmail SMTP is supported through env only.
- Dev mode is safe and does not send externally.
- Password reset request sends email when configured.
- Email verification request/confirm works server-side.
- Order confirmation email is attempted after successful server-side order creation.
- Newsletter unsubscribe endpoint exists and is idempotent.
- No secrets are committed or logged.
- Existing fallback/demo UX remains intact.
- Tests, build, Prisma validation, and dependency audits pass.
