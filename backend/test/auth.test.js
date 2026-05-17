const assert = require('node:assert/strict');
const test = require('node:test');
const { Readable } = require('node:stream');

test('auth password hashes verify with bcrypt and reject wrong passwords', async () => {
  const { hashPassword, verifyPassword } = require('../src/db/auth');

  const hash = await hashPassword('velkor-secret');

  assert.notEqual(hash, 'velkor-secret');
  assert.equal(await verifyPassword('velkor-secret', hash), true);
  assert.equal(await verifyPassword('wrong-secret', hash), false);
});

test('auth session tokens are hashed without exposing the raw token', () => {
  const { createRawSessionToken, hashSessionToken } = require('../src/db/auth');

  const rawToken = createRawSessionToken();
  const tokenHash = hashSessionToken(rawToken);

  assert.match(rawToken, /^[a-f0-9]{64}$/);
  assert.match(tokenHash, /^[a-f0-9]{64}$/);
  assert.notEqual(tokenHash, rawToken);
  assert.equal(hashSessionToken(rawToken), tokenHash);
});

test('auth repository uses demo-disabled results without database config', async () => {
  delete process.env.DATABASE_URL;
  const { createEmailVerificationToken, createSession, consumeEmailVerificationToken, findSessionUser, listSessions } = require('../src/db/auth');

  const session = await createSession({ userId: 'usr_demo' });
  const user = await findSessionUser('not-a-real-token');
  const sessions = await listSessions('usr_demo');
  const verificationToken = await createEmailVerificationToken('usr_demo');
  const verificationResult = await consumeEmailVerificationToken('not-a-real-token');

  assert.equal(session, null);
  assert.equal(user, null);
  assert.equal(verificationToken, null);
  assert.equal(verificationResult, false);
  assert.deepEqual(sessions, []);
});

function makeReq({ method = 'GET', url = '/api/auth/me', body, headers = {} } = {}) {
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

test('auth route registers a user, creates session cookie, and returns public user', async () => {
  const { createAuthHandler } = require('../src/routes/auth');
  const users = new Map();
  const handler = createAuthHandler({
    findUserByEmail: async email => users.get(email) ?? null,
    createUser: async user => {
      const created = { id: 'usr_1', email: user.email, name: user.name, role: 'CUSTOMER', emailVerified: false };
      users.set(user.email, created);
      return created;
    },
    createSession: async () => ({ rawToken: 'a'.repeat(64), session: { id: 'ses_1' } }),
    toPublicUser: user => user,
  });
  const req = makeReq({
    method: 'POST',
    url: '/api/auth/register',
    body: { email: 'Kaina@Example.com', password: '12345678', name: 'Kaina' },
  });
  const res = makeRes();

  assert.equal(await handler(req, res, null), true);

  assert.equal(res.statusCode, 201);
  assert.match(res.headers['Set-Cookie'], /velkor_sid=a{64};/);
  assert.deepEqual(JSON.parse(res.body), {
    user: { id: 'usr_1', email: 'kaina@example.com', name: 'Kaina', role: 'CUSTOMER', emailVerified: false },
  });
});

test('auth route returns current user from session cookie and logs out', async () => {
  const { createAuthHandler } = require('../src/routes/auth');
  let deletedToken = null;
  const handler = createAuthHandler({
    findSessionUser: async rawToken => rawToken === 'b'.repeat(64)
      ? { user: { id: 'usr_2', email: 'user@example.com', name: null, role: 'CUSTOMER', emailVerified: false } }
      : null,
    deleteSession: async rawToken => {
      deletedToken = rawToken;
      return true;
    },
  });
  const meRes = makeRes();
  const logoutRes = makeRes();

  assert.equal(await handler(makeReq({ headers: { cookie: `velkor_sid=${'b'.repeat(64)}` } }), meRes, null), true);
  assert.equal(await handler(makeReq({ method: 'POST', url: '/api/auth/logout', headers: { cookie: `velkor_sid=${'b'.repeat(64)}` } }), logoutRes, null), true);

  assert.equal(meRes.statusCode, 200);
  assert.equal(JSON.parse(meRes.body).user.email, 'user@example.com');
  assert.equal(logoutRes.statusCode, 200);
  assert.equal(deletedToken, 'b'.repeat(64));
  assert.match(logoutRes.headers['Set-Cookie'], /Max-Age=0/);
});

test('auth route sends password reset email when token is created', async () => {
  const { createAuthHandler } = require('../src/routes/auth');
  let sentResetUrl = '';
  const handler = createAuthHandler({
    createPasswordResetToken: async () => 'reset-token',
  }, {
    emailService: {
      sendPasswordResetEmail: async ({ resetUrl }) => {
        sentResetUrl = resetUrl;
        return { sent: false, mode: 'dev' };
      },
    },
    appConfig: { VELKOR_PUBLIC_URL: 'https://velkor.test' },
  });
  const res = makeRes();

  assert.equal(await handler(makeReq({ method: 'POST', url: '/api/auth/password-reset/request', body: { email: 'User@Example.com' } }), res, null), true);

  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).ok, true);
  assert.equal(sentResetUrl, 'https://velkor.test/account/reset-password?token=reset-token');
});

test('auth route requests and confirms email verification', async () => {
  const { createAuthHandler } = require('../src/routes/auth');
  let sentVerificationUrl = '';
  let confirmedToken = '';
  const handler = createAuthHandler({
    findSessionUser: async () => ({ user: { id: 'usr_1', email: 'user@example.com', role: 'CUSTOMER' } }),
    createEmailVerificationToken: async userId => userId === 'usr_1' ? 'verify-token' : null,
    consumeEmailVerificationToken: async token => {
      confirmedToken = token;
      return token === 'verify-token';
    },
  }, {
    emailService: {
      sendEmailVerification: async ({ verificationUrl }) => {
        sentVerificationUrl = verificationUrl;
        return { sent: false, mode: 'dev' };
      },
    },
    appConfig: { VELKOR_PUBLIC_URL: 'https://velkor.test' },
  });
  const requestRes = makeRes();
  const confirmRes = makeRes();

  assert.equal(await handler(makeReq({ method: 'POST', url: '/api/auth/email-verification/request', headers: { cookie: 'velkor_sid=session' } }), requestRes, null), true);
  assert.equal(await handler(makeReq({ method: 'POST', url: '/api/auth/email-verification/confirm', body: { token: 'verify-token' } }), confirmRes, null), true);

  assert.equal(requestRes.statusCode, 200);
  assert.equal(sentVerificationUrl, 'https://velkor.test/account/verify-email?token=verify-token');
  assert.equal(confirmRes.statusCode, 200);
  assert.equal(confirmedToken, 'verify-token');
});

test('admin guards reject missing sessions and customer users', async () => {
  const { requireAuth, requireAdmin } = require('../src/routes/guards');
  const missingRes = makeRes();
  const customerRes = makeRes();

  assert.equal(await requireAuth(makeReq(), missingRes, null, { findSessionUser: async () => null }), null);
  assert.equal(missingRes.statusCode, 401);

  assert.equal(await requireAdmin(
    makeReq({ headers: { cookie: `velkor_sid=${'c'.repeat(64)}` } }),
    customerRes,
    null,
    { findSessionUser: async () => ({ user: { id: 'usr_1', role: 'CUSTOMER' } }) }
  ), null);
  assert.equal(customerRes.statusCode, 403);
});

test('admin guards allow admin sessions', async () => {
  const { requireAdmin } = require('../src/routes/guards');
  const res = makeRes();
  const context = await requireAdmin(
    makeReq({ headers: { cookie: `velkor_sid=${'d'.repeat(64)}` } }),
    res,
    null,
    { findSessionUser: async () => ({ user: { id: 'adm_1', role: 'ADMIN' } }) }
  );

  assert.equal(context.user.id, 'adm_1');
  assert.equal(res.statusCode, 0);
});
