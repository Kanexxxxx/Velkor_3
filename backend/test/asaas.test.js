const assert = require('node:assert/strict');
const test = require('node:test');

test('asaas maps provider statuses to internal payment and order status', () => {
  const { mapAsaasStatus } = require('../src/services/asaas');

  assert.deepEqual(mapAsaasStatus('CONFIRMED'), { paymentStatus: 'APPROVED', orderStatus: 'PAID' });
  assert.deepEqual(mapAsaasStatus('RECEIVED'), { paymentStatus: 'APPROVED', orderStatus: 'PAID' });
  assert.deepEqual(mapAsaasStatus('REFUNDED'), { paymentStatus: 'REFUNDED', orderStatus: null });
  assert.deepEqual(mapAsaasStatus('OVERDUE'), { paymentStatus: 'REJECTED', orderStatus: null });
  assert.deepEqual(mapAsaasStatus('PENDING'), { paymentStatus: 'PENDING', orderStatus: null });
});

test('db/payments dispatches status mapping by provider', () => {
  const { mapProviderStatus } = require('../src/db/payments');

  assert.deepEqual(mapProviderStatus('asaas', 'RECEIVED'), { paymentStatus: 'APPROVED', orderStatus: 'PAID' });
  assert.deepEqual(mapProviderStatus('mercado_pago', 'approved'), { paymentStatus: 'APPROVED', orderStatus: 'PAID' });
});

test('asaas client returns a dev checkout when no API key is set', async () => {
  const { createAsaasClient } = require('../src/services/asaas');
  const client = createAsaasClient({ VELKOR_PUBLIC_URL: 'https://volkerr.com.br' });

  const checkout = await client.createCheckout({ order: { id: 'ord_1', totalCents: 9900, items: [] } });

  assert.equal(checkout.provider, 'asaas');
  assert.equal(checkout.sandbox, true);
  assert.equal(checkout.checkoutId, 'dev_ord_1');
  assert.match(checkout.redirectUrl, /mock_payment=ord_1/);
});

test('asaas client creates a real hosted checkout from an order', async () => {
  const { createAsaasClient } = require('../src/services/asaas');
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.headers.access_token, 'aact_test_123');
    return {
      ok: true,
      json: async () => ({ id: 'chk_abc', link: 'https://sandbox.asaas.com/checkoutSession/show?id=chk_abc' }),
    };
  };

  try {
    const client = createAsaasClient({
      ASAAS_API_KEY: 'aact_test_123',
      ASAAS_API_URL: 'https://sandbox.asaas.com/api/v3',
      ASAAS_DEV_MODE: 'true',
      VELKOR_PUBLIC_URL: 'https://volkerr.com.br',
    });
    const checkout = await client.createCheckout({
      order: {
        id: 'ord_2',
        totalCents: 27980,
        shippingCents: 1990,
        discountCents: 0,
        contactName: 'Kaina Rodrigues',
        email: 'kaina@example.com',
        contactPhone: '16991557552',
        items: [{ productId: 'sku-1', name: 'Tenis VELKOR', quantity: 2, unitPriceCents: 12995 }],
      },
    });

    assert.equal(checkout.provider, 'asaas');
    assert.equal(checkout.checkoutId, 'chk_abc');
    assert.equal(checkout.redirectUrl, 'https://sandbox.asaas.com/checkoutSession/show?id=chk_abc');
    assert.equal(checkout.sandbox, true);

    assert.equal(calls[0].url, 'https://sandbox.asaas.com/api/v3/checkouts');
    const body = JSON.parse(calls[0].options.body);
    assert.equal(body.externalReference, 'ord_2');
    assert.deepEqual(body.billingTypes, ['PIX', 'CREDIT_CARD', 'BOLETO']);
    assert.equal(body.items[0].name, 'Tenis VELKOR');
    assert.equal(body.items[0].quantity, 2);
    assert.equal(body.items[0].value, 129.95);
    assert.equal(body.items[1].name, 'Frete');
    assert.equal(body.items[1].value, 19.9);
    assert.equal(body.customerData.email, 'kaina@example.com');
    assert.equal(body.callback.successUrl, 'https://volkerr.com.br/account?tab=orders');
  } finally {
    global.fetch = originalFetch;
  }
});

test('payment provider selector honours PAYMENT_PROVIDER', () => {
  const { resolvePaymentProvider, normalizeProviderId } = require('../src/services/payment-provider');

  assert.equal(normalizeProviderId('ASAAS'), 'asaas');
  assert.equal(normalizeProviderId('mercadopago'), 'mercado_pago');
  assert.equal(normalizeProviderId(undefined), 'mercado_pago');

  assert.equal(resolvePaymentProvider({ PAYMENT_PROVIDER: 'asaas' }).id, 'asaas');
  assert.equal(resolvePaymentProvider({ PAYMENT_PROVIDER: 'mercado_pago' }).id, 'mercado_pago');
});
