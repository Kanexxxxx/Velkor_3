const authRepo = require('../db/auth');

const COOKIE_NAME = 'velkor_sid';
const MAX_BODY_BYTES = 32 * 1024;
const LOGIN_LOCK_LIMIT = 10;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const RATE_LIMITS = {
  register: { limit: 5, windowMs: 15 * 60 * 1000 },
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  reset: { limit: 3, windowMs: 60 * 60 * 1000 },
};

const rateLimitStore = new Map();
const failedLoginStore = new Map();

class PayloadTooLargeError extends Error {}

function readBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;

    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        tooLarge = true;
        req.resume();
        return;
      }
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    });

    req.on('end', () => {
      if (tooLarge) reject(new PayloadTooLargeError());
      else resolve(Buffer.concat(chunks).toString('utf8'));
    });

    req.on('error', reject);
  });
}

function parseCookies(header = '') {
  return String(header)
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const index = part.indexOf('=');
      if (index === -1) return cookies;
      cookies[part.slice(0, index)] = decodeURIComponent(part.slice(index + 1));
      return cookies;
    }, {});
}

function serializeSessionCookie(value, { maxAge = authRepo.SESSION_DURATION_MS / 1000, clear = false } = {}) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${clear ? 0 : Math.floor(maxAge)}`,
  ];

  if (process.env.NODE_ENV === 'production') parts.push('Secure');
  return parts.join('; ');
}

function getSessionCookie(req) {
  return parseCookies(req.headers.cookie)[COOKIE_NAME] || '';
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? '0.0.0.0';
}

function cleanupStore(store, now, maxAge) {
  for (const [key, entry] of store) {
    if (now - entry.windowStart > maxAge * 2) store.delete(key);
  }
}

function checkRateLimit(scope, key) {
  const config = RATE_LIMITS[scope];
  if (!config) return null;

  const now = Date.now();
  cleanupStore(rateLimitStore, now, config.windowMs);
  const storeKey = `${scope}:${key}`;
  const entry = rateLimitStore.get(storeKey);
  if (!entry || now - entry.windowStart > config.windowMs) {
    rateLimitStore.set(storeKey, { count: 1, windowStart: now });
    return null;
  }
  entry.count += 1;
  if (entry.count > config.limit) return Math.ceil((config.windowMs - (now - entry.windowStart)) / 1000);
  return null;
}

function registerFailedLogin(email) {
  const now = Date.now();
  const entry = failedLoginStore.get(email);
  if (!entry || now - entry.windowStart > LOGIN_LOCK_MS) {
    failedLoginStore.set(email, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count >= LOGIN_LOCK_LIMIT;
}

function isLoginLocked(email) {
  const entry = failedLoginStore.get(email);
  if (!entry) return false;
  if (Date.now() - entry.windowStart > LOGIN_LOCK_MS) {
    failedLoginStore.delete(email);
    return false;
  }
  return entry.count >= LOGIN_LOCK_LIMIT;
}

function clearFailedLogin(email) {
  failedLoginStore.delete(email);
}

async function readJson(req) {
  const body = await readBody(req);
  if (!body.trim()) return {};
  return JSON.parse(body);
}

function sendJson(res, statusCode, payload, corsOrigin, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  const corsHeaders = corsOrigin ? {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cookie',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  } : {};

  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
    ...corsHeaders,
    ...extraHeaders,
  });
  res.end(body);
}

function createAuthHandler(repo = authRepo) {
  async function requireAuth(req, res, corsOrigin) {
    const rawToken = getSessionCookie(req);
    const sessionUser = await repo.findSessionUser(rawToken);
    if (!sessionUser) {
      sendJson(res, 401, { error: 'Sessao invalida.' }, corsOrigin);
      return null;
    }
    return { ...sessionUser, rawToken };
  }

  return async function handleAuthRequest(req, res, corsOrigin) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (!url.pathname.startsWith('/api/auth')) return false;

    try {
      if (url.pathname === '/api/auth/register' && req.method === 'POST') {
        const retryAfter = checkRateLimit('register', getClientIp(req));
        if (retryAfter) {
          sendJson(res, 429, { error: 'Muitas tentativas.' }, corsOrigin, { 'Retry-After': String(retryAfter) });
          return true;
        }

        const payload = await readJson(req);
        const email = isValidEmail(payload.email) ? normalizeEmail(payload.email) : '';
        const password = typeof payload.password === 'string' ? payload.password : '';
        const name = typeof payload.name === 'string' ? payload.name.trim() : null;
        if (!email || password.length < 8) {
          sendJson(res, 400, { error: 'Dados invalidos.' }, corsOrigin);
          return true;
        }
        if (await repo.findUserByEmail(email)) {
          sendJson(res, 409, { error: 'Email ja cadastrado.' }, corsOrigin);
          return true;
        }

        const user = await repo.createUser({ email, password, name });
        if (!user) {
          sendJson(res, 503, { error: 'Autenticacao indisponivel.' }, corsOrigin);
          return true;
        }
        const session = await repo.createSession({ userId: user.id, ipAddress: getClientIp(req), userAgent: req.headers['user-agent'] || null });
        if (!session) {
          sendJson(res, 503, { error: 'Sessao indisponivel.' }, corsOrigin);
          return true;
        }
        sendJson(res, 201, { user: repo.toPublicUser(user) }, corsOrigin, { 'Set-Cookie': serializeSessionCookie(session.rawToken) });
        return true;
      }

      if (url.pathname === '/api/auth/login' && req.method === 'POST') {
        const retryAfter = checkRateLimit('login', getClientIp(req));
        if (retryAfter) {
          sendJson(res, 429, { error: 'Muitas tentativas.' }, corsOrigin, { 'Retry-After': String(retryAfter) });
          return true;
        }

        const payload = await readJson(req);
        const email = isValidEmail(payload.email) ? normalizeEmail(payload.email) : '';
        const password = typeof payload.password === 'string' ? payload.password : '';
        if (!email || !password) {
          sendJson(res, 400, { error: 'Dados invalidos.' }, corsOrigin);
          return true;
        }
        if (isLoginLocked(email)) {
          sendJson(res, 429, { error: 'Conta temporariamente bloqueada.' }, corsOrigin);
          return true;
        }

        const user = await repo.findUserByEmail(email);
        if (!user?.passwordHash || !await repo.verifyPassword(password, user.passwordHash)) {
          registerFailedLogin(email);
          sendJson(res, 401, { error: 'Credenciais invalidas.' }, corsOrigin);
          return true;
        }

        clearFailedLogin(email);
        const session = await repo.createSession({ userId: user.id, ipAddress: getClientIp(req), userAgent: req.headers['user-agent'] || null });
        if (!session) {
          sendJson(res, 503, { error: 'Sessao indisponivel.' }, corsOrigin);
          return true;
        }
        sendJson(res, 200, { user: repo.toPublicUser(user) }, corsOrigin, { 'Set-Cookie': serializeSessionCookie(session.rawToken) });
        return true;
      }

      if (url.pathname === '/api/auth/me' && req.method === 'GET') {
        const current = await requireAuth(req, res, corsOrigin);
        if (!current) return true;
        sendJson(res, 200, { user: current.user }, corsOrigin);
        return true;
      }

      if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
        const current = await requireAuth(req, res, corsOrigin);
        if (!current) return true;
        await repo.deleteSession(current.rawToken);
        sendJson(res, 200, { ok: true }, corsOrigin, { 'Set-Cookie': serializeSessionCookie('', { clear: true }) });
        return true;
      }

      if (url.pathname === '/api/auth/change-password' && req.method === 'POST') {
        const current = await requireAuth(req, res, corsOrigin);
        if (!current) return true;
        const payload = await readJson(req);
        if (typeof payload.currentPassword !== 'string' || typeof payload.newPassword !== 'string' || payload.newPassword.length < 8) {
          sendJson(res, 400, { error: 'Dados invalidos.' }, corsOrigin);
          return true;
        }
        if (!current.userRecord?.passwordHash || !await repo.verifyPassword(payload.currentPassword, current.userRecord.passwordHash)) {
          sendJson(res, 401, { error: 'Senha atual incorreta.' }, corsOrigin);
          return true;
        }
        await repo.updateUserPassword(current.user.id, payload.newPassword);
        await repo.deleteOtherSessions(current.user.id, current.rawToken);
        sendJson(res, 200, { ok: true }, corsOrigin);
        return true;
      }

      if (url.pathname === '/api/auth/profile' && req.method === 'PATCH') {
        const current = await requireAuth(req, res, corsOrigin);
        if (!current) return true;
        const payload = await readJson(req);
        const name = typeof payload.name === 'string' ? payload.name.trim().slice(0, 120) : null;
        const user = await repo.updateUserProfile(current.user.id, { name });
        sendJson(res, 200, { user: repo.toPublicUser(user) }, corsOrigin);
        return true;
      }

      if (url.pathname === '/api/auth/sessions' && req.method === 'GET') {
        const current = await requireAuth(req, res, corsOrigin);
        if (!current) return true;
        sendJson(res, 200, { sessions: await repo.listSessions(current.user.id) }, corsOrigin);
        return true;
      }

      if (url.pathname === '/api/auth/sessions' && req.method === 'DELETE') {
        const current = await requireAuth(req, res, corsOrigin);
        if (!current) return true;
        const revoked = await repo.deleteOtherSessions(current.user.id, current.rawToken);
        sendJson(res, 200, { ok: true, revoked }, corsOrigin);
        return true;
      }

      if (url.pathname.startsWith('/api/auth/sessions/') && req.method === 'DELETE') {
        const current = await requireAuth(req, res, corsOrigin);
        if (!current) return true;
        const id = decodeURIComponent(url.pathname.replace('/api/auth/sessions/', '')).trim();
        await repo.revokeSession(current.user.id, id);
        sendJson(res, 200, { ok: true }, corsOrigin);
        return true;
      }

      if (url.pathname === '/api/auth/password-reset/request' && req.method === 'POST') {
        const retryAfter = checkRateLimit('reset', getClientIp(req));
        if (retryAfter) {
          sendJson(res, 429, { error: 'Muitas tentativas.' }, corsOrigin, { 'Retry-After': String(retryAfter) });
          return true;
        }
        const payload = await readJson(req);
        if (isValidEmail(payload.email)) await repo.createPasswordResetToken(normalizeEmail(payload.email));
        sendJson(res, 200, { ok: true }, corsOrigin);
        return true;
      }

      if (url.pathname === '/api/auth/password-reset/confirm' && req.method === 'POST') {
        const payload = await readJson(req);
        if (typeof payload.token !== 'string' || typeof payload.newPassword !== 'string' || payload.newPassword.length < 8) {
          sendJson(res, 400, { error: 'token_invalid' }, corsOrigin);
          return true;
        }
        const ok = await repo.consumePasswordResetToken(payload.token, payload.newPassword);
        sendJson(res, ok ? 200 : 400, ok ? { ok: true } : { error: 'token_invalid' }, corsOrigin);
        return true;
      }

      sendJson(res, 404, { error: 'Rota de autenticacao nao encontrada.' }, corsOrigin);
      return true;
    } catch (err) {
      if (err instanceof PayloadTooLargeError) {
        sendJson(res, 413, { error: 'Payload muito grande.' }, corsOrigin);
        return true;
      }
      if (err instanceof SyntaxError) {
        sendJson(res, 400, { error: 'JSON invalido.' }, corsOrigin);
        return true;
      }
      sendJson(res, 500, { error: 'Erro de autenticacao.' }, corsOrigin);
      return true;
    }
  };
}

module.exports = { createAuthHandler, parseCookies, serializeSessionCookie };
