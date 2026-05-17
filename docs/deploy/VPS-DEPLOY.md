# Deploy VOLKERR em VPS Ubuntu

Stack de producao: Ubuntu 22.04/24.04 LTS, Node.js 20 LTS, PostgreSQL, PM2, nginx e Certbot.

Este guia assume que o dominio `volkerr.com.br` aponta para o IP da VPS. Troque o dominio em todos os exemplos quando necessario.

## 1. Preparar servidor

```bash
apt update
apt install -y git curl nginx certbot python3-certbot-nginx postgresql postgresql-contrib

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

npm install -g pm2

node -v
npm -v
pm2 -v
```

Exponha somente SSH, HTTP e HTTPS:

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

As portas internas `3000` e `3001` nao devem ser abertas publicamente.

## 2. Banco PostgreSQL

Crie banco e usuario com senha forte:

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE velkor;
CREATE USER velkor_user WITH ENCRYPTED PASSWORD 'troque-esta-senha';
GRANT ALL PRIVILEGES ON DATABASE velkor TO velkor_user;
\q
```

Guarde a URL:

```env
DATABASE_URL=postgresql://velkor_user:troque-esta-senha@127.0.0.1:5432/velkor
```

## 3. Clonar projeto

```bash
mkdir -p /var/www
cd /var/www
git clone <url-do-repositorio> velkor
cd /var/www/velkor
git checkout chore/project-cleanup-production-ready
```

Antes de cada deploy, registre o commit atual para rollback:

```bash
git rev-parse HEAD
```

## 4. Configurar envs

### Backend

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Valores obrigatorios de producao:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://velkor_user:troque-esta-senha@127.0.0.1:5432/velkor
SESSION_SECRET=<gere-com-64-bytes-aleatorios>
ALLOWED_ORIGINS=https://volkerr.com.br,https://www.volkerr.com.br
VELKOR_PUBLIC_URL=https://volkerr.com.br

ADMIN_EMAIL=<email-do-primeiro-admin>
ADMIN_PASSWORD=<senha-forte-temporaria>
LEGACY_ADMIN_UNLOCK_ENABLED=false

GMAIL_HOST=smtp.gmail.com
GMAIL_PORT=587
GMAIL_USER=<conta-gmail>
GMAIL_PASS=<senha-de-app-gmail>
EMAIL_FROM=VELKOR <conta-gmail>
EMAIL_DEV_MODE=false

MERCADO_PAGO_ACCESS_TOKEN=<access-token>
MERCADO_PAGO_WEBHOOK_SECRET=<segredo-do-webhook>
MERCADO_PAGO_DEV_MODE=false
```

Gerar `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Frontend

```bash
cp frontend/.env.example frontend/.env.local
nano frontend/.env.local
```

```env
NEXT_PUBLIC_API_URL=https://volkerr.com.br
NEXT_PUBLIC_BRAND_SITE_URL=https://volkerr.com.br
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=<public-key-mercado-pago>
```

Nao coloque `DATABASE_URL`, `SESSION_SECRET`, Gmail, Mercado Pago access token ou webhook secret no frontend.

## 5. Instalar dependencias

```bash
npm ci --prefix backend
npm ci --prefix frontend
```

## 6. Migrar banco e criar admin inicial

Use `migrate deploy` em producao:

```bash
npm run db:deploy --prefix backend
npm run db:seed --prefix backend
```

O seed usa `ADMIN_EMAIL` e `ADMIN_PASSWORD` para promover/criar o primeiro usuario admin. Troque a senha depois pelo fluxo real de auth.

## 7. Build do frontend

```bash
npm run build --prefix frontend
```

## 8. PM2

Inicie backend e frontend pelo arquivo versionado:

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

Siga o comando que o `pm2 startup` imprimir.

Comandos uteis:

```bash
pm2 status
pm2 logs velkor-backend --lines 100
pm2 logs velkor-frontend --lines 100
pm2 restart velkor-backend velkor-frontend
```

## 9. nginx

Copie a configuracao exemplo:

```bash
cp docs/deploy/nginx/velkor.conf.example /etc/nginx/sites-available/velkor
nano /etc/nginx/sites-available/velkor
```

Confirme dominio e caminhos SSL. Na primeira instalacao, antes do Certbot emitir o certificado, voce pode deixar somente o bloco HTTP ou rodar Certbot com nginx para ele preencher SSL.

Ative o site:

```bash
ln -s /etc/nginx/sites-available/velkor /etc/nginx/sites-enabled/velkor
nginx -t
systemctl reload nginx
```

## 10. SSL com Certbot

```bash
certbot --nginx -d volkerr.com.br -d www.volkerr.com.br
certbot renew --dry-run
nginx -t
systemctl reload nginx
```

## 11. Smoke tests pos-deploy

```bash
curl -i https://volkerr.com.br/api/health
curl -I https://volkerr.com.br
curl -I https://volkerr.com.br/robots.txt
curl -I https://volkerr.com.br/sitemap.xml
```

Frontend smoke:

```bash
cd /var/www/velkor/frontend
SMOKE_BASE_URL=https://volkerr.com.br npm run smoke
```

Fluxos manuais obrigatorios antes de abrir trafego real:

- cadastro, login, logout e reset de senha
- verificacao de email
- carrinho, checkout e pedido
- Mercado Pago sandbox com webhook publico configurado
- painel admin com usuario `ADMIN`
- alteracao de status de pedido
- cupons
- newsletter opt-in e unsubscribe
- responsividade mobile/desktop

## 12. Atualizar deploy existente

```bash
cd /var/www/velkor
git fetch origin
git rev-parse HEAD
git pull origin chore/project-cleanup-production-ready

npm ci --prefix backend
npm ci --prefix frontend
npm run db:deploy --prefix backend
npm run build --prefix frontend
pm2 restart velkor-backend velkor-frontend

curl -i https://volkerr.com.br/api/health
```

## 13. Auditoria antes de producao real

Rode localmente e/ou na VPS:

```bash
npm test
npm run build
npm run e2e --prefix frontend
npm audit --prefix backend --audit-level=moderate
npm audit --prefix frontend --audit-level=moderate
cd backend && npx prisma validate --schema prisma/schema.prisma
```

Os testes E2E cobrem login/cadastro, carrinho, checkout, navbar/footer e responsividade em desktop e mobile.

## 14. Rollback

Use `docs/deploy/ROLLBACK.md` como procedimento operacional.

Resumo rapido antes de migrations:

```bash
cd /var/www/velkor
git checkout <commit-anterior>
npm ci --prefix backend
npm ci --prefix frontend
npm run build --prefix frontend
pm2 restart velkor-backend velkor-frontend
```

Depois de migrations, restaure backup do PostgreSQL antes de voltar codigo quando houver incompatibilidade de schema.
