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
