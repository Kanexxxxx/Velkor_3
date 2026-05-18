# VOLKER

> Formerly VELKOR

Modern Brazilian e-commerce platform built with Next.js, Node.js, PostgreSQL and Prisma, featuring real authentication, admin dashboard, email workflows, Mercado Pago payments, real shipping integration and VPS-ready production architecture.

---

# Stack

## Frontend

* Next.js
* React
* Tailwind CSS

## Backend

* Node.js
* Native HTTP server architecture
* Prisma ORM

## Database

* PostgreSQL

## Integrations

* Mercado Pago
* Melhor Envio
* Gmail SMTP

## Production

* PM2
* Nginx
* SSL / Certbot

---

# Features

## Store

* Real product catalog
* Categories
* Wishlist
* Persistent cart
* Checkout flow
* Coupon system
* Address management
* Order tracking

## Authentication

* Server-side sessions
* HttpOnly cookies
* bcrypt password hashing
* Password reset
* Email verification
* Role-based access

## Admin

* Real admin authentication
* Order management
* Coupon management
* Newsletter management
* User management

## Payments & Shipping

* Mercado Pago checkout
* Secure webhook validation
* Real shipping calculation
* Melhor Envio integration
* Shipping fallback mode

## Quality & Infrastructure

* Smoke tests
* Playwright E2E tests
* Production deployment guides
* Rollback strategy
* SEO technical setup
* Security hardening

---

# Project Structure

```text
frontend/                 # Next.js storefront and admin UI
backend/                  # Node.js API
backend/prisma/           # Prisma schema, migrations and seeds
docs/deploy/              # VPS deployment guides and configs
docs/superpowers/         # Historical specs and implementation plans
ecosystem.config.cjs      # PM2 process configuration
```

---

# Local Development

## Install Dependencies

```bash
npm ci --prefix backend
npm ci --prefix frontend
```

---

## Run Backend

```bash
npm run start:backend
```

Backend:

```text
http://localhost:3001
```

Healthcheck:

```text
http://localhost:3001/api/health
```

---

## Run Frontend

```bash
npm run dev:frontend
```

Frontend:

```text
http://localhost:3000
```

---

# Environment Variables

Copy the example files before running the project:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

---

## Backend Secrets

Sensitive credentials must exist only in:

```text
backend/.env
```

Never expose:

* DATABASE_URL
* SESSION_SECRET
* ADMIN_SECRET
* Gmail credentials
* Mercado Pago access token
* Melhor Envio tokens
* Webhook secrets

---

# Database

## Development

```bash
npm run db:migrate --prefix backend
npm run db:seed --prefix backend
```

---

## Production

```bash
npm run db:deploy --prefix backend
```

Run seed only when necessary:

```bash
npm run db:seed --prefix backend
```

---

# Initial Admin User

The initial admin can be created through environment variables:

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=strong-temporary-password
```

---

# Validation

## Tests

```bash
npm test
```

---

## Production Build

```bash
npm run build
```

---

## End-to-End Tests

```bash
npm run e2e --prefix frontend
```

---

## Security Audit

```bash
npm audit --prefix backend --audit-level=moderate
npm audit --prefix frontend --audit-level=moderate
```

---

## Prisma Validation

```bash
cd backend
npx prisma validate --schema prisma/schema.prisma
```

---

# Deployment

Production deployment documentation:

* `docs/deploy/VPS-DEPLOY.md`
* `docs/deploy/PRODUCTION-CHECKLIST.md`
* `docs/deploy/ROLLBACK.md`
* `docs/deploy/nginx/velkor.conf.example`

Production domain:

```text
https://volkerr.com.br
```

---

# Security

* HttpOnly authentication cookies
* Server-side session storage
* bcrypt password hashing
* SHA-256 session token hashing
* Rate limiting
* Secure Mercado Pago webhook validation
* Environment-based configuration
* No secrets committed to Git
* Backend-only sensitive integrations

---

# Production Architecture

```text
Browser
   ↓
Next.js Frontend
   ↓
Node.js Backend API
   ↓
PostgreSQL + Prisma
   ↓
Mercado Pago / Melhor Envio / Gmail
```

---

# Git Workflow

Main working branch:

```bash
chore/project-cleanup-production-ready
```

Recommended workflow:

* small commits
* incremental implementation
* rollback-safe changes
* continuous validation
* no destructive refactors

---

# Status

## Completed

* Real products
* Persistent cart/wishlist
* Real orders
* Real authentication
* Real admin
* Email workflows
* Mercado Pago integration
* VPS production setup

## In Progress

* Real shipping calculation integration
* Final production hardening

---

# License

Private project — VOLKERR.
