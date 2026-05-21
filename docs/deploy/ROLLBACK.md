# Rollback Guide — VELKOR / VOLKERR

Use this guide when a production deploy causes errors, broken checkout, 500 responses, or payment failures.

---

## 1. When to Rollback

Trigger a rollback immediately if any of the following occur after a deploy:

- **Production 500 errors** — any page or API endpoint returning 500 that was working before the deploy.
- **Broken checkout** — users cannot add items to cart, proceed through checkout, or complete a purchase.
- **Mercado Pago errors** — payment preference creation fails, webhooks return non-200 responses, or order statuses are not updating.
- **Admin inaccessible** — the admin panel fails to load or returns unexpected errors after login.
- **Email failures** — order confirmation emails stop sending (after confirming it is not a transient SMTP issue).

Do not wait for users to report multiple errors. Roll back as soon as a critical integration is confirmed broken.

---

## 2. Rollback Commands

### Before running db:deploy (no schema migrations applied)

Revert to the previous commit and restart processes:

```bash
cd /var/www/volkerr
git checkout <previous-commit-hash>
npm install --prefix backend
npm install --prefix frontend
npm run build --prefix frontend
pm2 restart velkor-backend --update-env
pm2 restart velkor-frontend --update-env
pm2 save
```

### After running db:deploy (schema migrations applied)

Stop processes before restoring the database to prevent schema mismatches:

```bash
pm2 stop velkor-backend velkor-frontend
```

See Section 3 for database restoration, then continue:

```bash
git checkout <previous-commit-hash>
npm install --prefix backend
npm install --prefix frontend
npm run build --prefix frontend
pm2 restart velkor-backend velkor-frontend
pm2 save
```

---

## 3. Database Rollback

### When to use the PostgreSQL backup

Use the database backup only when schema migrations were applied AND the previous code version is not compatible with the new schema. If the code rollback alone restores functionality (e.g. no breaking schema changes), skip the database restore.

### How to restore from backup

```bash
# Stop the backend first to prevent active connections
pm2 stop velkor-backend

# Restore the pre-deploy backup
psql "$DATABASE_URL" < /var/backups/velkor_<timestamp>.sql

# Restart after restore
pm2 restart velkor-backend --update-env
```

Do not restore the database if orders were placed after the deploy started — you will lose those orders. Assess whether lost data is acceptable before restoring.

---

## 4. PM2 Verify

After completing the rollback, run these checks to confirm the system is healthy:

```bash
# Check both processes are online
pm2 status

# Review recent backend logs for errors
pm2 logs velkor-backend --lines 100

# Review recent frontend logs
pm2 logs velkor-frontend --lines 100

# Smoke check — API health
curl -i https://velkor.com.br/api/health

# Smoke check — home page
curl -I https://velkor.com.br

# Smoke check — checkout page
curl -I https://velkor.com.br/checkout

# Smoke check — admin page
curl -I https://velkor.com.br/admin
```

Both PM2 processes must show **online** status. All curl smoke checks must return HTTP 200. If the backend health endpoint still returns an error after rollback, check `pm2 logs velkor-backend` for database connection or startup errors.
