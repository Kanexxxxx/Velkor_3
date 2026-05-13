# Guia de Produção e Integrações - VELKOR

Este guia explica como transformar o MVP atual da VELKOR em uma operação real com produtos da Nuvemshop, pagamentos, emails transacionais, banco de dados, backend seguro e deploy.

O projeto atual já tem:

- Frontend em Next.js + TypeScript.
- Backend Node.js simples.
- Carrinho, conta, pedidos e wishlist em modo MVP com `localStorage`.
- Páginas de suporte, marca e políticas.
- `.env.example` para backend e frontend.

Para funcionar de verdade, o próximo passo é mover dados sensíveis e regras de negócio para o backend.

---

## 1. Arquitetura Alvo

```text
Cliente
  |
  v
Frontend Next.js
  - UI da loja
  - carrinho visual
  - checkout
  - conta do usuário
  - chama somente a API própria da VELKOR
  |
  v
Backend Node.js / Express
  - autenticação
  - produtos
  - pedidos
  - pagamentos
  - emails
  - webhooks
  - integração Nuvemshop
  |
  +--> PostgreSQL
  +--> Nuvemshop API
  +--> Mercado Pago API
  +--> Gmail API ou SMTP
```

Regra importante: o frontend nunca deve guardar tokens privados de Nuvemshop, Mercado Pago, Gmail ou banco.

---

## 2. Variáveis de Ambiente

### Backend

Arquivo:

```text
backend/.env
```

Use `backend/.env.example` como base.

Campos essenciais:

```dotenv
VELKOR_APP_NAME=VELKOR
VELKOR_PUBLIC_URL=https://seudominio.com
VELKOR_API_URL=https://api.seudominio.com
VELKOR_FRONTEND_ORIGIN=https://seudominio.com
VELKOR_SUPPORT_EMAIL=velkor.officiall@gmail.com
VELKOR_WHATSAPP=+55 16 99706-2339
VELKOR_INSTAGRAM=https://www.instagram.com/velk.0r/

NODE_ENV=production
PORT=3001
DATABASE_URL=postgres://usuario:senha@host:5432/velkor
SESSION_SECRET=uma-chave-longa-aleatoria
ALLOWED_ORIGINS=https://seudominio.com

NUVEMSHOP_CLIENT_ID=
NUVEMSHOP_CLIENT_SECRET=
NUVEMSHOP_REDIRECT_URI=https://api.seudominio.com/oauth/nuvemshop/callback
NUVEMSHOP_USER_AGENT=VELKOR (velkor.officiall@gmail.com)

MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_PUBLIC_KEY=
MERCADO_PAGO_WEBHOOK_SECRET=

GMAIL_FROM=VELKOR <velkor.officiall@gmail.com>
GMAIL_SMTP_USER=velkor.officiall@gmail.com
GMAIL_SMTP_APP_PASSWORD=
GMAIL_OAUTH_CLIENT_ID=
GMAIL_OAUTH_CLIENT_SECRET=
GMAIL_OAUTH_REFRESH_TOKEN=
```

### Frontend

Arquivo:

```text
frontend/.env.local
```

Use `frontend/.env.example` como base.

```dotenv
NEXT_PUBLIC_API_URL=https://api.seudominio.com
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=
```

Tudo que começa com `NEXT_PUBLIC_` fica visível no navegador. Nunca coloque token privado ali.

---

## 3. Backend Real com Express

O backend atual é um servidor HTTP nativo simples. Para produção, migre para Express mantendo a estrutura leve:

```text
backend/
  src/
    config/
      env.js
    controllers/
      auth.controller.js
      products.controller.js
      orders.controller.js
      payments.controller.js
      webhooks.controller.js
    middlewares/
      auth.middleware.js
      error.middleware.js
      rateLimit.middleware.js
    routes/
      auth.routes.js
      products.routes.js
      orders.routes.js
      payments.routes.js
      webhooks.routes.js
    services/
      nuvemshop.service.js
      mercadoPago.service.js
      gmail.service.js
      orders.service.js
    repositories/
      db.js
      users.repository.js
      orders.repository.js
      products.repository.js
    server.js
```

Dependências recomendadas:

```bash
cd backend
npm install express cors helmet compression cookie-parser express-rate-limit pg zod
npm install mercadopago googleapis nodemailer
npm install -D nodemon
```

Scripts sugeridos:

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "check": "node --check src/server.js",
    "test": "npm run check"
  }
}
```

---

## 4. Banco PostgreSQL

Use PostgreSQL para:

- usuários
- sessões
- endereços
- produtos sincronizados
- pedidos
- pagamentos
- logs de webhook
- tokens OAuth da Nuvemshop criptografados

Modelo mínimo:

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password_hash text not null,
  phone text,
  role text not null default 'customer',
  created_at timestamptz not null default now()
);

create table products (
  id text primary key,
  external_id text,
  source text not null default 'manual',
  name text not null,
  slug text unique,
  category text not null,
  description text,
  price numeric(10,2) not null,
  compare_at_price numeric(10,2),
  image_url text,
  stock integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  status text not null default 'pending',
  payment_status text not null default 'pending',
  total numeric(10,2) not null,
  customer_email text not null,
  customer_name text not null,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id text references products(id),
  name text not null,
  quantity integer not null,
  unit_price numeric(10,2) not null
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  provider text not null,
  provider_payment_id text,
  provider_preference_id text,
  status text not null,
  raw jsonb,
  created_at timestamptz not null default now()
);

create table integration_tokens (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  store_id text,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text,
  event_type text,
  payload jsonb not null,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);
```

---

## 5. Integração com Nuvemshop

Objetivo:

- puxar produtos reais
- sincronizar estoque
- receber webhooks de produtos e pedidos
- manter o frontend usando `/api/products`

A Nuvemshop usa OAuth 2.0 em uma implementação de Authorization Code. A API REST usa JSON e endpoints por loja.

Fluxo recomendado:

1. Criar app no painel de parceiros da Nuvemshop.
2. Configurar redirect URI:

```text
https://api.seudominio.com/oauth/nuvemshop/callback
```

3. Criar rota para iniciar instalação:

```text
GET /oauth/nuvemshop/start
```

4. Redirecionar o lojista para autorização.
5. Receber `code` no callback.
6. Trocar `code` por `access_token`.
7. Salvar token criptografado no banco.
8. Usar token para buscar produtos:

```text
GET /api/nuvemshop/products/sync
```

9. Gravar produtos normalizados na tabela `products`.
10. Frontend continua lendo produtos via API própria:

```text
GET /api/products
```

Mapeamento de produto:

```text
Nuvemshop product.id       -> products.external_id
Nuvemshop product.name     -> products.name
Nuvemshop variants.price   -> products.price
Nuvemshop images.src       -> products.image_url
Nuvemshop variants.stock   -> products.stock
```

Rotas sugeridas:

```text
GET  /oauth/nuvemshop/start
GET  /oauth/nuvemshop/callback
POST /api/integrations/nuvemshop/sync-products
POST /webhooks/nuvemshop
GET  /api/products
GET  /api/products/:id
```

Cuidados:

- Use `state` no OAuth para evitar CSRF.
- Nunca exponha `NUVEMSHOP_CLIENT_SECRET` no frontend.
- Armazene tokens criptografados.
- Registre webhooks recebidos antes de processar.
- Faça retry para falhas temporárias.

Documentação oficial:

- https://tiendanube.github.io/api-documentation/v1/intro
- https://tiendanube.github.io/api-documentation/v1/authentication

---

## 6. Integração de Pagamentos com Mercado Pago

Para MVP real, comece com Checkout Pro. Ele redireciona o cliente para o ambiente seguro do Mercado Pago e reduz risco de lidar com dados sensíveis de cartão.

Fluxo recomendado:

1. Cliente finaliza checkout no frontend.
2. Frontend chama:

```text
POST /api/payments/mercado-pago/preference
```

3. Backend cria pedido `pending`.
4. Backend cria uma preferência no Mercado Pago.
5. Backend retorna `init_point` ou `sandbox_init_point`.
6. Frontend redireciona o cliente.
7. Mercado Pago envia webhook para:

```text
POST /webhooks/mercado-pago
```

8. Backend consulta o pagamento na API do Mercado Pago.
9. Backend atualiza `orders.payment_status`.
10. Backend envia email de confirmação.

Rotas sugeridas:

```text
POST /api/payments/mercado-pago/preference
POST /webhooks/mercado-pago
GET  /api/orders/:id/payment-status
```

Exemplo de payload interno:

```json
{
  "items": [
    {
      "productId": "v01",
      "name": "Estrato V03 - Carbono",
      "quantity": 1,
      "unitPrice": 285
    }
  ],
  "customer": {
    "name": "Cliente VELKOR",
    "email": "cliente@email.com"
  },
  "shippingAddress": {
    "street": "Rua Exemplo",
    "number": "100",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01000-000"
  }
}
```

Cuidados:

- `MERCADO_PAGO_ACCESS_TOKEN` fica só no backend.
- Valide o webhook antes de confiar nele.
- Após webhook, consulte o pagamento diretamente na API do Mercado Pago.
- Não marque pedido como pago apenas pelo retorno do navegador.
- Use credenciais de teste antes da produção.

Documentação oficial:

- https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/create-payment-preference
- https://www.mercadopago.com.br/developers/en/docs/checkout-pro/additional-content/notifications/webhooks

---

## 7. Integração com Gmail

Use Gmail para emails transacionais:

- boas-vindas
- confirmação de pedido
- pagamento aprovado
- pagamento pendente
- envio/rastreio
- redefinição de senha
- suporte recebido

Opções:

### Opção A: SMTP com App Password

Mais simples para começar.

Requisitos:

- Conta Gmail com verificação em duas etapas.
- Senha de app criada no Google.
- Variáveis:

```dotenv
GMAIL_SMTP_USER=velkor.officiall@gmail.com
GMAIL_SMTP_APP_PASSWORD=
GMAIL_FROM=VELKOR <velkor.officiall@gmail.com>
```

Use `nodemailer`.

### Opção B: Gmail API OAuth

Mais robusta para operação profissional.

Requisitos:

- Projeto no Google Cloud.
- Gmail API habilitada.
- OAuth consent configurado.
- Client ID, Client Secret e Refresh Token.

Variáveis:

```dotenv
GMAIL_OAUTH_CLIENT_ID=
GMAIL_OAUTH_CLIENT_SECRET=
GMAIL_OAUTH_REFRESH_TOKEN=
```

Rotas internas:

```text
POST /api/emails/test
POST /api/emails/order-confirmation
POST /api/emails/password-reset
```

Cuidados:

- Nunca envie email direto do frontend.
- Rate limit nas rotas de email.
- Logue apenas metadados, nunca corpo sensível completo.
- Templates devem ficar no backend.

Documentação oficial:

- https://developers.google.com/gmail/api/guides/sending
- https://developers.google.com/gmail/api/guides

---

## 8. Autenticação Real

O MVP atual usa `localStorage`. Para produção:

- senha com `bcrypt` ou `argon2`
- sessão em cookie `HttpOnly`, `Secure`, `SameSite=Lax`
- tabela de usuários
- tabela de sessões ou JWT curto + refresh token
- proteção de `/admin` por role

Rotas:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/password-reset/request
POST /api/auth/password-reset/confirm
```

Frontend muda pouco: os services de auth passam a chamar API em vez de `localStorage`.

---

## 9. Admin Real

Antes de produção, `/admin` precisa:

- exigir login
- exigir `role = admin`
- ser server-side protegido
- nunca depender só de ocultar botão no frontend

Funcionalidades mínimas:

- ver pedidos
- mudar status de pedido
- ver pagamento
- sincronizar produtos Nuvemshop
- ver falhas de webhook
- reenviar email de pedido

Rotas:

```text
GET  /api/admin/orders
PATCH /api/admin/orders/:id/status
POST /api/admin/products/sync
GET  /api/admin/webhook-events
POST /api/admin/emails/:orderId/resend-confirmation
```

---

## 10. Checkout Real

Fluxo seguro:

```text
Frontend monta carrinho
  -> POST /api/orders/draft
  -> Backend valida preço e estoque no banco
  -> Backend cria pedido pending
  -> Backend cria preferência Mercado Pago
  -> Frontend redireciona
  -> Webhook confirma pagamento
  -> Backend atualiza pedido
  -> Backend envia email
```

O backend deve recalcular preço e estoque. Nunca confie no total enviado pelo navegador.

---

## 11. Webhooks

Crie webhooks para:

```text
POST /webhooks/mercado-pago
POST /webhooks/nuvemshop
```

Boas práticas:

- validar assinatura quando o provedor disponibilizar
- salvar evento bruto em `webhook_events`
- processar de forma idempotente
- evitar processar o mesmo evento duas vezes
- responder rápido com 200
- processar lógica pesada em fila futuramente

---

## 12. Deploy Recomendado

### Frontend

Vercel é o caminho mais simples para Next.js.

Checklist:

- configurar `NEXT_PUBLIC_API_URL`
- rodar `npm run build`
- validar `/sitemap.xml`
- validar `/robots.txt`
- conectar domínio

### Backend

Pode rodar em:

- Render
- Railway
- Fly.io
- VPS
- AWS/GCP/Azure

Checklist:

- configurar `.env` no painel da plataforma
- ativar HTTPS
- configurar CORS para o domínio do frontend
- configurar logs
- configurar backup do banco

### Banco

Opções:

- Neon
- Supabase Postgres
- Railway Postgres
- Render Postgres
- RDS

---

## 13. Ordem de Implementação Recomendada

Não tente fazer tudo de uma vez. A ordem mais segura:

1. Migrar backend para Express.
2. Criar PostgreSQL e tabelas.
3. Criar auth real.
4. Migrar produtos locais para `/api/products`.
5. Integrar Nuvemshop e sincronizar produtos.
6. Criar pedidos reais no backend.
7. Integrar Mercado Pago Checkout Pro em sandbox.
8. Implementar webhooks de pagamento.
9. Integrar Gmail SMTP ou API.
10. Proteger admin.
11. Testar fluxo completo ponta a ponta.
12. Deploy em staging.
13. Deploy produção.

---

## 14. Checklist de Produção

Antes de abrir para clientes:

- [ ] Backend Express em produção
- [ ] PostgreSQL configurado
- [ ] `.env` real configurado fora do git
- [ ] Auth com cookie seguro
- [ ] Admin protegido
- [ ] Produtos vindos da Nuvemshop ou banco
- [ ] Estoque validado no backend
- [ ] Mercado Pago em sandbox testado
- [ ] Webhook de pagamento validado
- [ ] Gmail enviando emails
- [ ] Políticas revisadas
- [ ] Domínio com HTTPS
- [ ] CORS restrito
- [ ] Rate limit ativo
- [ ] Logs e backup configurados
- [ ] Smoke test passando
- [ ] Compra teste completa realizada

---

## 15. O Que Não Fazer

- Não colocar token do Mercado Pago no frontend.
- Não usar `localStorage` como segurança real.
- Não confiar em preço enviado pelo navegador.
- Não marcar pedido como pago sem webhook ou consulta ao provedor.
- Não publicar `.env`.
- Não deixar `/admin` aberto em produção.
- Não enviar email direto do frontend.

---

## 16. Próximo Passo Prático

O primeiro passo de código deve ser transformar `backend/src/server.js` em uma API Express organizada:

```text
backend/src/
  config/env.js
  routes/index.js
  routes/products.routes.js
  routes/payments.routes.js
  routes/webhooks.routes.js
  services/mercadoPago.service.js
  services/nuvemshop.service.js
  services/gmail.service.js
  repositories/db.js
  server.js
```

Depois disso, o frontend passa a consumir `NEXT_PUBLIC_API_URL` e as funcionalidades deixam de depender de dados fixos ou `localStorage`.
