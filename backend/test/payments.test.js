const assert = require('node:assert/strict');
const test = require('node:test');

test('payments map mercado pago statuses to internal payment and order status', () => {
  const { mapMercadoPagoStatus } = require('../src/db/payments');

  assert.deepEqual(mapMercadoPagoStatus('approved'), { paymentStatus: 'APPROVED', orderStatus: 'PAID' });
  assert.deepEqual(mapMercadoPagoStatus('rejected'), { paymentStatus: 'REJECTED', orderStatus: null });
  assert.deepEqual(mapMercadoPagoStatus('refunded'), { paymentStatus: 'REFUNDED', orderStatus: null });
  assert.deepEqual(mapMercadoPagoStatus('in_process'), { paymentStatus: 'PENDING', orderStatus: null });
});

test('payments repository returns demo preference when database is not configured', async () => {
  delete process.env.DATABASE_URL;
  const { createPaymentPreferenceRecord, processPaymentWebhook } = require('../src/db/payments');

  const preference = await createPaymentPreferenceRecord({ orderId: 'ord_demo', sessionId: 'guest_demo', preferenceId: 'pref_demo' });
  const webhook = await processPaymentWebhook({ eventId: 'evt_demo', eventType: 'payment', externalId: 'pay_demo', orderId: 'ord_demo', status: 'approved', payload: {} });

  assert.deepEqual(preference, { order: null, storage: 'demo' });
  assert.deepEqual(webhook, { processed: false, duplicate: false, storage: 'demo' });
});

test('mercado pago client returns dev preference without access token', async () => {
  const { createMercadoPagoClient } = require('../src/services/mercado-pago');
  const client = createMercadoPagoClient({ MERCADO_PAGO_DEV_MODE: 'true' });

  const preference = await client.createPreference({ order: { id: 'ord_1', totalCents: 12345, items: [] } });

  assert.equal(preference.sandbox, true);
  assert.equal(preference.preferenceId, 'dev_ord_1');
  assert.match(preference.initPoint, /dev_ord_1/);
});

test('payments route rejects webhook when configured secret is invalid', async () => {
  const { createPaymentsHandler } = require('../src/routes/payments');
  const req = require('node:stream').Readable.from([JSON.stringify({ eventId: 'evt_1' })]);
  req.method = 'POST';
  req.url = '/api/payments/webhook';
  req.headers = { host: 'localhost:3001', 'x-velkor-webhook-secret': 'wrong' };
  req.socket = { remoteAddress: '127.0.0.1' };
  const res = {
    statusCode: 0,
    body: '',
    writeHead(statusCode) { this.statusCode = statusCode; },
    end(body = '') { this.body = body; },
  };
  const handler = createPaymentsHandler({ appConfig: { MERCADO_PAGO_WEBHOOK_SECRET: 'secret' } });

  assert.equal(await handler(req, res, null), true);
  assert.equal(res.statusCode, 401);
});
