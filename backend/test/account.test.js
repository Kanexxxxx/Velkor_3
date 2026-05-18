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
