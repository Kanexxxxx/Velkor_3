# VELKOR User Guide

VELKOR is a premium streetwear and sneaker e-commerce MVP built with a Next.js frontend and a lightweight Node.js backend.

## Project Structure

- `frontend/`: Next.js, TypeScript, global CSS, app routes, components, services, and types.
- `backend/`: Node.js API placeholder with public configuration and health check.
- `docs/`: technical planning and integration references.
- `.agents/skills/`: local Codex skills installed for development workflows.

## Installation

Frontend:

```bash
cd frontend
npm install
```

Backend:

```bash
cd backend
npm install
```

## Local Development

Frontend:

```bash
cd frontend
npm run dev -- --hostname 127.0.0.1
```

Open:

```text
http://127.0.0.1:3000/
```

Backend:

```bash
cd backend
npm start
```

Useful backend endpoints:

```text
http://localhost:3001/api/health
http://localhost:3001/api/config
```

## Build

```bash
cd frontend
npm run build
```

## Testing and Checks

Frontend:

```bash
cd frontend
npm run typecheck
npm run lint
npm run test
npm run smoke
```

Backend:

```bash
cd backend
npm run check
npm run test
```

## Main Routes

- `/`: homepage
- `/shop`: product listing
- `/shop?cat=sneakers`: sneakers
- `/shop?cat=apparel`: apparel
- `/shop?cat=accessories`: accessories
- `/product/v01`: product detail example
- `/wishlist`: wishlist
- `/account`: login, sign up, profile, orders, addresses
- `/checkout`: checkout flow
- `/admin`: local MVP admin panel, noindexed

## Support, Brand, and Policy Routes

- `/envio-e-devolucoes`
- `/guia-de-tamanhos`
- `/rastrear-pedido`
- `/contato`
- `/faq`
- `/nossa-historia`
- `/lojas-parceiras`
- `/carreiras`
- `/imprensa`
- `/sustentabilidade`
- `/privacidade`
- `/termos`
- `/reembolso`
- `/cookies`

Legacy `/info?page=...` URLs remain available for compatibility.

## Editing Main Pages

- Homepage: `frontend/src/app/page.tsx`
- Shop: `frontend/src/app/shop/ShopPageClient.tsx`
- Product detail: `frontend/src/app/product/[id]/ProductDetailClient.tsx`
- Account: `frontend/src/app/account/AccountPageClient.tsx`
- Checkout: `frontend/src/app/checkout/CheckoutPageClient.tsx`
- Admin: `frontend/src/app/admin/AdminPageClient.tsx`
- Navbar: `frontend/src/components/layout/Navbar.tsx`
- Footer: `frontend/src/components/layout/Footer.tsx`
- Global styles: `frontend/src/styles/globals.css`

## Editing Brand Contacts

Update brand data in:

```text
frontend/src/services/brand.ts
backend/.env.example
```

Official brand data:

- Brand: VELKOR
- Instagram: https://www.instagram.com/velk.0r/
- Support email: velkor.officiall@gmail.com
- WhatsApp: +55 16 99706-2339

## Editing Legal and Support Content

Use:

```text
frontend/src/services/infoPages.ts
```

This file powers all support, brand, and policy pages.

## Deployment Notes

Recommended MVP deployment flow:

1. Run `npm install` inside `frontend/`.
2. Run `npm run test`.
3. Run `npm run build`.
4. Deploy `frontend/` to a Next.js-compatible platform.
5. Configure the public site URL in `frontend/src/services/brand.ts` before production.
6. Deploy `backend/` separately when real API integrations are enabled.
7. Keep real `.env` files out of git.

## Important Commands

```bash
cd frontend && npm install
cd frontend && npm run dev -- --hostname 127.0.0.1
cd frontend && npm run test
cd frontend && npm run build
cd frontend && npm run smoke
cd backend && npm install
cd backend && npm run test
cd backend && npm start
```
