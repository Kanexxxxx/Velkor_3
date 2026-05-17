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

test('legacy admin unlock returns gone when disabled', async () => {
  const { createAdminHandler } = require('../src/routes/admin');
  const res = makeRes();
  const handler = createAdminHandler({ repo: {}, authRepo: {}, appConfig: { LEGACY_ADMIN_UNLOCK_ENABLED: 'false', ADMIN_SECRET: 'secret' } });

  assert.equal(await handler(makeReq({ method: 'POST', url: '/api/admin/unlock', body: { password: 'secret' } }), res, null), true);

  assert.equal(res.statusCode, 410);
});
