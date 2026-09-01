const paymentRepo = require('../db/payments');
const { getSessionId } = require('../db/session');
const authRepoDefault = require('../db/auth');
const { parseCookies } = require('./auth');
const { createEmailClient } = require('../services/email');
const { resolvePaymentProvider } = require('../services/payment-provider');
const { isAsaasPaidStatus } = require('../services/asaas');
const { sendPaymentApprovedIfNeeded } = require('../services/order-email');
const { sendJson } = require('./guards');
const crypto = require('crypto');

class PayloadTooLargeError extends Error {}
const AUTH_COOKIE_NAME = 'velkor_sid';

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

/* ── Mercado Pago webhook signature ─────────────────────────── */

function parseMercadoPagoSignature(value) {
  return String(value || '')
    .split(',')
    .map(part => part.split('='))
    .reduce((acc, [key, ...rest]) => {
      if (key && rest.length) acc[key.trim()] = rest.join('=').trim();
      return acc;
    }, {});
}

function safeEqualHex(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  return crypto.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

function verifyMercadoPagoSignature({ dataId, requestId, signatureHeader, secret }) {
  const signature = parseMercadoPagoSignature(signatureHeader);
  if (!dataId || !requestId || !signature.ts || !signature.v1 || !secret) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${signature.ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return safeEqualHex(expected, signature.v1);
}

function getWebhookDataId(url, payload) {
  return url.searchParams.get('data.id') || payload?.data?.id || payload?.id || payload?.externalId || '';
}

function verifyMercadoPagoWebhook(req, url, payload, appConfig) {
  const secret = appConfig.MERCADO_PAGO_WEBHOOK_SECRET || '';
  if (!secret) return true;
  if (req.headers['x-velkor-webhook-secret'] === secret) return true;
  return verifyMercadoPagoSignature({
    dataId: getWebhookDataId(url, payload),
    requestId: req.headers['x-request-id'],
    signatureHeader: req.headers['x-signature'],
    secret,
  });
}

/* ── Asaas webhook token ────────────────────────────────────── */

function safeEqualUtf8(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  if (a.length !== b.length || a.length === 0) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifyAsaasWebhook(req, appConfig) {
  const expected = appConfig.ASAAS_WEBHOOK_TOKEN || '';
  if (!expected) return true;
  if (req.headers['x-velkor-webhook-secret'] === expected) return true;
  return safeEqualUtf8(req.headers['asaas-access-token'], expected);
}

function looksLikeAsaasWebhook(payload) {
  return Boolean(
    payload &&
    typeof payload.event === 'string' &&
    /^[A-Z][A-Z_]+$/.test(payload.event) &&
    (payload.payment || payload.checkout)
  );
}

async function getCustomerEmail(req, authRepo) {
  const rawToken = parseCookies(req.headers.cookie)[AUTH_COOKIE_NAME] || '';
  if (!rawToken || !authRepo?.findSessionUser) return '';
  const current = await authRepo.findSessionUser(rawToken);
  return current?.user?.email || '';
}

function isApprovedStatus(provider, status) {
  if (provider === 'asaas') return isAsaasPaidStatus(status);
  return String(status || '').toLowerCase() === 'approved';
}

async function maybeSendApprovedEmail({ repo, provider, status, orderId, result, emailService }) {
  if (!result.processed || !orderId) return;
  if (!isApprovedStatus(provider, status)) return;
  if (typeof repo.getOrderForNotification !== 'function') return;
  const order = await repo.getOrderForNotification(orderId);
  const email = await sendPaymentApprovedIfNeeded({ orderResult: { order, storage: result.storage }, emailService });
  if (email) result.email = email;
}

function createPaymentsHandler({
  repo = paymentRepo,
  paymentProvider,
  appConfig = process.env,
  emailService = createEmailClient(appConfig),
  authRepo = authRepoDefault,
} = {}) {
  const provider = paymentProvider || resolvePaymentProvider(appConfig);

  return async function handlePaymentsRequest(req, res, corsOrigin) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (!url.pathname.startsWith('/api/payments')) return false;

    try {
      if (url.pathname === '/api/payments/create-preference' && req.method === 'POST') {
        const sessionId = getSessionId(req);
        if (!sessionId) {
          sendJson(res, 400, { error: 'Sessao invalida.' }, corsOrigin);
          return true;
        }
        const payload = await readJson(req);
        const orderId = typeof payload.orderId === 'string' ? payload.orderId.trim() : '';
        if (!orderId) {
          sendJson(res, 400, { error: 'Pedido invalido.' }, corsOrigin);
          return true;
        }
        const customerEmail = await getCustomerEmail(req, authRepo);
        const order = await repo.getOrderForPayment(orderId, sessionId, customerEmail);
        if (!order) {
          sendJson(res, 404, { error: 'Pedido nao encontrado.' }, corsOrigin);
          return true;
        }
        const checkout = await provider.createCheckout({ order });
        await repo.createPaymentPreferenceRecord({
          provider: checkout.provider,
          orderId,
          sessionId,
          customerEmail,
          checkoutId: checkout.checkoutId,
        });
        sendJson(res, 200, {
          provider: checkout.provider,
          preferenceId: checkout.checkoutId,
          initPoint: checkout.redirectUrl,
          sandbox: checkout.sandbox,
        }, corsOrigin);
        return true;
      }

      if (url.pathname === '/api/payments/webhook' && req.method === 'POST') {
        const payload = await readJson(req);

        // ── Asaas ──────────────────────────────────────────────
        if (looksLikeAsaasWebhook(payload)) {
          if (!verifyAsaasWebhook(req, appConfig)) {
            sendJson(res, 401, { error: 'Webhook invalido.' }, corsOrigin);
            return true;
          }
          const node = payload.payment || payload.checkout || {};
          const externalId = node.id || null;
          const orderId = node.externalReference || payload.externalReference || null;
          const status = node.status || (payload.event === 'CHECKOUT_PAID' ? 'CONFIRMED' : undefined);
          const eventId = String(
            payload.id || [payload.event || 'asaas', externalId || 'unknown', status || 'unknown'].join(':'),
          );
          const result = await repo.processPaymentWebhook({
            provider: 'asaas',
            eventId,
            eventType: payload.event || 'payment',
            externalId,
            orderId,
            status,
            payload,
          });
          await maybeSendApprovedEmail({ repo, provider: 'asaas', status, orderId, result, emailService });
          sendJson(res, 200, { ok: true, ...result }, corsOrigin);
          return true;
        }

        // ── Mercado Pago (legado / rollback) ───────────────────
        if (!verifyMercadoPagoWebhook(req, url, payload, appConfig)) {
          sendJson(res, 401, { error: 'Webhook invalido.' }, corsOrigin);
          return true;
        }
        const externalId = payload.externalId || payload.data?.id || url.searchParams.get('data.id') || null;
        let status = payload.status;
        let orderId = payload.orderId || payload.external_reference || null;
        if (!status && externalId && typeof provider.getPayment === 'function') {
          const payment = await provider.getPayment(externalId);
          status = payment?.status;
          orderId = orderId || payment?.external_reference || null;
        }
        const eventId = String(payload.eventId || [
          payload.action || payload.type || url.searchParams.get('type') || 'payment',
          externalId || 'unknown',
          status || 'unknown',
          payload.date_created || '',
        ].filter(Boolean).join(':') || `evt_${Date.now()}`);
        const result = await repo.processPaymentWebhook({
          provider: 'mercado_pago',
          eventId,
          eventType: payload.type || 'payment',
          externalId,
          orderId,
          status,
          payload,
        });
        await maybeSendApprovedEmail({ repo, provider: 'mercado_pago', status, orderId, result, emailService });
        sendJson(res, 200, { ok: true, ...result }, corsOrigin);
        return true;
      }

      sendJson(res, 404, { error: 'Rota de pagamento nao encontrada.' }, corsOrigin);
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
      sendJson(res, err.statusCode || 500, { error: err.statusCode ? err.message : 'Erro de pagamento.' }, corsOrigin);
      return true;
    }
  };
}

module.exports = {
  createPaymentsHandler,
  parseMercadoPagoSignature,
  verifyMercadoPagoSignature,
  verifyMercadoPagoWebhook,
  verifyAsaasWebhook,
  looksLikeAsaasWebhook,
  // alias mantido para compatibilidade
  verifyWebhook: verifyMercadoPagoWebhook,
};
