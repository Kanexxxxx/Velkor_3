# Phase 5 — Real Auth (Server Session)

**Date:** 2026-05-16  
**Status:** Approved — ready for implementation  
**Branch:** chore/project-cleanup-production-ready → feature/phase5-real-auth

---

## 1. Scope & Goals

Replace the current localStorage-based auth (frontend/src/services/auth.ts + PBKDF2) with a server-side session system backed by PostgreSQL. Guest flow (X-Velkor-Session) is unchanged. No visual changes. No existing endpoints modified.

**Out of scope for Phase 5:**
- Email verification flow (EmailVerificationToken and email sending — Phase 7)
- Mercado Pago (Phase 8)
- Password reset email flow (model is created as preparation; endpoints are stubbed server-side but no frontend UI)
- Removal of localStorage fallback code (preserved until Phase 5 is fully validated in production)

---

## 2. Schema Changes

Three changes to `backend/prisma/schema.prisma`:

### 2a. User model — add `emailVerified`

```prisma
model User {
  // ... existing fields ...
  emailVerified Boolean  @default(false)   // Phase 7 will use this
  sessions      Session[]
  resetTokens   PasswordResetToken[]
}
```

No `passwordSalt` column — bcrypt embeds the salt inside `passwordHash`.

### 2b. New model: Session

```prisma
model Session {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String   @unique
  createdAt DateTime @default(now())
  expiresAt DateTime
  ipAddress String?
  userAgent String?

  @@index([userId])
  @@index([expiresAt])
}
```

- Raw token lives only in the `velkor_sid` cookie (never stored).
- `tokenHash = SHA-256(rawToken)` — a DB breach cannot replay sessions.
- `expiresAt` is set to `now() + 30 days` on creation; sliding window refresh is NOT implemented in Phase 5 (keep it simple).

### 2c. New model: PasswordResetToken (preparation only)

```prisma
model PasswordResetToken {
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

This model is created in the migration for Phase 5 but has no live frontend flow until Phase 7.

---

## 3. Password Hashing

**Chosen algorithm: bcrypt with cost factor 12.**

Reasoning:
- Battle-tested, zero maintenance burden, available as `bcryptjs` (pure JS) or `bcrypt` (native).
- Embeds salt automatically — no `passwordSalt` column needed.
- Cost 12: ~250ms on modern hardware, acceptable for auth endpoints.
- argon2id is marginally better in theory but adds native compilation risk in deployment; not justified at this scale.

Implementation:
```js
const bcrypt = require('bcryptjs');

async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
```

Existing `User.passwordHash` column already exists. Values from the localStorage demo-auth flow used PBKDF2 — those users won't exist in the real DB so no migration of existing hashes is needed.

---

## 4. Session Cookie

| Attribute    | Value                               |
|-------------|-------------------------------------|
| Name        | `velkor_sid`                        |
| Value       | 32-byte cryptographically random hex (64 chars) |
| HttpOnly    | true                                |
| SameSite    | Lax                                 |
| Secure      | true in production, false in dev    |
| Path        | /                                   |
| Max-Age     | 30 days (2592000 seconds)           |
| Domain      | not set (browser default)           |

Token generation:
```js
const crypto = require('crypto');
const rawToken = crypto.randomBytes(32).toString('hex');
const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
```

Cookie is sent cross-origin-safe because Next.js proxy (`/api/auth/*`) makes the browser believe it is talking to `localhost:3000` — same origin.

---

## 5. Endpoints

All endpoints live in `backend/src/routes/auth.js` and are mounted at `/api/auth` in `server.js`. Every endpoint returns JSON. Auth errors use HTTP status codes (400, 401, 403, 409, 429).

### 5a. POST /api/auth/register

- Body: `{ email, password, name? }`
- Validates email format, password length ≥ 8.
- Checks for existing user (returns 409 if duplicate).
- Hashes password with bcrypt.
- Creates User with `emailVerified: false`.
- Creates Session, sets cookie.
- Returns: `{ user: { id, email, name, role, emailVerified } }`
- Rate limit: 5 attempts / 15 min / IP.

### 5b. POST /api/auth/login

- Body: `{ email, password }`
- Brute force protection: 10 failed attempts per email → 15-min lockout (in-memory Map, not DB).
- Verifies password with bcrypt.
- Creates Session, sets cookie.
- Returns: `{ user: { id, email, name, role, emailVerified } }`
- Rate limit: 10 attempts / 15 min / IP.

### 5c. POST /api/auth/logout

- Reads `velkor_sid` cookie.
- Hashes token, deletes Session from DB.
- Clears cookie (Max-Age=0).
- Returns: `{ ok: true }`
- Authenticated endpoint (if no session: returns 401).

### 5d. GET /api/auth/me

- Reads `velkor_sid` cookie.
- Hashes token, queries Session JOIN User.
- If session expired or not found: 401.
- Returns: `{ user: { id, email, name, role, emailVerified } }`
- No rate limit (cheap read, authenticated).

### 5e. POST /api/auth/change-password

- Authenticated.
- Body: `{ currentPassword, newPassword }`
- Verifies current password. Rejects if wrong (401).
- Hashes new password. Updates User.
- Invalidates all sessions except current one.
- Returns: `{ ok: true }`

### 5f. PATCH /api/auth/profile

- Authenticated.
- Body: `{ name }`
- Updates User.name.
- Returns: `{ user: { id, email, name, role, emailVerified } }`

### 5g. GET /api/auth/sessions

- Authenticated.
- Lists all active (non-expired) sessions for the user.
- Returns: `{ sessions: [{ id, createdAt, expiresAt, ipAddress, userAgent }] }` — never returns tokenHash.

### 5h. DELETE /api/auth/sessions/:id

- Authenticated.
- Deletes a specific session by ID. Only if it belongs to the current user.
- Returns: `{ ok: true }`

### 5i. DELETE /api/auth/sessions

- Authenticated.
- Deletes all sessions except the current one.
- Returns: `{ ok: true, revoked: N }`

### 5j. POST /api/auth/password-reset/request (stub)

- Body: `{ email }`
- Creates PasswordResetToken in DB (hashed) but does NOT send email (Phase 7).
- Always returns `{ ok: true }` — no email enumeration.
- Rate limit: 3 attempts / 1 hour / IP.

### 5k. POST /api/auth/password-reset/confirm (stub)

- Body: `{ token, newPassword }`
- Validates token, sets new password, marks token used, invalidates all sessions.
- Functional server-side; no frontend UI until Phase 7.
- Returns: `{ ok: true }` or `{ error: 'token_invalid' }`.

---

## 6. Rate Limiting & Brute Force

Single in-memory `RateLimiter` class (no Redis, no external dependency):

```js
class RateLimiter {
  // Map<scope:key, { count, windowStart }>
  // cleanup: delete entries older than windowMs * 2 (called on each check)
  check(scope, key, limit, windowMs) // throws 429 with retryAfter header
}
```

Scopes:
- `register:ip` — 5 / 15 min
- `login:ip` — 10 / 15 min  
- `reset:ip` — 3 / 60 min

Brute force (separate per-email map):
- `bruteforce:email` — 10 failures → lockout 15 min, counter fully cleared on successful login.

All limits are constants at top of `auth.js` — easy to tune.

---

## 7. Next.js Rewrite Proxy

Added to `next.config.ts` — rewrites `/api/auth/:path*` → `http://localhost:3001/api/auth/:path*`.

Only `/api/auth/*` is proxied. All other frontend→backend calls (`/api/products`, `/api/cart`, `/api/orders`, `/api/coupon`) continue as direct fetch to `NEXT_PUBLIC_API_URL`.

This makes cookies same-origin from the browser's perspective.

CSP `connect-src` must include `'self'` for the proxied routes (already present) — no changes needed to CSP.

---

## 8. Frontend — authApi.ts

New file: `frontend/src/services/authApi.ts`

All calls go to `/api/auth/*` (relative path — uses Next.js proxy, no `NEXT_PUBLIC_API_URL`).

Exported functions:
```ts
register(email, password, name?): Promise<{ user: AuthUser }>
login(email, password): Promise<{ user: AuthUser }>
logout(): Promise<void>
getMe(): Promise<{ user: AuthUser } | null>
changePassword(currentPassword, newPassword): Promise<void>
updateProfile(name: string): Promise<{ user: AuthUser }>
listSessions(): Promise<{ sessions: SessionInfo[] }>
revokeSession(id: string): Promise<void>
revokeAllSessions(): Promise<void>
requestPasswordReset(email: string): Promise<void>
confirmPasswordReset(token, newPassword): Promise<void>
```

Types:
```ts
type AuthUser = { id: string; email: string; name: string | null; role: string; emailVerified: boolean }
type SessionInfo = { id: string; createdAt: string; expiresAt: string; ipAddress: string | null; userAgent: string | null }
```

Error handling: functions throw typed errors (`AuthError` with `code: string`) that AuthProvider can map to user-facing messages.

---

## 9. Frontend — AuthProvider Migration

`frontend/src/components/auth/AuthProvider.tsx` is updated **API-first with localStorage fallback**.

Migration strategy:
1. `getMe()` is called on mount. If it resolves → user is set from server, localStorage state is ignored.
2. If `getMe()` fails (backend unavailable, no session) → fall back to current localStorage check.
3. `register`, `login`, `logout` try the API first. If the API succeeds, localStorage state is NOT written (no double-write). If the API is unavailable, falls back to existing localStorage logic.
4. `updateProfile`, `changePassword` try API first, fall back to localStorage.

The localStorage auth code (`frontend/src/services/auth.ts`) is NOT deleted in Phase 5. It remains as-is. The fallback path uses it unchanged. Cleanup happens in a future phase after Phase 5 is validated in production.

`AuthContextValue` interface is unchanged — no consumer component needs modification.

---

## 10. Session Cleanup

Expired sessions are NOT actively purged in Phase 5. The `GET /api/auth/me` endpoint ignores sessions where `expiresAt < now()`. A future phase can add a nightly cleanup job. For now, volume is low enough that this is acceptable.

---

## 11. Files Changed / Created

| File | Action |
|------|--------|
| `backend/prisma/schema.prisma` | Add `emailVerified`, `Session`, `PasswordResetToken` |
| `backend/prisma/migrations/<ts>_phase5_auth/migration.sql` | Auto-generated by `prisma migrate dev` |
| `backend/src/routes/auth.js` | New — all 11 endpoints |
| `backend/src/server.js` | Mount auth router; install `bcryptjs` |
| `backend/.env.example` | Already has `SESSION_SECRET` placeholder (done in Phase 4 cleanup) |
| `frontend/next.config.ts` | Add rewrite proxy for `/api/auth/*` |
| `frontend/src/services/authApi.ts` | New — typed API client |
| `frontend/src/components/auth/AuthProvider.tsx` | API-first migration with fallback |

No changes to:
- `frontend/src/services/auth.ts` (preserved as fallback)
- Any product, cart, wishlist, coupon, or order endpoint
- Any UI component outside AuthProvider
- Any existing `.env` files

---

## 12. Testing Checklist

Before declaring Phase 5 complete:

- [ ] `npx prisma migrate dev` applies cleanly
- [ ] `npm run build` (frontend) succeeds
- [ ] Register → cookie is set, `GET /me` returns user
- [ ] Login with correct password → success
- [ ] Login with wrong password → 401 after 10 attempts → 429 lockout
- [ ] Logout → cookie cleared, `GET /me` returns 401
- [ ] Session list shows active session, revoke works
- [ ] change-password invalidates other sessions
- [ ] Demo/fallback path still works when `DATABASE_URL` is absent
- [ ] `X-Velkor-Session` guest flow unchanged (cart, wishlist, orders)
- [ ] No `passwordSalt` column created anywhere
- [ ] `tokenHash` is never returned in any API response
- [ ] No secrets in any `NEXT_PUBLIC_*` variable

---

## 13. Dependencies

New backend dependency:
- `bcryptjs` — pure JS bcrypt, no native compilation required

No new frontend dependencies.

No changes to existing `package.json` scripts.
