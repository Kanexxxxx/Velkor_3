const adminRepo = require('../db/admin');
const authRepoDefault = require('../db/auth');
const { requireAdmin, sendJson } = require('./guards');

const READ_LIMIT = { limit: 60, windowMs: 60 * 1000 };
const WRITE_LIMIT = { limit: 20, windowMs: 60 * 1000 };
const rateLimitStore = new Map();

class PayloadTooLargeError extends Error {}

function readBody(req, maxBytes = 64 * 1024) {
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

async function readJson(req) {
  const body = await readBody(req);
  if (!body.trim()) return {};
  return JSON.parse(body);
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? '0.0.0.0';
}

function checkRateLimit(scope, key, config) {
  const now = Date.now();
  const storeKey = `${scope}:${key}`;
  const entry = rateLimitStore.get(storeKey);
  if (!entry || now - entry.windowStart > config.windowMs) {
    rateLimitStore.set(storeKey, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= config.limit) return false;
  entry.count += 1;
  return true;
}

function isLegacyUnlockEnabled(appConfig) {
  if (String(appConfig.LEGACY_ADMIN_UNLOCK_ENABLED).toLowerCase() === 'false') return false;
  return Boolean(appConfig.ADMIN_SECRET);
}

function extractId(pathname, prefix, suffix = '') {
  let value = pathname.replace(prefix, '');
  if (suffix && value.endsWith(suffix)) value = value.slice(0, -suffix.length);
  value = decodeURIComponent(value).trim();
  return value || null;
}

function createAdminHandler({ repo = adminRepo, authRepo = authRepoDefault, appConfig = {} } = {}) {
  return async function handleAdminRequest(req, res, corsOrigin) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (!url.pathname.startsWith('/api/admin')) return false;

    try {
      if (url.pathname === '/api/admin/unlock' && req.method === 'POST') {
        if (!isLegacyUnlockEnabled(appConfig)) {
          sendJson(res, 410, { error: 'Admin legado desativado. Use login admin real.' }, corsOrigin);
          return true;
        }
        const payload = await readJson(req);
        if (typeof payload.password === 'string' && payload.password === appConfig.ADMIN_SECRET) {
          sendJson(res, 200, { ok: true, deprecated: true }, corsOrigin);
          return true;
        }
        sendJson(res, 401, { error: 'Senha incorreta.' }, corsOrigin);
        return true;
      }

      const isWrite = ['POST', 'PATCH', 'DELETE'].includes(req.method);
      const limitConfig = isWrite ? WRITE_LIMIT : READ_LIMIT;
      if (!checkRateLimit(isWrite ? 'admin-write' : 'admin-real', getClientIp(req), limitConfig)) {
        sendJson(res, 429, { error: 'Muitas tentativas. Aguarde um minuto.' }, corsOrigin);
        return true;
      }

      const admin = await requireAdmin(req, res, corsOrigin, authRepo);
      if (!admin) return true;
      const adminUserId = admin.user.id;

      if (url.pathname === '/api/admin/me' && req.method === 'GET') {
        sendJson(res, 200, { user: admin.user }, corsOrigin);
        return true;
      }

      if (url.pathname === '/api/admin/orders' && req.method === 'GET') {
        sendJson(res, 200, await repo.listAdminOrders(), corsOrigin);
        return true;
      }

      if (url.pathname.startsWith('/api/admin/orders/') && url.pathname.endsWith('/status') && req.method === 'PATCH') {
        const id = extractId(url.pathname, '/api/admin/orders/', '/status');
        const payload = await readJson(req);
        sendJson(res, 200, await repo.updateOrderStatus(id, payload.status, adminUserId), corsOrigin);
        return true;
      }

      if (url.pathname === '/api/admin/users' && req.method === 'GET') {
        sendJson(res, 200, await repo.listAdminUsers(), corsOrigin);
        return true;
      }

      if (url.pathname.startsWith('/api/admin/users/') && req.method === 'PATCH') {
        const id = extractId(url.pathname, '/api/admin/users/');
        sendJson(res, 200, await repo.updateAdminUser(id, await readJson(req), adminUserId), corsOrigin);
        return true;
      }

      if (url.pathname === '/api/admin/coupons' && req.method === 'GET') {
        sendJson(res, 200, await repo.listCoupons(), corsOrigin);
        return true;
      }

      if (url.pathname === '/api/admin/coupons' && req.method === 'POST') {
        sendJson(res, 201, await repo.createCoupon(await readJson(req), adminUserId), corsOrigin);
        return true;
      }

      if (url.pathname.startsWith('/api/admin/coupons/') && req.method === 'PATCH') {
        const id = extractId(url.pathname, '/api/admin/coupons/');
        sendJson(res, 200, await repo.updateCoupon(id, await readJson(req), adminUserId), corsOrigin);
        return true;
      }

      if (url.pathname === '/api/admin/newsletter' && req.method === 'GET') {
        sendJson(res, 200, await repo.listNewsletterSubscribers(), corsOrigin);
        return true;
      }

      if (url.pathname.startsWith('/api/admin/newsletter/') && req.method === 'PATCH') {
        const id = extractId(url.pathname, '/api/admin/newsletter/');
        sendJson(res, 200, await repo.updateNewsletterSubscriber(id, await readJson(req), adminUserId), corsOrigin);
        return true;
      }

      sendJson(res, 404, { error: 'Rota admin nao encontrada.' }, corsOrigin);
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
      sendJson(res, err.statusCode || 500, { error: err.statusCode ? err.message : 'Erro admin.' }, corsOrigin);
      return true;
    }
  };
}

module.exports = { createAdminHandler, isLegacyUnlockEnabled };
