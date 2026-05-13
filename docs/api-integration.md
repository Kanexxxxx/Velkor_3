# Guia de integração de APIs — VELKOR

Este documento explica como conectar o site Velkor às APIs reais que você vai usar:

- **Nuvemshop** — catálogo, pedidos e webhooks da loja.
- **Mercado Livre** — catalogação e mensagens em marketplace.
- **Mercado Pago** — captura de pagamento (Pix, cartão, boleto).
- **Gmail** — envio de emails transacionais (boas-vindas, confirmação de pedido, redefinição de senha, atualização de envio).

A versão atual do projeto roda 100% no navegador (`localStorage`) para que você possa demonstrar o fluxo. Esta arquitetura foi pensada para que **toda** persistência migre para o backend sem alterar a UI: cada serviço em `frontend/src/services/*` é a camada que será trocada.

---

## 1. Arquitetura recomendada

```
┌────────────────────────────┐
│ Frontend (Next.js 15 SSR)  │
│ src/services/* (HTTP layer)│
└─────────┬──────────────────┘
          │ fetch (HTTP-only cookies p/ sessão)
┌─────────▼──────────────────┐
│ Backend Node.js / Express  │
│ - /api/auth/*              │
│ - /api/users/*             │
│ - /api/orders/*            │
│ - /api/products/* (proxy)  │
│ - /webhooks/*              │
└─────┬────────────┬─────────┘
      │            │
      │            ├──► Nuvemshop API (OAuth)
      │            ├──► Mercado Livre API (OAuth)
      │            ├──► Mercado Pago API (server token)
      │            └──► Gmail SMTP / Gmail API
      │
      ▼
┌────────────────────────────┐
│ Banco (PostgreSQL/Mongo)   │
│ users · orders · sessions  │
└────────────────────────────┘
```

### Variáveis de ambiente (backend)

Crie/edite `backend/.env` com base em `backend/.env.example`. Adicione:

```dotenv
# Aplicação
VELKOR_PUBLIC_URL=https://seu-dominio-velkor.com
VELKOR_API_URL=https://api.seu-dominio-velkor.com
VELKOR_FRONTEND_ORIGIN=https://seu-dominio-velkor.com
SESSION_SECRET=trocar-por-uma-chave-aleatoria-grande
NODE_ENV=production

# Banco
DATABASE_URL=postgres://user:pass@host:5432/velkor

# Nuvemshop
NUVEMSHOP_CLIENT_ID=...
NUVEMSHOP_CLIENT_SECRET=...
NUVEMSHOP_REDIRECT_URI=https://api.seu-dominio-velkor.com/oauth/nuvemshop/callback
NUVEMSHOP_USER_AGENT=VELKOR (velkor.officiall@gmail.com)

# Mercado Livre
MELI_APP_ID=...
MELI_CLIENT_SECRET=...
MELI_REDIRECT_URI=https://api.seu-dominio-velkor.com/oauth/meli/callback

# Mercado Pago (server access token)
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...
MERCADO_PAGO_WEBHOOK_SECRET=...
MERCADO_PAGO_PUBLIC_KEY=APP_USR-...

# Gmail (escolha UM dos dois)
# Opção A: SMTP App Password
GMAIL_SMTP_USER=velkor.officiall@gmail.com
GMAIL_SMTP_APP_PASSWORD=app-password-de-16-letras
GMAIL_FROM="VELKOR <velkor.officiall@gmail.com>"

# Opção B: Gmail API OAuth (ideal para conta corporativa)
GMAIL_OAUTH_CLIENT_ID=...
GMAIL_OAUTH_CLIENT_SECRET=...
GMAIL_OAUTH_REFRESH_TOKEN=...
```

### Variáveis de ambiente (frontend)

Em `frontend/.env.local` (Next.js):

```dotenv
NEXT_PUBLIC_API_URL=https://api.seu-dominio-velkor.com
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=APP_USR-...
```

> O backend em `backend/src/server.js` é apenas um servidor HTTP nativo de exemplo. **Antes** de integrar APIs reais, troque para Express ou Fastify e adicione `cookie-parser`, `helmet`, `cors` e `pg`.

---

## 2. Nuvemshop

A Nuvemshop usa OAuth 2.0 e suas chamadas autenticadas usam um `access_token` por loja. A documentação oficial está em <https://tiendanube.github.io/api-documentation/intro>.

### 2.1. Habilitar o app

1. Crie um Partner Account em <https://partners.nuvemshop.com.br>.
2. Cadastre um app, definindo `redirect_uri = ${VELKOR_API_URL}/oauth/nuvemshop/callback`.
3. Copie `Client ID` e `Client Secret` e jogue para o `.env`.

### 2.2. Fluxo OAuth (instalação do app na loja)

```
GET https://www.tiendanube.com/apps/<APP_ID>/authorize
    ?response_type=code
    &client_id=NUVEMSHOP_CLIENT_ID
    &state=<csrf>
```

A loja redireciona para `redirect_uri?code=...&state=...`. No backend:

```ts
// backend/routes/oauth-nuvemshop.ts
app.get('/oauth/nuvemshop/callback', async (req, res) => {
  const { code, state } = req.query;
  // valide state contra a sessão (CSRF)
  const tokenRes = await fetch('https://www.tiendanube.com/apps/authorize/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.NUVEMSHOP_CLIENT_ID,
      client_secret: process.env.NUVEMSHOP_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code
    })
  });
  const data = await tokenRes.json();
  // data: { access_token, token_type, scope, user_id }
  await db.upsertNuvemshopStore({
    storeId: data.user_id,
    accessToken: data.access_token,
    scope: data.scope
  });
  res.redirect(`${process.env.VELKOR_PUBLIC_URL}/admin?installed=nuvemshop`);
});
```

### 2.3. Cliente HTTP

```ts
// backend/services/nuvemshop.ts
const BASE = 'https://api.tiendanube.com/v1';

export async function nuvemshopRequest(storeId: number, path: string, init: RequestInit = {}) {
  const store = await db.findNuvemshopStore(storeId);
  const res = await fetch(`${BASE}/${storeId}${path}`, {
    ...init,
    headers: {
      'Authentication': `bearer ${store.accessToken}`,
      'User-Agent': process.env.NUVEMSHOP_USER_AGENT!,
      'Content-Type': 'application/json',
      ...(init.headers ?? {})
    }
  });
  if (!res.ok) throw new Error(`Nuvemshop ${res.status}: ${await res.text()}`);
  return res.json();
}
```

### 2.4. Sincronizar catálogo

Substitua `frontend/src/services/products.ts` por uma chamada ao backend que lista produtos da Nuvemshop com cache.

```ts
// backend/routes/products.ts
app.get('/api/products', async (_req, res) => {
  const storeId = Number(process.env.NUVEMSHOP_STORE_ID);
  const products = await nuvemshopRequest(storeId, '/products?per_page=100');
  res.json(products.map(mapToVelkorProduct));
});

function mapToVelkorProduct(p: any) {
  return {
    id: String(p.id),
    name: p.name.pt ?? p.name.en,
    price: Number(p.variants[0]?.price ?? 0),
    oldPrice: p.variants[0]?.compare_at_price ? Number(p.variants[0].compare_at_price) : undefined,
    image: p.images[0]?.src,
    images: p.images.map((img: any) => img.src),
    sizes: Array.from(new Set(p.variants.flatMap((v: any) => v.values.map((x: any) => x.pt ?? x)))) ,
    colors: [], // mapeie a partir das variants ou metadata
    category: mapCategory(p.categories?.[0]?.handle),
    brand: 'Velkor',
    rating: 5,
    reviews: 0,
    tag: p.tags?.includes('trending') ? 'trending' : 'new'
  };
}
```

E no frontend:

```ts
// frontend/src/services/products.ts
export async function listProducts(): Promise<Product[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/products`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error('Falha ao carregar produtos');
  return res.json();
}
```

> **Migração do array estático:** mova `products` para um arquivo `products.fallback.ts`. Use-o como fallback enquanto a integração não está pronta. Ative gradualmente por feature flag.

### 2.5. Criar pedidos (checkout server-side)

```ts
// backend/routes/orders.ts
app.post('/api/orders', requireSession, async (req, res) => {
  const { items, address, payment, shippingMethod } = req.body;
  const storeId = Number(process.env.NUVEMSHOP_STORE_ID);

  const nuvemshopOrder = await nuvemshopRequest(storeId, '/orders', {
    method: 'POST',
    body: JSON.stringify({
      contact_email: req.session.user.email,
      products: items.map((item) => ({
        variant_id: Number(item.variantId),
        quantity: item.quantity
      })),
      shipping_address: {
        address: address.street,
        number: address.number,
        floor: address.complement,
        locality: address.city,
        zipcode: address.postalCode,
        province: address.region,
        country: address.country,
        first_name: address.recipient,
        last_name: ''
      },
      gateway: payment === 'mercado-pago' ? 'mercadopago' : 'manual'
    })
  });

  await db.createOrder({
    id: nuvemshopOrder.id,
    userId: req.session.user.id,
    items,
    address,
    total: nuvemshopOrder.total,
    status: 'pending'
  });

  res.json(nuvemshopOrder);
});
```

### 2.6. Webhooks

Cadastre webhooks em `https://api.tiendanube.com/v1/{storeId}/webhooks` para `order/paid`, `order/cancelled`, `order/fulfilled`. Cada chamada atualiza o status do pedido e dispara um email transacional (ver seção 5).

```ts
app.post('/webhooks/nuvemshop', verifyNuvemshopSignature, async (req, res) => {
  const { event, id, store_id } = req.body;
  const order = await nuvemshopRequest(store_id, `/orders/${id}`);
  await db.updateOrderStatus(order.id, mapStatus(event));
  if (event === 'order/paid') await mail.sendOrderPaid(order);
  if (event === 'order/fulfilled') await mail.sendOrderShipped(order);
  res.sendStatus(200);
});
```

---

## 3. Mercado Livre

A API Mercado Livre é independente da loja própria — útil se a Velkor for **vender também** dentro do marketplace. Documentação: <https://developers.mercadolivre.com.br>.

### 3.1. App e OAuth

1. Crie o app em <https://developers.mercadolivre.com.br/devcenter/> e copie `App ID` e `Secret Key`.
2. Configure `redirect_uri = ${VELKOR_API_URL}/oauth/meli/callback`.

### 3.2. Fluxo OAuth + refresh

```ts
app.get('/oauth/meli/start', (req, res) => {
  const url = new URL('https://auth.mercadolivre.com.br/authorization');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', process.env.MELI_APP_ID!);
  url.searchParams.set('redirect_uri', process.env.MELI_REDIRECT_URI!);
  res.redirect(url.toString());
});

app.get('/oauth/meli/callback', async (req, res) => {
  const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.MELI_APP_ID!,
      client_secret: process.env.MELI_CLIENT_SECRET!,
      code: String(req.query.code),
      redirect_uri: process.env.MELI_REDIRECT_URI!
    })
  });
  const data = await tokenRes.json();
  await db.upsertMeliCredential({
    userId: data.user_id,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000)
  });
  res.redirect(`${process.env.VELKOR_PUBLIC_URL}/admin?installed=meli`);
});
```

> **Refresh automático:** rode um job (ex.: BullMQ a cada 4h) que renova `access_token` antes de expirar usando `grant_type=refresh_token`.

### 3.3. Publicar produto

```ts
const meli = await meliClient(); // injeta access_token válido
await meli.post('/items', {
  title: 'Tênis Estrato V03 — Carbono',
  category_id: 'MLB1276',
  price: 1599,
  currency_id: 'BRL',
  available_quantity: 30,
  buying_mode: 'buy_it_now',
  condition: 'new',
  listing_type_id: 'gold_special',
  pictures: [{ source: 'https://cdn.seu-dominio-velkor.com/v03-onyx-1.jpg' }],
  attributes: [
    { id: 'BRAND', value_name: 'Velkor' },
    { id: 'MODEL', value_name: 'Estrato V03' }
  ]
});
```

### 3.4. Mensagens e pedidos

- `GET /orders/search?seller={user_id}` — listar pedidos.
- `POST /messages/packs/{packId}/sellers/{sellerId}` — responder cliente.
- Webhooks: cadastre em `https://api.mercadolibre.com/applications/{app_id}/notifications` para receber `orders_v2`, `messages`, `questions`.

---

## 4. Mercado Pago (pagamento)

Mercado Pago é o gateway transacional. Mesmo se você não usar Mercado Livre, pode usar o MP isolado.

### 4.1. SDK no backend

```ts
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

const mp = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN! });
const payment = new Payment(mp);
const preference = new Preference(mp);
```

### 4.2. Criar Preference (Checkout Pro)

```ts
app.post('/api/payments/preferences', requireSession, async (req, res) => {
  const { orderId } = req.body;
  const order = await db.findOrder(orderId);

  const pref = await preference.create({
    body: {
      items: order.items.map((item) => ({
        id: item.productId,
        title: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        currency_id: 'BRL'
      })),
      payer: { email: order.contact.email, name: order.contact.name },
      back_urls: {
        success: `${process.env.VELKOR_PUBLIC_URL}/account?tab=orders&payment=success`,
        failure: `${process.env.VELKOR_PUBLIC_URL}/checkout?payment=failed`,
        pending: `${process.env.VELKOR_PUBLIC_URL}/account?tab=orders&payment=pending`
      },
      auto_return: 'approved',
      notification_url: `${process.env.VELKOR_API_URL}/webhooks/mercado-pago`,
      external_reference: order.id
    }
  });

  res.json({ initPoint: pref.init_point });
});
```

No frontend, redirecione para `initPoint` ao clicar em "Finalizar pedido" quando o método for Mercado Pago.

### 4.3. Webhook

```ts
app.post('/webhooks/mercado-pago', async (req, res) => {
  const { type, data } = req.body;
  if (type === 'payment') {
    const info = await payment.get({ id: data.id });
    await db.updateOrderStatus(info.external_reference, mapMpStatus(info.status));
    if (info.status === 'approved') {
      const order = await db.findOrder(info.external_reference);
      await mail.sendOrderPaid(order);
    }
  }
  res.sendStatus(200);
});
```

### 4.4. Pix Direto (sem Checkout Pro)

```ts
const pix = await payment.create({
  body: {
    transaction_amount: order.total,
    description: `VELKOR ${order.id}`,
    payment_method_id: 'pix',
    payer: { email: order.contact.email }
  }
});
// pix.point_of_interaction.transaction_data.qr_code_base64
```

Renderize o QR Code retornado dentro do checkout quando o usuário escolher Pix.

---

## 5. Email transacional via Gmail

### 5.1. Opção A — Gmail SMTP + App Password (mais simples)

1. Ative 2FA na conta Google.
2. Gere uma "App password" em <https://myaccount.google.com/apppasswords>.
3. Instale `nodemailer`:

```bash
npm install nodemailer
```

```ts
// backend/services/mail.ts
import nodemailer from 'nodemailer';

export const mailer = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_SMTP_USER,
    pass: process.env.GMAIL_SMTP_APP_PASSWORD
  }
});

export async function sendWelcome(user: { email: string; name: string }) {
  return mailer.sendMail({
    from: process.env.GMAIL_FROM,
    to: user.email,
    subject: 'Bem-vindo à VELKOR',
    html: welcomeTemplate(user)
  });
}
```

> **Limites do Gmail:** ~500 envios/dia para contas free e 2.000/dia para Workspace. Para volume maior, troque para SendGrid, Resend ou Amazon SES — a estrutura de templates não muda.

### 5.2. Opção B — Gmail API com OAuth 2.0 (recomendado em Workspace)

1. Crie um projeto em <https://console.cloud.google.com>.
2. Ative a Gmail API.
3. Crie credenciais OAuth (Web Application).
4. Use o playground <https://developers.google.com/oauthplayground> para gerar `refresh_token` com escopo `https://mail.google.com/`.

```ts
import { google } from 'googleapis';
import nodemailer from 'nodemailer';

const oAuth2 = new google.auth.OAuth2(
  process.env.GMAIL_OAUTH_CLIENT_ID,
  process.env.GMAIL_OAUTH_CLIENT_SECRET
);
oAuth2.setCredentials({ refresh_token: process.env.GMAIL_OAUTH_REFRESH_TOKEN });

export async function buildGmailTransport() {
  const { token } = await oAuth2.getAccessToken();
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_SMTP_USER,
      clientId: process.env.GMAIL_OAUTH_CLIENT_ID,
      clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
      accessToken: token!
    }
  });
}
```

### 5.3. Templates obrigatórios

| Template               | Quando dispara                       | Variáveis                  |
| ---------------------- | ------------------------------------ | -------------------------- |
| `welcome`              | Após `/api/auth/register`            | `name`, `email`            |
| `password-reset`       | Após `/api/auth/forgot-password`     | `name`, `resetLink`        |
| `password-changed`     | Após `/api/auth/reset-password`      | `name`, `email`            |
| `order-confirmation`   | Após `Mercado Pago approved`         | `order`, `items`, `total`  |
| `order-shipped`        | Webhook `order/fulfilled`            | `order`, `tracking`        |
| `order-delivered`      | Webhook `order/delivered`            | `order`                    |

Onde `resetLink = `${process.env.VELKOR_PUBLIC_URL}/account/reset-password?token=${token}``. Esse link **já existe** no frontend e funciona — você só precisa enviá-lo por email em vez de logá-lo no console.

### 5.4. Trocar o demo do reset por email real

No frontend, em `frontend/src/app/account/AccountPageClient.tsx`, a função `onForgot` hoje gera o token localmente. Troque por:

```ts
async function onForgot(email: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  if (!res.ok) throw new Error('Falha no envio');
  notify('Enviamos um email com instruções para resetar sua senha.', 'success');
}
```

E no backend:

```ts
app.post('/api/auth/forgot-password', async (req, res) => {
  const user = await db.findUserByEmail(req.body.email);
  if (!user) return res.sendStatus(204); // não revele se o email existe
  const token = crypto.randomBytes(32).toString('hex');
  await db.savePasswordReset(user.id, token, new Date(Date.now() + 30 * 60 * 1000));
  await mail.sendPasswordReset(user, token);
  res.sendStatus(204);
});
```

---

## 6. Migração da camada de dados

Cada arquivo abaixo precisa ser substituído por uma chamada HTTP. As assinaturas dos métodos foram mantidas para que o `AuthProvider`, `CartProvider` e `WishlistProvider` continuem iguais.

| Arquivo (`frontend/src/services`) | O que faz hoje (localStorage)        | O que precisa fazer em produção                       |
| --------------------------------- | ------------------------------------ | ----------------------------------------------------- |
| `auth.ts`                         | CRUD de usuários no `localStorage`   | `POST /api/auth/login`, `register`, `reset`, `me`     |
| `cart.ts`                         | Apenas calcula o total               | Pode ficar — totals são derivados                     |
| `wishlist.ts`                     | Lista de IDs no `localStorage`       | `GET/POST /api/wishlist` (associada ao usuário)       |
| `orders.ts`                       | Lê pedidos do `localStorage`         | `GET /api/orders`, `POST /api/orders`                 |
| `products.ts`                     | Catálogo estático em arquivo TS      | `GET /api/products` (proxy Nuvemshop)                 |
| `checkout.ts`                     | Calcula imposto + cupom no front     | Calcular **no backend** e validar cupom contra o BD   |
| `infoPages.ts`                    | Conteúdo estático                    | Pode virar coleção CMS (Contentful, Sanity)           |

### 6.1. Template do client HTTP

Crie `frontend/src/services/api.ts` (já existe parcialmente) com:

```ts
const API = process.env.NEXT_PUBLIC_API_URL ?? '';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Erro ${res.status}`);
  }
  return res.json() as Promise<T>;
}
```

Use em qualquer service: `await api<User>('/api/users/me')`.

### 6.2. Sessão e cookies

Use **HTTP-only cookies** com `SameSite=Lax` e `Secure=true`. Nunca guarde JWT no `localStorage`. O backend deve emitir o cookie no `POST /api/auth/login` e validá-lo em todas as rotas privadas com middleware `requireSession`.

---

## 7. Checklist de produção

- [ ] Trocar `backend/src/server.js` por Express + Prisma (ou equivalente).
- [ ] Banco com tabelas: `users`, `addresses`, `orders`, `order_items`, `wishlist`, `password_resets`, `sessions`, `nuvemshop_stores`, `meli_credentials`, `mp_payments`.
- [ ] OAuth Nuvemshop instalado e access token persistido.
- [ ] OAuth Mercado Livre + worker de refresh.
- [ ] Mercado Pago Preference + webhook + verificação de assinatura.
- [ ] Gmail SMTP/API + templates listados em 5.3.
- [ ] Substituir `localStorage` por chamadas HTTP nos providers (`AuthProvider`, `WishlistProvider`, `CartProvider`).
- [ ] Habilitar HTTPS, HSTS, CSP, rate-limiting (`express-rate-limit`) e CSRF (`csurf`) nas rotas POST.
- [ ] Configurar `next.config.js` com `images.remotePatterns` para o CDN.
- [ ] Logs estruturados (Pino) + monitoramento (Sentry / Datadog).

> Quando este checklist estiver verde, todas as funcionalidades que hoje rodam em modo demo (login, redefinição, pedidos, favoritos, rastreio) passam a ter backend real sem mudar uma linha de UI.

---

## 8. Referências oficiais

- Nuvemshop API: <https://tiendanube.github.io/api-documentation/intro>
- Mercado Livre Developers: <https://developers.mercadolivre.com.br>
- Mercado Pago SDK Node: <https://github.com/mercadopago/sdk-nodejs>
- Gmail API: <https://developers.google.com/gmail/api>
- Nodemailer: <https://nodemailer.com>
- Next.js App Router: <https://nextjs.org/docs/app>
