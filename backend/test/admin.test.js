const assert = require('node:assert/strict');
const test = require('node:test');
const { Readable } = require('node:stream');

function makeReq({ method = 'GET', url = '/api/admin/me', body, headers = {} } = {}) {
  const req = Readable.from(body ? [JSON.stringify(body)] : []);
  req.method = method;
  req.url = url;
  req.headers = { host: 'localhost:3001', ...headers };
  req.socket = { remoteAddress: '127.0.0.1' };
  return req;
}

function makeRes() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body = '') {
      this.body = body;
    },
  };
}

test('admin normalizes and validates coupon payloads', () => {
  const { validateCouponPayload } = require('../src/db/admin');

  assert.deepEqual(validateCouponPayload({ code: ' velkor20 ', discountType: 'PERCENT', discountValue: 20 }).value, {
    code: 'VELKOR20',
    discountType: 'PERCENT',
    discountValue: 20,
    active: true,
    startsAt: null,
    expiresAt: null,
    maxRedemptions: null,
  });
  assert.equal(validateCouponPayload({ code: 'ABC', discountType: 'PERCENT', discountValue: 101 }).error, 'Cupom percentual invalido.');
});

test('admin normalizes and validates product payloads', () => {
  const { validateProductPayload } = require('../src/db/admin');

  const parsed = validateProductPayload({
    id: ' V99 ',
    slug: 'produto-real',
    name: ' Produto Real ',
    category: 'sneakers',
    brand: 'VOLKERR',
    price: 299.9,
    oldPrice: '',
    colors: '#000000, #ffffff',
    image: 'https://example.com/produto.jpg',
    images: 'https://example.com/a.jpg, https://example.com/b.jpg',
    sizes: '39, 40, 41',
    tag: 'new',
    active: false,
  });

  assert.equal(parsed.error, undefined);
  assert.equal(parsed.value.id, 'v99');
  assert.equal(parsed.value.slug, 'produto-real');
  assert.equal(parsed.value.priceCents, 29990);
  assert.deepEqual(parsed.value.colors, ['#000000', '#ffffff']);
  assert.deepEqual(parsed.value.sizes, ['39', '40', '41']);
  assert.equal(parsed.value.active, false);

  assert.equal(validateProductPayload({ id: 'x', name: 'Bad', category: 'sneakers', brand: 'B', price: 0, image: 'x', sizes: 'M', colors: '#000', tag: 'new' }).error, 'ID do produto invalido.');
  assert.equal(validateProductPayload({ id: 'abc', name: 'Bad', category: '!', brand: 'Brand', price: 10, image: 'x', sizes: 'M', colors: '#000', tag: 'new' }).error, 'Categoria invalida.');
});

test('admin maps public users without password hashes', () => {
  const { toAdminUser } = require('../src/db/admin');
  const user = toAdminUser({
    id: 'u1',
    email: 'a@b.com',
    name: null,
    role: 'ADMIN',
    emailVerified: true,
    passwordHash: 'secret',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  });

  assert.equal(user.passwordHash, undefined);
  assert.equal(user.role, 'ADMIN');
  assert.equal(user.email, 'a@b.com');
});

test('admin maps customer details with addresses and order summaries', () => {
  const { toAdminUser, validateAdminUserPatch } = require('../src/db/admin');
  const user = toAdminUser({
    id: 'u2',
    email: 'cliente@example.com',
    name: 'Cliente',
    role: 'CUSTOMER',
    emailVerified: false,
    addresses: [{
      id: 'addr_1',
      fullName: 'Cliente Silva',
      phone: '+55 16 99999-9999',
      postalCode: '14000-000',
      street: 'Rua A',
      number: '123',
      complement: 'Casa',
      neighborhood: 'Centro',
      city: 'Ribeirao Preto',
      state: 'SP',
      country: 'BR',
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
      updatedAt: new Date('2026-01-04T00:00:00.000Z'),
    }],
    orders: [{
      id: 'ord_1',
      status: 'PAID',
      totalCents: 15990,
      createdAt: new Date('2026-01-05T00:00:00.000Z'),
    }],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  });

  assert.equal(user.passwordHash, undefined);
  assert.equal(user.addresses[0].street, 'Rua A, 123');
  assert.equal(user.addresses[0].region, 'SP');
  assert.equal(user.orders[0].status, 'paid');
  assert.equal(user.orders[0].total, 159.9);

  assert.deepEqual(validateAdminUserPatch({ name: ' Novo Nome ', email: 'NOVO@EXAMPLE.COM', role: 'ADMIN', emailVerified: true }).value, {
    name: 'Novo Nome',
    email: 'novo@example.com',
    role: 'ADMIN',
    emailVerified: true,
  });
  assert.equal(validateAdminUserPatch({ email: 'email-invalido' }).error, 'Email invalido.');
});

test('admin route rejects customers and returns admin profile for admins', async () => {
  const { createAdminHandler } = require('../src/routes/admin');
  const customerRes = makeRes();
  const adminRes = makeRes();
  const repo = {};
  const authRepo = {
    findSessionUser: async rawToken => rawToken === 'admin-token'
      ? { user: { id: 'adm_1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', emailVerified: true } }
      : { user: { id: 'usr_1', email: 'user@example.com', role: 'CUSTOMER' } },
  };
  const handler = createAdminHandler({ repo, authRepo, appConfig: {} });

  assert.equal(await handler(makeReq({ headers: { cookie: 'velkor_sid=customer-token' } }), customerRes, null), true);
  assert.equal(customerRes.statusCode, 403);

  assert.equal(await handler(makeReq({ headers: { cookie: 'velkor_sid=admin-token' } }), adminRes, null), true);
  assert.equal(adminRes.statusCode, 200);
  assert.equal(JSON.parse(adminRes.body).user.role, 'ADMIN');
});

test('admin route updates order status for admins', async () => {
  const { createAdminHandler } = require('../src/routes/admin');
  const res = makeRes();
  let statusInput = null;
  const handler = createAdminHandler({
    authRepo: { findSessionUser: async () => ({ user: { id: 'adm_2', role: 'ADMIN' } }) },
    appConfig: {},
    repo: {
      updateOrderStatus: async (id, status, adminUserId) => {
        statusInput = { id, status, adminUserId };
        return { order: { id, status, total: 100 }, storage: 'database' };
      },
    },
  });

  assert.equal(await handler(makeReq({ method: 'PATCH', url: '/api/admin/orders/order_1/status', body: { status: 'paid' } }), res, null), true);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(statusInput, { id: 'order_1', status: 'paid', adminUserId: 'adm_2' });
});

test('admin route creates and updates products for admins', async () => {
  const { createAdminHandler } = require('../src/routes/admin');
  const createRes = makeRes();
  const updateRes = makeRes();
  const calls = [];
  const handler = createAdminHandler({
    authRepo: { findSessionUser: async () => ({ user: { id: 'adm_products', role: 'ADMIN' } }) },
    appConfig: {},
    repo: {
      createProduct: async (payload, adminUserId) => {
        calls.push({ type: 'create', payload, adminUserId });
        return { product: { id: payload.id, name: payload.name, active: true }, storage: 'database' };
      },
      updateProduct: async (id, payload, adminUserId) => {
        calls.push({ type: 'update', id, payload, adminUserId });
        return { product: { id, name: payload.name, active: payload.active }, storage: 'database' };
      },
    },
  });

  assert.equal(await handler(makeReq({ method: 'POST', url: '/api/admin/products', body: { id: 'p1', name: 'Produto 1' } }), createRes, null), true);
  assert.equal(await handler(makeReq({ method: 'PATCH', url: '/api/admin/products/p1', body: { name: 'Produto Editado', active: false } }), updateRes, null), true);

  assert.equal(createRes.statusCode, 201);
  assert.equal(updateRes.statusCode, 200);
  assert.deepEqual(calls.map(call => call.adminUserId), ['adm_products', 'adm_products']);
});

test('admin settings expose public config and secret presence only', async () => {
  const { buildAdminSettings } = require('../src/db/admin');
  const { createAdminHandler } = require('../src/routes/admin');
  const settings = buildAdminSettings({
    VELKOR_APP_NAME: 'VOLKERR',
    VELKOR_PUBLIC_URL: 'https://volkerr.com.br',
    VELKOR_SUPPORT_EMAIL: 'contato@volkerr.com.br',
    VELKOR_WHATSAPP: '+55 16 99999-9999',
    VELKOR_INSTAGRAM: 'https://instagram.com/volkerr',
    MERCADO_PAGO_ACCESS_TOKEN: 'mp-secret',
    MERCADO_PAGO_DEV_MODE: 'true',
    GMAIL_USER: 'loja@volkerr.com.br',
    GMAIL_PASS: 'gmail-secret',
    EMAIL_DEV_MODE: 'false',
    MELHOR_ENVIO_ACCESS_TOKEN: 'me-secret',
    MELHOR_ENVIO_ORIGIN_CEP: '14000-000',
    MELHOR_ENVIO_ENV: 'sandbox',
  });

  assert.equal(settings.store.publicUrl, 'https://volkerr.com.br');
  assert.equal(settings.integrations.mercadoPago.configured, true);
  assert.equal(settings.integrations.email.configured, true);
  assert.equal(settings.integrations.melhorEnvio.configured, true);
  assert.equal(JSON.stringify(settings).includes('mp-secret'), false);
  assert.equal(JSON.stringify(settings).includes('gmail-secret'), false);
  assert.equal(JSON.stringify(settings).includes('me-secret'), false);

  const res = makeRes();
  const handler = createAdminHandler({
    authRepo: { findSessionUser: async () => ({ user: { id: 'adm_settings', role: 'ADMIN' } }) },
    appConfig: { VELKOR_PUBLIC_URL: 'https://volkerr.com.br' },
    repo: { buildAdminSettings },
  });

  assert.equal(await handler(makeReq({ method: 'GET', url: '/api/admin/settings' }), res, null), true);
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).settings.store.publicUrl, 'https://volkerr.com.br');
});

test('legacy admin unlock returns gone when disabled', async () => {
  const { createAdminHandler } = require('../src/routes/admin');
  const res = makeRes();
  const handler = createAdminHandler({ repo: {}, authRepo: {}, appConfig: { LEGACY_ADMIN_UNLOCK_ENABLED: 'false', ADMIN_SECRET: 'secret' } });

  assert.equal(await handler(makeReq({ method: 'POST', url: '/api/admin/unlock', body: { password: 'secret' } }), res, null), true);

  assert.equal(res.statusCode, 410);
});

test('admin seed builds configured admin input from environment', () => {
  const { buildAdminSeedInput } = require('../prisma/seed');
  const input = buildAdminSeedInput({ ADMIN_EMAIL: 'OWNER@EXAMPLE.COM', ADMIN_PASSWORD: 'super-secret-password' });

  assert.equal(input.email, 'owner@example.com');
  assert.equal(input.role, 'ADMIN');
  assert.equal(input.password, 'super-secret-password');
});
