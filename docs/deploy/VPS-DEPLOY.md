# Deploy VELKOR na VPS — Guia Completo

Stack: Ubuntu 22.04 LTS · Node.js 20 LTS · nginx · PM2 · Let's Encrypt (Certbot)

---

## Pré-requisitos

- VPS com acesso root via SSH
- Domínio apontando para o IP da VPS (ex.: `velkor.com.br` → A record)
- Node.js 20+ instalado
- npm 10+ instalado

```bash
# Verificar versões
node -v   # v20.x.x ou superior
npm -v    # 10.x.x ou superior
```

---

## 1. Instalar dependências do servidor

```bash
# PM2 — gerenciador de processos Node.js
npm install -g pm2

# Certbot — certificado SSL gratuito via Let's Encrypt
apt update && apt install -y certbot python3-certbot-nginx nginx
```

---

## 2. Clonar o repositório

```bash
cd /var/www
git clone <url-do-repositorio> velkor
cd velkor
```

---

## 3. Configurar variáveis de ambiente

### Backend

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Preencher obrigatoriamente:

```env
NODE_ENV=production
PORT=3001
VELKOR_APP_NAME=VELKOR
VELKOR_PUBLIC_URL=https://velkor.com.br
VELKOR_SUPPORT_EMAIL=velkor.officiall@gmail.com
VELKOR_WHATSAPP=+55 16 99706-2339
VELKOR_INSTAGRAM=https://www.instagram.com/velk.0r/

# Origens permitidas no CORS (separadas por vírgula, sem espaços)
ALLOWED_ORIGINS=https://velkor.com.br

# CRÍTICO: senha do painel admin — nunca usar NEXT_PUBLIC_
ADMIN_SECRET=<gere-uma-senha-forte-com-openssl-rand-base64-32>
```

Gerar `ADMIN_SECRET` seguro:
```bash
openssl rand -base64 32
```

### Frontend

```bash
cp frontend/.env.example frontend/.env.local
nano frontend/.env.local
```

```env
# Atenção: SEM /api no final — o frontend já acrescenta /api em cada chamada
# Ex.: fetch(`${NEXT_PUBLIC_API_URL}/api/health`) → https://velkor.com.br/api/health
NEXT_PUBLIC_API_URL=https://velkor.com.br
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=<sua-chave-publica-mp>
# Opcional — analytics
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_META_PIXEL_ID=XXXXXXXXXXXXXXXXXX
```

---

## 4. Build do frontend

```bash
cd /var/www/velkor/frontend
npm ci --omit=dev
npm run build
```

O build gera a pasta `frontend/.next/` com os arquivos estáticos e SSR.

---

## 5. Iniciar serviços com PM2

```bash
cd /var/www/velkor

# Backend (Node.js puro — sem build necessário)
pm2 start backend/src/server.js --name velkor-backend --cwd backend

# Frontend (Next.js em modo produção)
pm2 start "npm run start" --name velkor-frontend --cwd frontend

# Salvar configuração para reiniciar após reboot
pm2 save
pm2 startup   # seguir as instruções que aparecerem no terminal
```

Verificar status:
```bash
pm2 status
pm2 logs velkor-backend --lines 50
pm2 logs velkor-frontend --lines 50
```

Portas em uso:
- Frontend: `3000`
- Backend: `3001`
- nginx: `80` (HTTP → redirect) e `443` (HTTPS)

---

## 6. Configurar nginx

```bash
nano /etc/nginx/sites-available/velkor
```

Colar a configuração abaixo (substituir `velkor.com.br` pelo domínio real):

```nginx
server {
    listen 80;
    server_name velkor.com.br www.velkor.com.br;
    # Certbot vai adicionar redirect HTTPS aqui automaticamente
}

server {
    listen 443 ssl;
    server_name velkor.com.br www.velkor.com.br;

    # Certificado SSL (preenchido pelo Certbot)
    ssl_certificate     /etc/letsencrypt/live/velkor.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/velkor.com.br/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Segurança
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    # Tamanho máximo de upload
    client_max_body_size 10M;

    # IP real quando atrás do nginx (necessário para rate limiting)
    set_real_ip_from 127.0.0.1;
    real_ip_header X-Forwarded-For;

    # Rotas de API → backend Node.js
    location /api/ {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 10s;
    }

    # Tudo mais → frontend Next.js
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        'upgrade';
        proxy_set_header   Host              $host;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ativar e testar:
```bash
ln -s /etc/nginx/sites-available/velkor /etc/nginx/sites-enabled/
nginx -t          # deve retornar: syntax is ok / test is successful
systemctl reload nginx
```

---

## 7. Certificado SSL com Certbot

```bash
certbot --nginx -d velkor.com.br -d www.velkor.com.br
```

O Certbot edita automaticamente o arquivo nginx e configura renovação automática.

Testar renovação automática:
```bash
certbot renew --dry-run
```

---

## 8. Verificação pós-deploy

```bash
# Backend health check
curl https://velkor.com.br/api/health
# Resposta esperada: {"status":"ok","service":"velkor-backend"}

# Testar CORS (deve retornar 403 para origem desconhecida)
curl -H "Origin: https://evil.com" https://velkor.com.br/api/health -v

# Testar rate limit newsletter (6ª requisição deve retornar 429)
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://velkor.com.br/api/newsletter \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}'
done

# Frontend smoke test (requer servidor rodando)
cd /var/www/velkor/frontend
SMOKE_BASE_URL=https://velkor.com.br node scripts/smoke.mjs
```

---

## 9. Atualizações futuras

```bash
cd /var/www/velkor

# 1. Puxar mudanças
git pull origin main

# 2. Rebuild do frontend (se houver mudanças)
cd frontend && npm ci --omit=dev && npm run build && cd ..

# 3. Reiniciar processos
pm2 restart velkor-backend velkor-frontend
```

---

## 10. Backup do newsletter.json

O arquivo `backend/data/newsletter.json` é persistido em disco. Configure um cron de backup:

```bash
crontab -e
```

Adicionar linha (backup diário às 3h para `/var/backups/velkor/`):
```cron
0 3 * * * cp /var/www/velkor/backend/data/newsletter.json /var/backups/velkor/newsletter-$(date +\%Y\%m\%d).json
```

Criar diretório de backup:
```bash
mkdir -p /var/backups/velkor
```

---

## Checklist de variáveis de produção

Antes de abrir para o público, confirmar que cada variável está configurada:

### Backend `backend/.env`
- [ ] `NODE_ENV=production`
- [ ] `PORT=3001`
- [ ] `ALLOWED_ORIGINS=https://velkor.com.br` (sem trailing slash, sem espaços)
- [ ] `ADMIN_SECRET=<senha forte gerada com openssl>`
- [ ] `VELKOR_PUBLIC_URL=https://velkor.com.br`
- [ ] `VELKOR_SUPPORT_EMAIL=<email real>`

### Frontend `frontend/.env.local`
- [ ] `NEXT_PUBLIC_API_URL=https://velkor.com.br` (sem /api no final)
- [ ] `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=<chave pública MP>`
- [ ] Analytics IDs (opcional mas recomendado)

### nginx
- [ ] Certificado SSL ativo e válido (`certbot renew --dry-run` sem erros)
- [ ] Redirect HTTP → HTTPS funcionando
- [ ] Header `Strict-Transport-Security` presente
- [ ] `client_max_body_size` configurado
- [ ] `real_ip_header X-Forwarded-For` configurado (para rate limiting funcionar)

### PM2
- [ ] `pm2 save` executado após configurar processos
- [ ] `pm2 startup` executado (reinicia automaticamente após reboot)

---

## Portas e serviços

| Serviço | Porta | Acesso externo |
|---|---|---|
| nginx | 80, 443 | Sim (público) |
| Next.js (frontend) | 3000 | Não (apenas via nginx) |
| Node.js (backend) | 3001 | Não (apenas via nginx) |

As portas 3000 e 3001 **não devem ser abertas no firewall da VPS**. Apenas nginx fica exposto.

```bash
# Configurar firewall (UFW)
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
ufw status
```
