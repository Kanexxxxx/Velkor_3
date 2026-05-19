const assert = require('node:assert/strict');
const test = require('node:test');

function makeReq({ method = 'GET', url = '/api/account/me', headers = {}, body = null } = {}) {
  const req = require('node:stream').Readable.from(body ? [JSON.stringify(body)] : []);
  req.method = method;
  req.url = url;
  req.headers = { host: 'localhost:3001', cookie: 'velkor_sid=session-token', ...headers };
  req.socket = { remoteAddress: '127.0.0.1' };
  return req;
}

function makeRes() {
  return {
    statusCode: 0,
    body: '',
    writeHead(statusCode) { this.statusCode = statusCode; },
    end(body = '') { this.body = body; },
  };
}

test('account route rejects unauthenticated requests', async () => {
  const { createAccountHandler } = require('../src/routes/account');
  const res = makeRes();
  const handler = createAccountHandler({
    authRepo: { findSessionUser: async () => null },
  });

  assert.equal(await handler(makeReq({ headers: { cookie: '' } }), res, null), true);
  assert.equal(res.statusCode, 401);
});

test('account route returns current customer profile', async () => {
  const { createAccountHandler } = require('../src/routes/account');
  const res = makeRes();
  const user = { id: 'u1', email: 'buyer@example.com', name: 'Buyer', role: 'CUSTOMER', emailVerified: true, addresses: [] };
  const handler = createAccountHandler({
    authRepo: { findSessionUser: async () => ({ user, rawToken: 'session-token' }) },
  });

  assert.equal(await handler(makeReq(), res, null), true);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body).user, user);
});

test('account route lists orders scoped to authenticated email', async () => {
  const { createAccountHandler } = require('../src/routes/account');
  const res = makeRes();
  const seen = {};
  const handler = createAccountHandler({
    authRepo: { findSessionUser: async () => ({ user: { id: 'u1', email: 'buyer@example.com', addresses: [] }, rawToken: 'session-token' }) },
    orderRepo: {
      listOrders: async (sessionId, email) => {
        Object.assign(seen, { sessionId, email });
        return { orders: [{ id: 'order_1' }], storage: 'database' };
      },
    },
  });

  assert.equal(await handler(makeReq({ url: '/api/account/orders', headers: { 'x-velkor-session': 'guest_1' } }), res, null), true);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(seen, { sessionId: 'guest_1', email: 'buyer@example.com' });
  assert.deepEqual(JSON.parse(res.body).orders, [{ id: 'order_1' }]);
});

test('account route updates the authenticated profile', async () => {
  const { createAccountHandler } = require('../src/routes/account');
  const res = makeRes();
  const calls = [];
  const updated = { id: 'u1', email: 'buyer@example.com', name: 'Buyer Silva', role: 'CUSTOMER', emailVerified: true, addresses: [] };
  const authRepo = {
    findSessionUser: async () => ({ user: { id: 'u1', email: 'buyer@example.com', addresses: [] }, userRecord: {} }),
    updateUserProfile: async (userId, patch) => {
      calls.push({ userId, patch });
      return updated;
    },
    toPublicUser: user => user,
  };
  const handler = createAccountHandler({ authRepo });

  assert.equal(await handler(makeReq({ method: 'PATCH', url: '/api/account/profile', body: { name: ' Buyer Silva ' } }), res, null), true);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls, [{ userId: 'u1', patch: { name: 'Buyer Silva' } }]);
  assert.deepEqual(JSON.parse(res.body).user, updated);
});

test('account route manages authenticated customer addresses', async () => {
  const { createAccountHandler } = require('../src/routes/account');
  const createRes = makeRes();
  const patchRes = makeRes();
  const deleteRes = makeRes();
  const defaultRes = makeRes();
  const calls = [];
  const addresses = [{ id: 'addr_1', label: 'Casa', recipient: 'Buyer', street: 'Rua A', city: 'RP', region: 'SP', postalCode: '14000-000', country: 'Brasil', isDefault: true }];
  const authRepo = {
    findSessionUser: async () => ({ user: { id: 'u1', email: 'buyer@example.com', addresses: [] }, userRecord: {} }),
    upsertUserAddress: async (userId, input) => {
      calls.push({ type: 'upsert', userId, input });
      return { address: addresses[0], addresses };
    },
    deleteUserAddress: async (userId, id) => {
      calls.push({ type: 'delete', userId, id });
      return [];
    },
    setDefaultUserAddress: async (userId, id) => {
      calls.push({ type: 'default', userId, id });
      return addresses;
    },
  };
  const handler = createAccountHandler({ authRepo });

  await handler(makeReq({ method: 'POST', url: '/api/account/addresses', body: addresses[0] }), createRes, null);
  await handler(makeReq({ method: 'PATCH', url: '/api/account/addresses/addr_1', body: { ...addresses[0], label: 'Trabalho' } }), patchRes, null);
  await handler(makeReq({ method: 'DELETE', url: '/api/account/addresses/addr_1' }), deleteRes, null);
  await handler(makeReq({ method: 'POST', url: '/api/account/addresses/addr_1/default' }), defaultRes, null);

  assert.equal(createRes.statusCode, 200);
  assert.equal(patchRes.statusCode, 200);
  assert.equal(deleteRes.statusCode, 200);
  assert.equal(defaultRes.statusCode, 200);
  assert.equal(calls[1].input.id, 'addr_1');
  assert.deepEqual(calls.map(call => call.type), ['upsert', 'upsert', 'delete', 'default']);
});

test('account security route changes password and revokes other sessions', async () => {
  const { createAccountHandler } = require('../src/routes/account');
  const res = makeRes();
  const calls = [];
  const authRepo = {
    findSessionUser: async () => ({ user: { id: 'u1', email: 'buyer@example.com' }, userRecord: { passwordHash: 'hash' } }),
    verifyPassword: async (plain, hash) => {
      calls.push({ type: 'verify', plain, hash });
      return true;
    },
    updateUserPassword: async (userId, password) => calls.push({ type: 'password', userId, password }),
    deleteOtherSessions: async (userId, rawToken) => {
      calls.push({ type: 'sessions', userId, rawToken });
      return 2;
    },
  };
  const handler = createAccountHandler({ authRepo });

  await handler(makeReq({ method: 'POST', url: '/api/account/security/change-password', body: { currentPassword: 'old-pass-123', newPassword: 'new-pass-123' } }), res, null);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(calls, [
    { type: 'verify', plain: 'old-pass-123', hash: 'hash' },
    { type: 'password', userId: 'u1', password: 'new-pass-123' },
    { type: 'sessions', userId: 'u1', rawToken: 'session-token' },
  ]);
});

test('account route resends email verification without exposing secrets', async () => {
  const { createAccountHandler } = require('../src/routes/account');
  const res = makeRes();
  const sent = [];
  const handler = createAccountHandler({
    authRepo: {
      findSessionUser: async () => ({ user: { id: 'u1', email: 'buyer@example.com', emailVerified: false }, userRecord: {} }),
      createEmailVerificationToken: async userId => {
        assert.equal(userId, 'u1');
        return 'verify-token';
      },
    },
    appConfig: { VELKOR_PUBLIC_URL: 'https://volkerr.test' },
    emailService: {
      sendEmailVerification: async payload => sent.push(payload),
    },
  });

  await handler(makeReq({ method: 'POST', url: '/api/account/verify-email/resend' }), res, null);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { ok: true });
  assert.equal(sent[0].to, 'buyer@example.com');
  assert.equal(sent[0].verificationUrl, 'https://volkerr.test/account/verify-email?token=verify-token');
});
