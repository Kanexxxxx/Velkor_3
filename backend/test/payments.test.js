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

test('mercado pago client uses real sandbox preference when dev mode has access token', async () => {
  const { createMercadoPagoClient } = require('../src/services/mercado-pago');
  const originalFetch = global.fetch;
  let requestBody = null;
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.mercadopago.com/checkout/preferences');
    assert.equal(options.headers.Authorization, 'Bearer TEST-123');
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        id: 'pref_real_test',
        init_point: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_real_test',
        sandbox_init_point: 'https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_real_test',
      }),
    };
  };

  try {
    const client = createMercadoPagoClient({ MERCADO_PAGO_DEV_MODE: 'true', MERCADO_PAGO_ACCESS_TOKEN: 'TEST-123' });
    const preference = await client.createPreference({
      order: {
        id: 'ord_2',
        totalCents: 4590,
        contactName: 'Kaina Rodrigues',
        email: 'kaina@example.com',
        items: [{ name: 'Produto VELKOR', quantity: 1, unitPriceCents: 4590 }],
      },
    });

    assert.equal(preference.preferenceId, 'pref_real_test');
    assert.equal(preference.initPoint, 'https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_real_test');
    assert.equal(preference.sandbox, true);
    assert.equal(requestBody.external_reference, 'ord_2');
    assert.equal(requestBody.items[0].unit_price, 45.9);
  } finally {
    global.fetch = originalFetch;
  }
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
