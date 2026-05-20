# Production Deploy Checklist — VELKOR / VOLKERR

Use this checklist before and after every production deploy. Complete each step in order. Sign off at the bottom.

---

## 1. Pre-deploy

- [ ] **PostgreSQL backup** — dump the production database before any changes:
  ```bash
  pg_dump $DATABASE_URL > /var/backups/velkor_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] **Pull latest branch** — confirm you are on the correct branch and it is up to date with the remote.
- [ ] **npm install** — verify dependencies install cleanly with no peer-dependency errors.
- [ ] **Build check** — `npm run build --prefix frontend` must complete without errors.
- [ ] **Test check** — `npm test --prefix backend` and `npm run typecheck --prefix frontend` must both pass.
- [ ] Notify the team that a deploy is in progress.

---

## 2. VPS Deploy Sequence

SSH into the VPS and run the following commands in order. Do not skip steps.

```bash
cd /var/www/volkerr
git pull origin chore/project-cleanup-production-ready
npm install --prefix backend
npm install --prefix frontend
npm run db:generate --prefix backend
npm run db:deploy --prefix backend
npm run build --prefix frontend
pm2 restart velkor-backend --update-env
pm2 restart velkor-frontend --update-env
pm2 save
```

Confirm that `pm2 status` shows both processes as **online** before proceeding.

---

## 3. Smoke Checks

Run these curl commands from the VPS or your local machine:

```bash
# Home page — should return HTTP 200
curl -s -o /dev/null -w "%{http_code}" https://velkor.com.br/

# Products API — should return JSON
curl -s https://velkor.com.br/api/products | head -c 200

# Admin page — should return 200 (auth gate)
curl -s -o /dev/null -w "%{http_code}" https://velkor.com.br/admin

# Account page — should return 200
curl -s -o /dev/null -w "%{http_code}" https://velkor.com.br/account

# Checkout page — should return 200
curl -s -o /dev/null -w "%{http_code}" https://velkor.com.br/checkout
```

All endpoints must return `200`. Any `5xx` is a blocker — trigger rollback immediately.

---

## 4. Critical Checks

### Mercado Pago Webhook URL

- Log in to the [Mercado Pago Developer Dashboard](https://www.mercadopago.com.br/developers).
- Confirm the webhook notification URL is set to:
  ```
  https://velkor.com.br/api/payments/webhook
  ```
- Send a test notification and confirm the backend logs show a `200` response.

### Gmail SMTP Test

- Trigger a test email (place a dummy order or use the admin "Reenviar confirmacao" button).
- Confirm the email arrives within 2 minutes.
- If it does not arrive, check `pm2 logs velkor-backend` for SMTP errors.

### Melhor Envio Quote Test

- Open the checkout page and enter a Brazilian CEP.
- Confirm at least one shipping option appears within 10 seconds.
- If no quotes appear, check `pm2 logs velkor-backend` for Melhor Envio API errors.

---

## 5. Sign-off

| Field  | Value          |
|--------|----------------|
| Run by |                |
| Date   |                |
| Result | PASS / FAIL    |
| Notes  |                |

If any step fails, do not mark this deploy as complete. Trigger the rollback procedure documented in `rollback.md`.
