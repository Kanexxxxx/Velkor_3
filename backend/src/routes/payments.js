const paymentRepo = require('../db/payments');
const { getSessionId } = require('../db/session');
const { createMercadoPagoClient } = require('../services/mercado-pago');
const { sendJson } = require('./guards');

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

function verifyWebhook(req, appConfig) {
  const secret = appConfig.MERCADO_PAGO_WEBHOOK_SECRET || '';
  if (!secret) return true;
  return req.headers['x-velkor-webhook-secret'] === secret;
}

function createPaymentsHandler({ repo = paymentRepo, mercadoPago = createMercadoPagoClient(), appConfig = process.env } = {}) {
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
        const order = await repo.getOrderForPayment(orderId, sessionId);
        if (!order) {
          sendJson(res, 404, { error: 'Pedido nao encontrado.' }, corsOrigin);
          return true;
        }
        const preference = await mercadoPago.createPreference({ order });
        await repo.createPaymentPreferenceRecord({ orderId, sessionId, preferenceId: preference.preferenceId });
        sendJson(res, 200, preference, corsOrigin);
        return true;
      }

      if (url.pathname === '/api/payments/webhook' && req.method === 'POST') {
        if (!verifyWebhook(req, appConfig)) {
          sendJson(res, 401, { error: 'Webhook invalido.' }, corsOrigin);
          return true;
        }
        const payload = await readJson(req);
        const eventId = String(payload.eventId || payload.id || payload.data?.id || `evt_${Date.now()}`);
        const externalId = payload.externalId || payload.data?.id || null;
        let status = payload.status;
        let orderId = payload.orderId || payload.external_reference || null;
        if (!status && externalId) {
          const payment = await mercadoPago.getPayment(externalId);
          status = payment?.status;
          orderId = orderId || payment?.external_reference || null;
        }
        const result = await repo.processPaymentWebhook({
          eventId,
          eventType: payload.type || 'payment',
          externalId,
          orderId,
          status,
          payload,
        });
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

module.exports = { createPaymentsHandler, verifyWebhook };
