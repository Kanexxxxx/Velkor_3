# VELKOR Security and Privacy Audit

Audit date: 2026-05-12

## Sensitive Files Reviewed

Checked for real environment files outside ignored dependency/build folders:

- `.env`
- `.env.local`
- `.env.production`
- `.env.development`

Result: no real environment file was found in the project tree. `backend/.env.example` is present and contains only public placeholders and official brand contacts.

## Secrets and Credentials

Search coverage included common secret markers such as tokens, API keys, private credentials, password references, public API env names, debug routes, and temporary markers.

Result:

- No real token, private key, API secret, password, or production credential was found.
- Documentation contains placeholder examples for future integrations. These are not real credentials and should stay as examples only.

## Dependency Audit

Frontend:

- `npm audit --json` reports 2 moderate vulnerabilities.
- The advisory path is `next` -> bundled `postcss`.
- The automatic fix suggested by npm is not safe because it proposes a major downgrade to `next@9.3.3`.
- No forced downgrade was applied.

Backend:

- `npm audit --json` reports 0 vulnerabilities.

## Frontend Security Review

Checked:

- `dangerouslySetInnerHTML`
- iframe usage
- inline external scripts
- `eval`
- external links with `target="_blank"`
- public admin route
- localStorage usage

Findings:

- No `dangerouslySetInnerHTML` usage found.
- No iframe usage found.
- No unsafe external script tags found.
- No `eval` usage found.
- External social links now use `rel="noopener noreferrer"`.
- `/admin` is now marked `noindex, nofollow`.
- `localStorage` is used for MVP auth/session/cart/wishlist/orders. This is not production-grade security.

## Security Improvements Applied

- Added HTTP security headers through `frontend/next.config.ts`:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- Added `robots.txt` generation and disallowed `/admin` and `/account/reset-password`.
- Added `sitemap.xml` generation for main commercial and policy routes.
- Added `noindex, nofollow` metadata to `/admin`.
- Confirmed `.gitignore` ignores `.env` and `.env.*` while allowing `.env.example`.

## Privacy and LGPD Review

Reviewed support, contact, privacy, terms, refund, shipping, FAQ, cookies, and brand pages.

Current status:

- Official brand contacts are centralized in `frontend/src/services/brand.ts`.
- The site uses VELKOR branding consistently.
- Privacy content gives LGPD direction and support contact.
- Cookie content explains local storage/cookies at a high level.
- Refund and shipping policies are separated and accessible.
- Contact page uses official WhatsApp, email, and Instagram references.

## Official Brand Data

- Brand: VELKOR
- Instagram: https://www.instagram.com/velk.0r/
- Support email: velkor.officiall@gmail.com
- WhatsApp: +55 16 99706-2339

## Remaining Security Risks

- `/admin` is not a real secure admin panel. It is a local MVP dashboard and must be protected by backend authentication before production.
- Auth is localStorage-based and suitable only for demo/MVP behavior.
- Orders are localStorage-based and should move to server persistence.
- Mercado Pago is not integrated with a secure backend flow yet.
- Real LGPD compliance should be reviewed by a qualified legal professional before launch.
- Dependency advisories remain pending until a safe upstream package path is available.

## Final Security Checklist

- [x] No real `.env` file found
- [x] `.env` patterns ignored in git
- [x] No real secrets found in source scan
- [x] External links hardened with `noopener noreferrer`
- [x] Basic security headers added
- [x] Admin route noindexed
- [x] Robots route added
- [x] Sitemap route added
- [x] Policies and support routes accessible
- [ ] Server-side admin authentication
- [ ] Server-side user/session management
- [ ] PostgreSQL persistence
- [ ] Payment backend with webhook validation
- [ ] Legal review for LGPD and consumer-law language
