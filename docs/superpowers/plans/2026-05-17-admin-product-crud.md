# Admin Product CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real product CRUD to the existing admin panel so products can be managed before VPS deploy.

**Architecture:** Extend the existing native Node admin route and admin repository. The frontend keeps the current `/admin` page and adds a product management section powered by `adminApi.ts`.

**Tech Stack:** Node HTTP backend, Prisma/PostgreSQL, Next.js, TypeScript, Playwright.

---

## Tasks

- [ ] Add backend tests for admin product validation, list, create, update, and audit logging.
- [ ] Implement product serialization/validation/repository methods in `backend/src/db/admin.js`.
- [ ] Add admin product routes in `backend/src/routes/admin.js`.
- [ ] Extend `frontend/src/services/adminApi.ts` with product types and calls.
- [ ] Add product management UI to `frontend/src/app/admin/AdminPageClient.tsx`.
- [ ] Update E2E smoke to keep admin route covered.
- [ ] Run `npm test`, `npm run build`, `npm run e2e --prefix frontend`, audits, Prisma validate.
- [ ] Commit and push.
