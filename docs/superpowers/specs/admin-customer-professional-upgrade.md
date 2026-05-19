# VOLKERR Admin + Customer Professional Upgrade Spec

## Goal

Upgrade VOLKERR into a professional, trustworthy e-commerce operation experience focused on the admin panel, customer account area, and operational UX, without rebuilding the project or risking the checkout, Mercado Pago, Melhor Envio, Gmail SMTP, auth, admin session, or production deployment.

This spec intentionally does not authorize a single giant implementation. The work must stay incremental: spec first, plan second, then small modules with validation and commits after each step.

## Current State Analysis

The project is already beyond a prototype:

- Real auth exists with HttpOnly session cookies, PostgreSQL, Prisma, and admin authorization.
- Admin pages exist for dashboard, orders, products, customers, payments, shipping, coupons, newsletter, settings, and logs.
- The admin can manage products, upload simple product images, preview/import Nuvemshop CSV products, manage orders/users/coupons/newsletter, and read audit logs.
- Customer account routes exist for overview, orders, order details, addresses, security, wishlist, coupons, and support.
- Checkout uses server-side order creation, Mercado Pago preference creation, Melhor Envio quotes, and order emails.
- Global loading bar, notification provider, and cookie consent already exist.

The main weaknesses are:

- `frontend/src/app/admin/AdminPageClient.tsx` is still a large operational component. It now has modules, but many concerns remain centralized.
- `frontend/src/app/account/AccountPageClient.tsx` still mixes auth landing, profile, orders, addresses, and security flows.
- UI primitives are inconsistent across account/admin, which makes the system feel less premium than the store brand.
- Some navigation and tab/module changes can feel like reloads or jump the user to the top unexpectedly.
- Loading, empty, error, retry, confirmation, and success states exist in places but are not consistently designed.
- Admin is functional, but not yet operationally calm: dashboard, tables, timelines, detail panels, and actions need a more professional information hierarchy.
- Product data is still limited for a full catalog operation. SKU, stock, dimensions, SEO, featured flags, and advanced image metadata need explicit phased schema work.
- Settings must be split clearly between safe public/store settings and server-only secrets. No admin screen may expose or edit secrets.

## Non-Goals

This upgrade must not:

- Recreate the project.
- Replace the stack.
- Replace Tailwind or current components wholesale.
- Redesign the brand away from the current VOLKERR identity.
- Touch payment, shipping, or email behavior unless a module explicitly requires it and tests cover the change.
- Create a `.env` editor in the admin.
- Expose `DATABASE_URL`, `SESSION_SECRET`, Gmail password, Mercado Pago token, Melhor Envio token, webhook secret, or any other secret.
- Add automatic WhatsApp, S3, Cloudinary, or external media storage without a separate spec.
- Hide errors with generic success states.
- Remove fallback/demo paths before validation and rollback are documented.

## Design Approach

Use an incremental shell-and-primitives approach.

First, stabilize navigation and UX primitives without changing business behavior. Then migrate account/admin screens onto those primitives module by module. This prevents a risky rewrite while still moving the interface toward a professional operating system.

The preferred approach is:

1. Fix scroll/navigation behavior and action feedback.
2. Add shared operational UI components.
3. Migrate customer account sections.
4. Upgrade admin modules in operational priority order.
5. Add automations and hardening.
6. Validate with tests, build, smoke checks, and controlled VPS deploy.

## Phase 1: UX Foundation

### Scroll and Navigation

Fix visual jumps in `/account` and `/admin` by preserving client-side route state and avoiding unnecessary reload-like transitions.

Expected behavior:

- Changing account tabs or admin modules does not unexpectedly jump to the top unless the user navigates to a new full page intentionally.
- Active tabs/modules remain visually stable.
- Browser back/forward works predictably.
- No checkout, auth, Mercado Pago, Melhor Envio, or Gmail flows are changed.

### Shared Components

Create a shared operational UI layer for admin and account screens:

- `PageHeader`
- `SectionCard`
- `StatCard`
- `DataTable`
- `StatusBadge`
- `EmptyState`
- `LoadingSkeleton`
- `ConfirmDialog`
- `Toast` integration helpers where useful
- `ActionButton`
- `FormField`
- `Timeline`

These components must preserve the current dark premium VOLKERR style: strong typography, red accents, black background, restrained cards, and mobile-first responsiveness.

### UX States

Every user action that performs work must have visible feedback:

- Loading state.
- Disabled/retry-safe button state.
- Success notification.
- Error state with useful message.
- Empty state when no data exists.
- Retry action when data loading fails.

## Phase 2: Customer Area Premium

Routes remain:

- `/account`
- `/account/profile`
- `/account/orders`
- `/account/orders/[id]`
- `/account/addresses`
- `/account/security`
- `/account/wishlist`
- `/account/coupons`
- `/account/support`

### Dashboard

The customer dashboard should show:

- Professional greeting.
- Email verification status.
- Most recent order and its status.
- Total purchased.
- Favorites count.
- Saved address count.
- Quick links to orders, addresses, wishlist, security, and support.

### Orders

The orders section should include:

- Real user orders only.
- Search by order code.
- Status filters.
- Pagination when the list grows.
- Clear empty state.
- Card/list layout that works on mobile.
- Order timeline states: created, awaiting payment, paid, preparing, shipped, delivered, canceled.

### Order Details

The order detail page should include:

- Items purchased.
- Address.
- Payment method/status.
- Shipping method/status/tracking.
- Subtotal, discount, shipping, total.
- Button to pay now when payment is pending.
- Button to resend confirmation.
- Button to contact support about that order.
- Button to buy again using the existing cart provider.

### Addresses

Address management should include:

- Add, edit, delete, and set default.
- ViaCEP lookup.
- Postal code validation.
- Limit of saved addresses per user.
- Shipping integration compatibility.
- Mobile-friendly form layout.

### Security

Security should include:

- Change password.
- Resend email verification.
- Logout of other sessions.
- Cleaner reset password screen.
- No token displayed in the UI.
- No email existence leak in password reset.

### Wishlist

Wishlist should include:

- Real saved products.
- Remove item.
- Move to cart.
- Show inactive/unavailable product state.
- Prepare future price/stock alert without implementing automation yet.

### Coupons

Coupons should include:

- Available coupons.
- Used/expired state when backend supports it.
- Validity and rules.
- Clear path to checkout.

### Support

Support should include:

- FAQ-style help.
- Links to public email and WhatsApp link when configured.
- Help about an order.
- Exchange/return policy.
- Track order link.

## Phase 3: Professional Admin

Admin routes remain:

- `/admin`
- `/admin/dashboard`
- `/admin/orders`
- `/admin/products`
- `/admin/customers`
- `/admin/payments`
- `/admin/shipping`
- `/admin/coupons`
- `/admin/newsletter`
- `/admin/settings`
- `/admin/logs`

### Dashboard

Dashboard should show:

- Revenue today.
- Revenue this month.
- Pending orders.
- Paid orders.
- Shipped orders.
- New customers.
- Average order value.
- Best-selling products.
- Recent orders.
- Backend/database health.
- SMTP status.
- Mercado Pago status.
- Melhor Envio status.

### Orders

Orders admin should include:

- Search.
- Status/payment/shipping filters.
- Pagination.
- Professional table on desktop and cards on mobile.
- Detail panel.
- Timeline.
- Full address, items, totals, payment, shipping, tracking.
- Actions: update status, add tracking code, resend order email, generate payment link, cancel order with confirmation, prepare future refund handling.
- Audit log for every critical action.

### Products

Products admin should include:

- CRUD with active/inactive and featured flags.
- Name, slug, description, price, category, brand, sizes/colors.
- SKU, stock, weight, dimensions, and SEO fields after a dedicated migration step.
- Multiple images with upload preview.
- Safe image validation.
- Nuvemshop CSV import remains available.
- Imported products should be reviewed before activation.
- Search, filters, pagination, and bulk actions.

### Customers

Customers admin should include:

- Search and filters.
- Total spent.
- Orders by customer.
- Saved addresses.
- Email verification status.
- Promote/demote admin with confirmation.
- Prepare future block/customer notes without overbuilding now.

### Payments

Payments admin should include:

- Payment id.
- Status.
- Paid/pending/rejected orders.
- Webhook event logs.
- Basic reconciliation view.
- Reprocess webhook action only after a separate safety task.

### Shipping

Shipping admin should include:

- Melhor Envio status.
- Origin CEP display.
- Shipping policy display.
- Quote tester.
- Tracking code support.
- Free shipping threshold as a safe store setting later.
- Fallback shipping behavior visible but not secret.

### Coupons

Coupons admin should include:

- CRUD.
- Active/inactive.
- Usage limit.
- Validity.
- Percent/fixed discount.
- Basic rules.

### Newsletter

Newsletter admin should include:

- Subscribers list.
- Active/unsubscribed status.
- Export CSV.
- LGPD-friendly unsubscribe status.
- Campaign creation remains future scope.

### Logs

Logs should include:

- Audit logs.
- Filters by action.
- Filters by target type/id.
- Filters by admin.
- Business error events when available.
- Critical operation visibility.

### Safe Settings

Admin may edit safe store settings only:

- Store name.
- Public phone.
- Public WhatsApp.
- Instagram.
- Public email.
- Banners.
- Institutional text.
- Free shipping threshold.
- Maintenance mode.

Admin must never edit or display secrets:

- `DATABASE_URL`
- `SESSION_SECRET`
- `GMAIL_PASS`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MELHOR_ENVIO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- Any token, password, private key, or webhook signing secret.

## Phase 4: Operational Automations

Add useful one-click operations with audit logs:

- Resend order confirmation.
- Resend email verification.
- Send or copy payment link.
- Mark order as shipped.
- Add tracking code.
- Send tracking email.
- Cancel order with confirmation.
- Update order status.

WhatsApp remains manual link/button only unless a separate spec approves automatic integration.

## Phase 5: Hardening and Quality

Add and maintain:

- Backend tests for account/admin routes.
- Tests for upload validation.
- Tests for admin auth.
- Tests for orders and webhook behavior.
- Playwright E2E for login, account, order detail, admin orders, admin products, image upload, and checkout.
- Mobile validation.
- Production build validation.
- `npm audit` checks.
- Clean logs without secrets.

## Security Requirements

- Every account endpoint uses `requireAuth`.
- Every admin endpoint uses `requireAdmin`.
- Users only see and edit their own account, orders, addresses, wishlist, and security data.
- Admin actions that change money, order status, user role, product status, coupon status, or settings require confirmation in the UI and audit logging in the backend.
- Uploads must validate MIME/type, size, filename safety, and path traversal.
- Inputs must be validated server-side.
- Rate limits remain on sensitive endpoints.
- Password reset and verification flows must avoid email existence leaks.

## Risks

- Navigation fixes can accidentally break back/forward behavior or deep links.
- Shared UI migration can create visual inconsistencies if applied too broadly in one commit.
- Splitting large components can introduce stale state bugs.
- Product schema expansion can affect imports, cart, checkout, product pages, and Mercado Pago item payloads.
- Upload changes can break existing uploaded image URLs on the VPS if paths change.
- Admin settings can become dangerous if secrets are included by mistake.
- Order automation can send duplicate emails if idempotency is not respected.
- Payment/admin changes can affect real revenue if shipped without smoke tests.
- Mobile polishing can accidentally hide critical actions.

## Rollback Strategy

- Each module ships in a small commit that can be reverted independently.
- UX-only commits must not include database migrations.
- Database migrations must be backwards-compatible first: nullable columns, default values, and code that tolerates missing data.
- Before production deploy with migrations, create a PostgreSQL backup.
- VPS rollback path: checkout previous commit, install if needed, run generate/build, restart PM2, and verify smoke checks.
- Keep existing account/admin fallback behavior until each replacement is validated.
- Do not remove existing routes during this upgrade; deprecate only after production validation.

## Exact Commit Order

1. `docs: plan professional admin customer upgrade`
2. `fix: preserve account and admin navigation position`
3. `feat: add operational ui primitives`
4. `feat: apply account overview ux foundation`
5. `feat: improve customer order list ux`
6. `feat: improve customer order detail timeline`
7. `feat: improve customer address and security ux`
8. `feat: improve customer wishlist coupons support`
9. `feat: add admin operational shell`
10. `feat: improve admin dashboard metrics`
11. `feat: improve admin order operations`
12. `feat: improve admin product management ux`
13. `feat: add product catalog operational fields`
14. `feat: improve admin customer operations`
15. `feat: improve admin payments shipping coupons newsletter logs`
16. `feat: add operational admin automations`
17. `test: cover account and admin critical flows`
18. `test: add e2e smoke coverage`
19. `docs: add production deploy and rollback checklist`

## Acceptance Criteria

This upgrade is only complete when:

- Admin no longer feels like one improvised page.
- Customer area feels trustworthy and useful after purchase.
- Every meaningful click has feedback.
- Empty/loading/error/retry states are consistent.
- Mobile account/admin flows are usable.
- Admin can operate core store workflows without VPS access.
- No secret is exposed in the admin.
- Checkout, Mercado Pago, Melhor Envio, Gmail SMTP, auth, sessions, and existing fallback paths still work.
- Tests/build/smoke checks pass before deploy.
- Production deploy has documented rollback.
