# VOLKERR Rollback Guide

Use este guia quando um deploy quebrar build, inicializacao, auth, checkout, admin, email ou pagamentos.

## Antes de todo deploy

Registre o commit atual:

```bash
cd /var/www/velkor
git rev-parse HEAD
```

Crie backup do banco:

```bash
pg_dump "$DATABASE_URL" > /var/backups/velkor/velkor-$(date +%Y%m%d-%H%M%S).sql
```

Confirme processos atuais:

```bash
pm2 status
curl -i https://volkerr.com.br/api/health
```

## Rollback antes de migrations

Se a falha aconteceu antes de `npm run db:deploy --prefix backend`:

```bash
cd /var/www/velkor
git checkout <commit-anterior>
npm ci --prefix backend
npm ci --prefix frontend
npm run build --prefix frontend
pm2 restart velkor-backend velkor-frontend
curl -i https://volkerr.com.br/api/health
```

## Rollback depois de migrations

Se migrations ja foram aplicadas, nao assuma que o codigo antigo e compativel com o schema novo.

Procedimento seguro:

```bash
pm2 stop velkor-backend velkor-frontend
```

Restaure o backup compativel:

```bash
psql "$DATABASE_URL" < /var/backups/velkor/<backup-compativel>.sql
```

Volte o codigo:

```bash
git checkout <commit-anterior>
npm ci --prefix backend
npm ci --prefix frontend
npm run build --prefix frontend
pm2 restart velkor-backend velkor-frontend
curl -i https://volkerr.com.br/api/health
```

## Admin emergencial

O admin real deve usar sessao e role `ADMIN`.

Se o admin real falhar durante recuperacao, e somente temporariamente:

```bash
nano backend/.env
```

```env
LEGACY_ADMIN_UNLOCK_ENABLED=true
```

Depois:

```bash
pm2 restart velkor-backend
```

Assim que recuperar o admin real:

```env
LEGACY_ADMIN_UNLOCK_ENABLED=false
```

```bash
pm2 restart velkor-backend
```

## Mercado Pago

Se webhooks estiverem gerando estados incorretos:

- desative temporariamente o webhook no painel Mercado Pago;
- preserve logs do backend;
- nao reenvie eventos manualmente sem conferir `PaymentWebhookEvent`;
- corrija o codigo;
- rode testes;
- reative webhook em sandbox antes de producao.

## Email

Se envio real estiver falhando:

- verifique senha de app Gmail;
- confirme `EMAIL_DEV_MODE=false`;
- confira logs sem expor senha;
- se o problema bloquear operacao critica, coloque `EMAIL_DEV_MODE=true` apenas durante recuperacao e comunique que emails reais estao pausados.

## Verificacao apos rollback

```bash
pm2 status
pm2 logs velkor-backend --lines 100
pm2 logs velkor-frontend --lines 100
curl -i https://volkerr.com.br/api/health
curl -I https://volkerr.com.br
```

Teste manualmente:

- login admin;
- carrinho;
- checkout;
- pedido;
- painel admin;
- newsletter.
