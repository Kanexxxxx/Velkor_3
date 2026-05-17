# VOLKERR Production Checklist

Use este checklist antes de abrir trafego real.

## Codigo e segredos

- [ ] Branch correta: `chore/project-cleanup-production-ready`.
- [ ] `git status --short` limpo antes do deploy.
- [ ] Nenhum `.env`, senha, token Gmail ou token Mercado Pago commitado.
- [ ] Commit atual registrado com `git rev-parse HEAD`.
- [ ] Backup PostgreSQL criado antes de migrations.

## Backend env

- [ ] `NODE_ENV=production`.
- [ ] `PORT=3001`.
- [ ] `DATABASE_URL` aponta para PostgreSQL real.
- [ ] `SESSION_SECRET` gerado com 64 bytes aleatorios.
- [ ] `ALLOWED_ORIGINS=https://velkor.com.br,https://www.velkor.com.br`.
- [ ] `VELKOR_PUBLIC_URL=https://velkor.com.br`.
- [ ] `ADMIN_EMAIL` configurado para o primeiro admin.
- [ ] `ADMIN_PASSWORD` temporaria forte configurada apenas para seed inicial.
- [ ] `LEGACY_ADMIN_UNLOCK_ENABLED=false`.
- [ ] `EMAIL_DEV_MODE=false`.
- [ ] `GMAIL_HOST`, `GMAIL_PORT`, `GMAIL_USER`, `GMAIL_PASS`, `EMAIL_FROM` configurados.
- [ ] `MERCADO_PAGO_DEV_MODE=false`.
- [ ] `MERCADO_PAGO_ACCESS_TOKEN` configurado.
- [ ] `MERCADO_PAGO_WEBHOOK_SECRET` configurado.

## Frontend env

- [ ] `NEXT_PUBLIC_API_URL=https://velkor.com.br`.
- [ ] `NEXT_PUBLIC_BRAND_SITE_URL=https://velkor.com.br`.
- [ ] `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` configurado.
- [ ] Analytics configurado somente se a conta real ja estiver pronta.
- [ ] Nenhum segredo sem prefixo `NEXT_PUBLIC_` no frontend.

## Banco

- [ ] PostgreSQL esta acessivel pela VPS.
- [ ] `npm run db:deploy --prefix backend` executado.
- [ ] `npm run db:seed --prefix backend` executado.
- [ ] Primeiro usuario admin consegue fazer login real.
- [ ] `emailVerified` e roles estao coerentes para o admin.

## Build e processos

- [ ] `npm ci --prefix backend` executado.
- [ ] `npm ci --prefix frontend` executado.
- [ ] `npm run build --prefix frontend` executado.
- [ ] `pm2 start ecosystem.config.cjs --env production` executado.
- [ ] `pm2 save` executado.
- [ ] `pm2 startup` configurado.
- [ ] `pm2 status` mostra `velkor-backend` e `velkor-frontend` online.

## nginx, SSL e seguranca

- [ ] `/etc/nginx/sites-available/velkor` baseado em `docs/deploy/nginx/velkor.conf.example`.
- [ ] `nginx -t` sem erros.
- [ ] Certbot emitiu certificado valido.
- [ ] `certbot renew --dry-run` sem erros.
- [ ] HTTP redireciona para HTTPS.
- [ ] Apenas portas `22`, `80` e `443` abertas no firewall.
- [ ] Headers de seguranca presentes.
- [ ] Cookies de sessao funcionam em HTTPS.

## Smoke tecnico

- [ ] `curl -i https://velkor.com.br/api/health` retorna sucesso.
- [ ] `curl -I https://velkor.com.br` retorna sucesso.
- [ ] `curl -I https://velkor.com.br/robots.txt` retorna sucesso.
- [ ] `curl -I https://velkor.com.br/sitemap.xml` retorna sucesso.
- [ ] `SMOKE_BASE_URL=https://velkor.com.br npm run smoke --prefix frontend` passa.

## Fluxos manuais

- [ ] Cadastro.
- [ ] Login/logout.
- [ ] Reset de senha por email.
- [ ] Verificacao de email.
- [ ] Carrinho persistente.
- [ ] Favoritos persistentes.
- [ ] Checkout com pedido persistido.
- [ ] Confirmacao de pedido por email.
- [ ] Mercado Pago sandbox cria preference e redireciona.
- [ ] Webhook Mercado Pago atualiza pagamento/pedido.
- [ ] Admin real acessa painel.
- [ ] Usuario comum nao acessa rotas admin.
- [ ] Admin altera status de pedido.
- [ ] Admin gerencia usuarios.
- [ ] Admin gerencia cupons.
- [ ] Admin gerencia newsletter sem envio em massa.
- [ ] Newsletter opt-in.
- [ ] Unsubscribe.

## Qualidade final

- [ ] `npm test` passa.
- [ ] `npm run build` passa.
- [ ] `npm run e2e --prefix frontend` passa em desktop e mobile.
- [ ] `npm audit --prefix backend --audit-level=moderate` sem vulnerabilidades moderadas/altas.
- [ ] `npm audit --prefix frontend --audit-level=moderate` sem vulnerabilidades moderadas/altas.
- [ ] `cd backend && npx prisma validate --schema prisma/schema.prisma` passa.
- [ ] Smoke real em producao executado depois do deploy.

## Rollback

- [ ] Commit anterior registrado.
- [ ] Backup de banco disponivel.
- [ ] `docs/deploy/ROLLBACK.md` lido antes do deploy.
- [ ] Responsavel sabe como desligar webhook Mercado Pago temporariamente.
- [ ] Responsavel sabe como reativar `LEGACY_ADMIN_UNLOCK_ENABLED=true` apenas em emergencia.
