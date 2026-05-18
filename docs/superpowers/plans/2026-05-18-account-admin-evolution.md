# VOLKERR Account And Admin Evolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evoluir a área do cliente e o admin VOLKERR em fases pequenas, seguras e validadas.

**Architecture:** Preservar as páginas atuais e adicionar camadas incrementais: componentes pequenos no frontend, endpoints protegidos no backend, testes focados e commits por comportamento. Fallback demo permanece ativo enquanto a API real é validada.

**Tech Stack:** Next.js, React, Node.js HTTP server, Prisma, PostgreSQL, Mercado Pago Checkout Pro, Melhor Envio, SMTP Gmail, PM2/Nginx.

---

## File Map

- `frontend/src/components/GlobalLoadingBar.tsx`: indicador global para cliques, submits e navegação.
- `frontend/src/app/layout.tsx`: monta o indicador global.
- `frontend/src/services/productApi.ts`: cache seguro do catálogo real e chamadas isomórficas.
- `frontend/src/services/useProductCatalog.ts`: evita flash de catálogo demo antes da API responder.
- `backend/src/services/mercado-pago.js`: envia dados completos de item e comprador para Checkout Pro.
- `backend/test/payments.test.js`: trava a preferência Mercado Pago com dados recomendados.
- `backend/src/routes/account.js`: futura API account protegida por `requireAuth`.
- `frontend/src/app/account/*`: evolução progressiva das rotas da conta.
- `frontend/src/app/admin/AdminPageClient.tsx`: evolução modular do admin.
- `backend/src/routes/admin.js`: futuras importações CSV e módulos admin.

## Task 1: Global Loading Bar

**Files:**
- Create: `frontend/src/components/GlobalLoadingBar.tsx`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/styles/globals.css`

- [ ] **Step 1: Create component**

Implement a client component that listens to document clicks and submits. For anchors, buttons and submit events, show the loading bar briefly. Also react to pathname/search changes.

- [ ] **Step 2: Mount globally**

Import the component in `frontend/src/app/layout.tsx` and render it near `CookieConsent`.

- [ ] **Step 3: Style**

Add `.global-loading-bar` and `.global-loading-bar.active` in `frontend/src/styles/globals.css`.

- [ ] **Step 4: Validate**

Run `npm run typecheck --prefix frontend` and `npm run build --prefix frontend`.

- [ ] **Step 5: Commit**

Commit with `feat: add global action loading`.

## Task 2: Catalog Real Cache

**Files:**
- Modify: `frontend/src/services/productApi.ts`
- Modify: `frontend/src/services/useProductCatalog.ts`

- [ ] **Step 1: Add safe browser cache helpers**

Store API catalog in `localStorage` after successful fetch. Read cached API catalog before fallback demo.

- [ ] **Step 2: Avoid demo flash**

Initialize catalog with cached API data when available. If no cache exists, use a loading state and only switch to fallback when API fails.

- [ ] **Step 3: Validate**

Run `npm run typecheck --prefix frontend` and `npm run build --prefix frontend`.

- [ ] **Step 4: Commit**

Commit with `fix: prevent demo catalog flash`.

## Task 3: Mercado Pago Preference Quality

**Files:**
- Modify: `backend/src/services/mercado-pago.js`
- Modify: `backend/test/payments.test.js`

- [ ] **Step 1: Add failing test**

Assert that preference body includes `items.id`, `items.title`, `items.description`, `items.category_id`, `payer.email`, `payer.first_name`, `payer.last_name`, `payer.phone`, and `payer.address` when order data has it.

- [ ] **Step 2: Implement mapping**

Split customer name into first/last name, map phone area code/number, map address street/zip code, and add item identifiers/category.

- [ ] **Step 3: Validate**

Run `npm test --prefix backend`.

- [ ] **Step 4: Commit**

Commit with `fix: enrich mercado pago preferences`.

## Task 4: Account API Foundation

**Files:**
- Create: `backend/src/routes/account.js`
- Modify: `backend/src/server.js`
- Add tests: `backend/test/account.test.js`

- [ ] **Step 1: Add tests for protected account routes**

Cover `GET /api/account/me`, `GET /api/account/orders`, and unauthorized access.

- [ ] **Step 2: Implement route wrapper**

Use `requireAuth`. Reuse existing auth/order repositories.

- [ ] **Step 3: Validate**

Run `npm test --prefix backend`.

- [ ] **Step 4: Commit**

Commit with `feat: add account api foundation`.

## Task 5: Account Route Pages

**Files:**
- Create route wrappers under `frontend/src/app/account/profile`, `orders`, `addresses`, `security`, `wishlist`, `coupons`, `support`
- Reuse `AccountPageClient`

- [ ] **Step 1: Add route wrappers**

Each route renders the existing account client with the correct query-equivalent tab or section.

- [ ] **Step 2: Improve customer dashboard shortcuts**

Show clear cards for orders, addresses, wishlist, security and support.

- [ ] **Step 3: Validate**

Run `npm run typecheck --prefix frontend` and `npm run build --prefix frontend`.

- [ ] **Step 4: Commit**

Commit with `feat: add account section routes`.

## Task 6: Admin CSV Import Design Slice

**Files:**
- Modify: `frontend/src/app/admin/AdminPageClient.tsx`
- Modify: `backend/src/routes/admin.js`
- Add tests: `backend/test/admin-import.test.js`

- [ ] **Step 1: Add CSV parser test**

Use a small Nuvemshop-like CSV fixture with name, price, SKU, category and image URL.

- [ ] **Step 2: Implement backend preview endpoint**

Add `POST /api/admin/products/import/preview`, protected by `requireAdmin`.

- [ ] **Step 3: Add admin upload UI**

Add file input in product module with preview list and errors.

- [ ] **Step 4: Validate**

Run `npm test --prefix backend`, `npm run typecheck --prefix frontend`, and `npm run build --prefix frontend`.

- [ ] **Step 5: Commit**

Commit with `feat: preview admin product imports`.

