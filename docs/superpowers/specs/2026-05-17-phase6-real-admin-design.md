# Phase 6 — Real Admin

**Date:** 2026-05-17  
**Status:** Approved for implementation  
**Branch:** chore/project-cleanup-production-ready  

---

## 1. Goal

Replace the current password-only demo admin gate with real server-side admin authorization using the Phase 5 session system, while preserving the current `/admin` layout and keeping the demo/fallback path available until the real admin flow is validated.

This phase does not redesign the admin panel. It changes the data source and protection model incrementally.

---

## 2. Non-Goals

- No branding/layout redesign.
- No Tailwind/component replacement.
- No destructive refactor of the native Node HTTP server.
- No removal of localStorage/demo fallback before validation.
- No email sending. Newsletter sending belongs to Phase 7.
- No Mercado Pago admin/payment management. That belongs to Phase 8.
- No full analytics system.
- No migration from `CUSTOMER` to `USER`; keep `CUSTOMER | ADMIN` to avoid unnecessary schema churn.

---

## 3. Current State

Phase 5 provides:

- `velkor_sid` HttpOnly session cookie.
- `Session` table with hashed tokens.
- `User.role` enum with `CUSTOMER` and `ADMIN`.
- `/api/auth/*`.
- Frontend auth API-first with local fallback.

Current admin:

- `/admin` uses an `ADMIN_SECRET` unlock form.
- `/api/admin/unlock` checks a shared server-side secret.
- Admin dashboard reads local orders from `localStorage`.
- Real order, coupon, newsletter, and user records already exist in Prisma schema.

---

## 4. Compatibility Strategy

`/api/admin/unlock` is deprecated but not removed in Phase 6.

Add env flag:

```env
LEGACY_ADMIN_UNLOCK_ENABLED=true
```

Behavior:

- Default in development: enabled if `ADMIN_SECRET` exists.
- Recommended production setting after validation: `LEGACY_ADMIN_UNLOCK_ENABLED=false`.
- When disabled, `/api/admin/unlock` returns `410 Gone` with a clear JSON error.
- The frontend should prefer real admin auth first and only show the legacy password unlock if the real admin API is unavailable and legacy mode is enabled.

Rollback:

- Set `LEGACY_ADMIN_UNLOCK_ENABLED=true`.
- Ensure `ADMIN_SECRET` exists.
- Restart backend.
- `/admin` can use the legacy unlock fallback again while real admin APIs are investigated.

---

## 5. Admin Identity and First Admin

Use the existing `User.role` enum:

- `CUSTOMER`: regular user.
- `ADMIN`: admin user.

Do not add a `USER` enum value in Phase 6.

First admin should be promoted through seed/env, not a public endpoint.

Add env:

```env
ADMIN_EMAIL=owner@example.com
ADMIN_PASSWORD=change-me-locally
```

Seed behavior:

- If `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set, ensure that user exists with role `ADMIN`.
- If the user exists, promote role to `ADMIN`.
- If the user does not exist, create it with bcrypt hash.
- Never log the password.
- In production docs, recommend setting a strong temporary password and changing it after first login.

Rollback:

- Remove or comment `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- Re-run seed only when intentionally provisioning admin users.
- Existing admin rows remain unchanged unless explicitly updated.

---

## 6. Auth Middleware Design

Create reusable backend auth helpers:

- `requireAuth(req, res, corsOrigin, repo?)`
- `requireAdmin(req, res, corsOrigin, repo?)`

Responsibilities:

- `requireAuth` reads `velkor_sid`, validates Phase 5 session, returns current user/session context, or sends `401`.
- `requireAdmin` calls `requireAuth`, checks `user.role === 'ADMIN'`, returns admin context, or sends `403`.

This separation prevents duplicated auth logic for future:

- newsletter admin tools
- admin dashboard
- Mercado Pago admin actions
- analytics
- later permissions

---

## 7. Backend Admin API

All real admin endpoints live under `/api/admin/*` and require `requireAdmin`.

### 7a. GET /api/admin/me

Returns current admin user:

```json
{ "user": { "id": "...", "email": "...", "name": "...", "role": "ADMIN", "emailVerified": true } }
```

### 7b. Orders

```http
GET /api/admin/orders
PATCH /api/admin/orders/:id/status
```

Status update accepts:

- `pending`
- `paid`
- `fulfilled`
- `cancelled`

Mapping to Prisma:

- `pending` -> `PENDING`
- `paid` -> `PAID`
- `fulfilled` -> `FULFILLED`
- `cancelled` -> `CANCELLED`

Admin order list should reuse existing order shape where possible.

### 7c. Users

```http
GET /api/admin/users
PATCH /api/admin/users/:id
```

Editable now:

- `role`: `CUSTOMER | ADMIN`
- `emailVerified`: boolean

Never return `passwordHash`.

### 7d. Coupons

```http
GET /api/admin/coupons
POST /api/admin/coupons
PATCH /api/admin/coupons/:id
```

Fields:

- `code`
- `discountType`
- `discountValue`
- `active`
- `startsAt`
- `expiresAt`
- `maxRedemptions`

Keep validation simple and strict:

- uppercase coupon codes
- percent discount between 1 and 100
- fixed discount as positive cents

### 7e. Newsletter

```http
GET /api/admin/newsletter
PATCH /api/admin/newsletter/:id
```

Phase 6 only supports admin CRUD/list basics:

- list subscribers
- activate/deactivate subscriber

No sending, templates, SMTP, Gmail, campaigns, or unsubscribe email links in Phase 6. Those belong to Phase 7.

---

## 8. Audit Logs

Use the existing `AdminAuditLog` model. No schema migration is required.

Store minimal metadata with this shape:

```json
{
  "adminUserId": "usr_...",
  "targetType": "order",
  "targetId": "ord_...",
  "timestamp": "2026-05-17T00:00:00.000Z"
}
```

Fields:

- `action`: e.g. `order.status.update`, `coupon.update`, `user.update`
- `actorId`: admin user id
- `entity`: `order | coupon | user | newsletter`
- `entityId`: changed record id
- `metadata`: small object, no secrets

Log these actions:

- order status update
- coupon create/update
- user role/email verification update
- newsletter subscriber activation changes

Do not overbuild search, exports, or retention in Phase 6.

---

## 9. Rate Limiting

Use the existing in-memory rate limit approach for now.

Admin scope:

- `admin-real`: 60 requests/minute/IP.
- `admin-write`: 20 write requests/minute/IP.
- Legacy unlock keeps stricter behavior from the current `/api/admin/unlock`.

Future production hardening can replace this with Redis or edge protection in Phase 9.

---

## 10. Frontend Admin

Preserve the current `/admin` visual structure.

Do only:

- check real admin auth via `/api/admin/me`
- load admin dashboard data from `/api/admin/*`
- show loading state
- show error/retry state
- preserve current metrics/cards/list style
- keep legacy unlock fallback while enabled

Do not:

- redesign the page
- introduce a new UI library
- replace product/order cards
- remove local demo read before validation

Data source priority:

1. Real admin API when authenticated admin session exists.
2. Legacy unlock fallback if API unavailable and legacy env allows it.
3. Local demo read-only fallback only for development/demo display.

---

## 11. Testing Strategy

Use TDD for backend behavior.

Backend tests:

- `requireAuth` returns 401 without valid session.
- `requireAdmin` returns 403 for `CUSTOMER`.
- `requireAdmin` allows `ADMIN`.
- Admin order status update rejects non-admin.
- Admin order status update logs audit metadata.
- Coupon creation normalizes code and validates discount.
- User update never returns password hash.
- Newsletter activation update logs audit metadata.
- Legacy unlock returns 410 when disabled.

Frontend checks:

- `npm run typecheck --prefix frontend`
- admin service types compile
- current admin page builds without layout rewrite

Full validation after each implementation slice:

- `npm run test --prefix backend`
- `npm test`
- `npm run build`
- `npm audit --prefix frontend --audit-level=moderate`
- `npm audit --prefix backend --audit-level=moderate`

---

## 12. Rollback Plan

If real admin breaks:

1. Revert the latest Phase 6 commit only.
2. Set:

```env
LEGACY_ADMIN_UNLOCK_ENABLED=true
ADMIN_SECRET=<previous-secret>
```

3. Restart backend.
4. `/admin` can use the old unlock path again.

If admin provisioning fails:

1. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
2. Run backend seed.
3. Login through normal `/account`.
4. Visit `/admin`.

If admin API data fails:

1. Keep frontend fallback read-only.
2. Revert only the admin API slice.
3. Existing customer storefront, checkout, auth, orders, cart, and wishlist continue to work.

---

## 13. Acceptance Criteria

- Real admin session controls `/admin`.
- `CUSTOMER` sessions cannot access `/api/admin/*`.
- `ADMIN` sessions can access admin endpoints.
- `/api/admin/unlock` remains available only when legacy flag allows it and is marked deprecated.
- Orders can be listed and status updated by admins.
- Users can be listed and safely updated by admins.
- Coupons can be listed, created, and updated by admins.
- Newsletter subscribers can be listed and activated/deactivated.
- Critical admin writes create simple audit logs.
- Frontend `/admin` keeps current UX and layout.
- Fallback/demo path remains available until validation.
- Tests, lint, build, Prisma validation, and dependency audits pass.
