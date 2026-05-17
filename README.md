# VELKOR

Loja VOLKERR/VELKOR com frontend Next.js, backend Node.js, PostgreSQL via Prisma, auth real, admin real, email SMTP, Mercado Pago e guias de deploy para VPS Ubuntu.

## Estrutura

- `frontend/`: app Next.js com loja, conta, checkout, admin, SEO, smoke tests e Playwright E2E.
- `backend/`: API Node HTTP com auth, carrinho, wishlist, pedidos, admin, email, newsletter e pagamentos.
- `backend/prisma/`: schema, migrations e seed de produtos/admin/cupons.
- `docs/deploy/`: guia VPS, checklist de producao, rollback e exemplo nginx.
- `docs/superpowers/`: specs e planos historicos das fases implementadas.
- `ecosystem.config.cjs`: processos PM2 de frontend e backend.

## Desenvolvimento Local

Instalar dependencias:

```bash
npm ci --prefix backend
npm ci --prefix frontend
```

Rodar backend:

```bash
npm run start:backend
```

Rodar frontend:

```bash
npm run dev:frontend
```

URLs principais:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001/api/health`

## Variaveis De Ambiente

Copie os exemplos antes de rodar com servicos reais:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Segredos ficam somente em `backend/.env`. Nunca coloque `DATABASE_URL`, `SESSION_SECRET`, Gmail, Mercado Pago access token ou webhook secret no frontend.

## Banco E Seed

Em desenvolvimento:

```bash
npm run db:migrate --prefix backend
npm run db:seed --prefix backend
```

Em producao:

```bash
npm run db:deploy --prefix backend
npm run db:seed --prefix backend
```

O primeiro admin e promovido pelo seed usando:

```env
ADMIN_EMAIL=admin@exemplo.com
ADMIN_PASSWORD=senha-forte-temporaria
```

## Validacao

```bash
npm test
npm run build
npm run e2e --prefix frontend
npm audit --prefix backend --audit-level=moderate
npm audit --prefix frontend --audit-level=moderate
cd backend && npx prisma validate --schema prisma/schema.prisma
```

## Deploy VPS

Use estes arquivos como fonte principal:

- [docs/deploy/VPS-DEPLOY.md](docs/deploy/VPS-DEPLOY.md)
- [docs/deploy/PRODUCTION-CHECKLIST.md](docs/deploy/PRODUCTION-CHECKLIST.md)
- [docs/deploy/ROLLBACK.md](docs/deploy/ROLLBACK.md)
- [docs/deploy/nginx/velkor.conf.example](docs/deploy/nginx/velkor.conf.example)

Dominio de producao previsto: `volkerr.com.br`.

## Git

Branch atual de producao/limpeza:

```bash
chore/project-cleanup-production-ready
```
