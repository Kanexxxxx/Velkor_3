# Phase 8 — Mercado Pago Sandbox

**Date:** 2026-05-17  
**Status:** Approved for implementation  
**Branch:** chore/project-cleanup-production-ready

---

## 1. Goal

Add a secure Mercado Pago sandbox integration for server-side preference creation and webhook processing while preserving the existing checkout UX and demo fallback.

---

## 2. Non-Goals

- No checkout redesign.
- No client-side trust for totals.
- No removal of current card/Pix/demo payment options.
- No production credentials in the repo.
- No advanced refunds UI.
- No admin payment dashboard beyond order status updates already added in Phase 6.

---

## 3. Environment

Backend:

```env
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
MERCADO_PAGO_DEV_MODE=true
```

Frontend:

```env
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=
```

Rules:

- Access token and webhook secret stay backend-only.
- Public key may be `NEXT_PUBLIC_*`.
- If access token is missing or `MERCADO_PAGO_DEV_MODE=true`, backend returns a safe dev preference instead of calling Mercado Pago.

---

## 4. Data Model

Add `PaymentStatus`:

```prisma
enum PaymentStatus {
  PENDING
  APPROVED
  REJECTED
  REFUNDED
}
```

Add fields to `Order`:

```prisma
paymentStatus PaymentStatus @default(PENDING)
paymentProvider String?
paymentPreferenceId String?
paymentExternalId String?
paidAt DateTime?
```

Add `PaymentWebhookEvent`:

```prisma
model PaymentWebhookEvent {
  id          String   @id @default(uuid())
  provider    String
  eventId     String   @unique
  eventType   String
  externalId  String?
  orderId     String?
  payload     Json
  processedAt DateTime @default(now())

  @@index([provider])
  @@index([orderId])
}
```

This supports webhook idempotency.

---

## 5. Backend API

### 5a. POST /api/payments/create-preference

Input:

```json
{ "orderId": "..." }
```

Auth/session:

- Uses current `X-Velkor-Session` guest session model.
- Order must belong to the requesting session.
- Server reads order totals from DB.
- Frontend-sent amounts are ignored.

Behavior:

- If Mercado Pago configured: call `/checkout/preferences`.
- If dev mode: return a fake preference with a local `initPoint`.
- Save `paymentProvider='mercado_pago'`, `paymentPreferenceId`, `paymentStatus=PENDING`.
- Return:

```json
{
  "provider": "mercado_pago",
  "preferenceId": "...",
  "initPoint": "https://...",
  "sandbox": true
}
```

### 5b. POST /api/payments/webhook

Behavior:

- Verify webhook secret when configured.
- Accept Mercado Pago payment notifications.
- Fetch payment details from Mercado Pago when configured.
- In dev mode, accept explicit test payloads with order id/status.
- Idempotently insert `PaymentWebhookEvent`.
- Update matching order status:
  - `approved` -> `paymentStatus=APPROVED`, `Order.status=PAID`, `paidAt=now`
  - `rejected` -> `paymentStatus=REJECTED`
  - `refunded` -> `paymentStatus=REFUNDED`
  - other -> keep pending

Never create duplicate orders.

---

## 6. Frontend Checkout

Preserve current checkout.

For payment method `mercado-pago`:

- Create order through current server order flow.
- Call `/api/payments/create-preference` with returned `order.id`.
- If successful, redirect to `initPoint`.
- If payment API fails, show error/retry and keep the order.
- If backend is unavailable, keep current demo fallback.

---

## 7. Testing

Backend tests:

- dev preference uses server-side order total and does not require access token.
- preference creation rejects orders outside session.
- webhook processing is idempotent.
- approved webhook marks order as paid.
- missing/invalid webhook secret rejects when secret configured.

Frontend:

- `npm run typecheck --prefix frontend`.

Full validation:

- `npm test`
- `npm run build`
- Prisma validate
- dependency audits.

---

## 8. Rollback

- Set `MERCADO_PAGO_DEV_MODE=true` to disable external API calls.
- Revert the payment routes commit if needed; order creation remains intact.
- If migration already applied, leave payment columns unused while fixing.

---

## 9. Acceptance Criteria

- Payment preference endpoint exists.
- Webhook endpoint exists.
- Server never trusts frontend totals.
- Webhook processing is idempotent.
- Approved payments update order status.
- Checkout can redirect to Mercado Pago when configured.
- Existing checkout fallback remains.
- Tests/build/audits pass.
