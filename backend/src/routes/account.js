const authRepoDefault = require('../db/auth');
const orderRepoDefault = require('../db/orders');
const { getSessionId } = require('../db/session');
const { requireAuth, sendJson } = require('./guards');
const { parseCookies } = require('./auth');
const { createEmailClient } = require('../services/email');
const { sendOrderConfirmationIfNeeded } = require('../services/order-email');

const MAX_BODY_BYTES = 32 * 1024;
const COOKIE_NAME = 'velkor_sid';

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

async function readJson(req) {
  const body = await readBody(req);
  if (!body.trim()) return {};
  return JSON.parse(body);
}

function getSessionCookie(req) {
  return parseCookies(req.headers.cookie)[COOKIE_NAME] || '';
}

function cleanName(value) {
  return typeof value === 'string' ? value.trim().slice(0, 120) : null;
}

function extractId(pathname, prefix, suffix = '') {
  let id = pathname.replace(prefix, '');
  if (suffix && id.endsWith(suffix)) id = id.slice(0, -suffix.length);
  return decodeURIComponent(id).trim();
}

function createAccountHandler({ authRepo = authRepoDefault, orderRepo = orderRepoDefault, appConfig = process.env, emailService } = {}) {
  const accountEmailService = emailService || createEmailClient(appConfig);
  const publicUrl = (appConfig.VELKOR_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');

  return async function handleAccountRequest(req, res, corsOrigin) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (!url.pathname.startsWith('/api/account')) return false;

    try {
      const current = await requireAuth(req, res, corsOrigin, authRepo);
      if (!current) return true;

      if (url.pathname === '/api/account/me' && req.method === 'GET') {
        sendJson(res, 200, { user: current.user }, corsOrigin);
        return true;
      }

      if (url.pathname === '/api/account/profile' && req.method === 'PATCH') {
        const payload = await readJson(req);
        const user = await authRepo.updateUserProfile(current.user.id, { name: cleanName(payload.name) });
        if (!user) {
          sendJson(res, 503, { error: 'Perfil indisponivel.' }, corsOrigin);
          return true;
        }
        sendJson(res, 200, { user: authRepo.toPublicUser ? authRepo.toPublicUser(user) : user }, corsOrigin);
        return true;
      }

      if (url.pathname === '/api/account/addresses' && req.method === 'GET') {
        sendJson(res, 200, { addresses: current.user.addresses || [] }, corsOrigin);
        return true;
      }

      if (url.pathname === '/api/account/addresses' && req.method === 'POST') {
        const result = await authRepo.upsertUserAddress(current.user.id, await readJson(req));
        if (!result) {
          sendJson(res, 400, { error: 'Endereco invalido.' }, corsOrigin);
          return true;
        }
        sendJson(res, 200, result, corsOrigin);
        return true;
      }

      if (url.pathname.startsWith('/api/account/addresses/') && url.pathname.endsWith('/default') && req.method === 'POST') {
        const id = extractId(url.pathname, '/api/account/addresses/', '/default');
        const addresses = await authRepo.setDefaultUserAddress(current.user.id, id);
        if (!addresses) {
          sendJson(res, 404, { error: 'Endereco nao encontrado.' }, corsOrigin);
          return true;
        }
        sendJson(res, 200, { addresses }, corsOrigin);
        return true;
      }

      if (url.pathname.startsWith('/api/account/addresses/') && req.method === 'PATCH') {
        const id = extractId(url.pathname, '/api/account/addresses/');
        const result = await authRepo.upsertUserAddress(current.user.id, { ...await readJson(req), id });
        if (!result) {
          sendJson(res, 404, { error: 'Endereco nao encontrado.' }, corsOrigin);
          return true;
        }
        sendJson(res, 200, result, corsOrigin);
        return true;
      }

      if (url.pathname.startsWith('/api/account/addresses/') && req.method === 'DELETE') {
        const id = extractId(url.pathname, '/api/account/addresses/');
        const addresses = await authRepo.deleteUserAddress(current.user.id, id);
        if (!addresses) {
          sendJson(res, 404, { error: 'Endereco nao encontrado.' }, corsOrigin);
          return true;
        }
        sendJson(res, 200, { addresses }, corsOrigin);
        return true;
      }

      if (url.pathname === '/api/account/orders' && req.method === 'GET') {
        const sessionId = getSessionId(req) || '';
        sendJson(res, 200, await orderRepo.listOrders(sessionId, current.user.email), corsOrigin);
        return true;
      }

      if (url.pathname.startsWith('/api/account/orders/') && url.pathname.endsWith('/resend-confirmation') && req.method === 'POST') {
        const id = extractId(url.pathname, '/api/account/orders/', '/resend-confirmation');
        if (!id) {
          sendJson(res, 400, { error: 'Pedido invalido.' }, corsOrigin);
          return true;
        }
        const sessionId = getSessionId(req) || '';
        const result = await orderRepo.getOrder(sessionId, id, current.user.email);
        if (!result.order) {
          sendJson(res, 404, { error: 'Pedido nao encontrado.' }, corsOrigin);
          return true;
        }
        const email = await sendOrderConfirmationIfNeeded({ orderResult: result, emailService: accountEmailService });
        sendJson(res, 200, { ok: true, email: email || { sent: false } }, corsOrigin);
        return true;
      }

      if (url.pathname.startsWith('/api/account/orders/') && req.method === 'GET') {
        const id = decodeURIComponent(url.pathname.replace('/api/account/orders/', '')).trim();
        if (!id) {
          sendJson(res, 400, { error: 'Pedido invalido.' }, corsOrigin);
          return true;
        }
        const sessionId = getSessionId(req) || '';
        const result = await orderRepo.getOrder(sessionId, id, current.user.email);
        if (!result.order) {
          sendJson(res, 404, { error: 'Pedido nao encontrado.' }, corsOrigin);
          return true;
        }
        sendJson(res, 200, result, corsOrigin);
        return true;
      }

      if (url.pathname === '/api/account/security/change-password' && req.method === 'POST') {
        const payload = await readJson(req);
        const currentPassword = typeof payload.currentPassword === 'string' ? payload.currentPassword : '';
        const newPassword = typeof payload.newPassword === 'string' ? payload.newPassword : '';
        if (!currentPassword || newPassword.length < 8) {
          sendJson(res, 400, { error: 'Dados invalidos.' }, corsOrigin);
          return true;
        }
        if (!current.userRecord?.passwordHash || !await authRepo.verifyPassword(currentPassword, current.userRecord.passwordHash)) {
          sendJson(res, 401, { error: 'Senha atual incorreta.' }, corsOrigin);
          return true;
        }
        await authRepo.updateUserPassword(current.user.id, newPassword);
        await authRepo.deleteOtherSessions(current.user.id, getSessionCookie(req));
        sendJson(res, 200, { ok: true }, corsOrigin);
        return true;
      }

      if (url.pathname === '/api/account/security/logout-all' && req.method === 'POST') {
        const revoked = await authRepo.deleteOtherSessions(current.user.id, getSessionCookie(req));
        sendJson(res, 200, { ok: true, revoked }, corsOrigin);
        return true;
      }

      if (url.pathname === '/api/account/verify-email/resend' && req.method === 'POST') {
        if (!current.user.emailVerified) {
          const token = await authRepo.createEmailVerificationToken(current.user.id);
          if (token) {
            try {
              await accountEmailService.sendEmailVerification({
                to: current.user.email,
                verificationUrl: `${publicUrl}/account/verify-email?token=${encodeURIComponent(token)}`,
              });
            } catch (err) {
              console.warn(`email.account_verification.failed to=${current.user.email} message=${err instanceof Error ? err.message : 'unknown'}`);
            }
          }
        }
        sendJson(res, 200, { ok: true }, corsOrigin);
        return true;
      }

      sendJson(res, 404, { error: 'Rota da conta nao encontrada.' }, corsOrigin);
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
      sendJson(res, err.statusCode || 500, { error: err.statusCode ? err.message : 'Erro da conta.' }, corsOrigin);
      return true;
    }
  };
}

module.exports = { createAccountHandler };
