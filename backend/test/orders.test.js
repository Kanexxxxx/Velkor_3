const assert = require('node:assert/strict');
const test = require('node:test');

test('orders repository returns empty demo list when database is not configured', async () => {
  delete process.env.DATABASE_URL;

  const { listOrders } = require('../src/db/orders');

  const result = await listOrders('guest-orders-test');

  assert.deepEqual(result, { orders: [], storage: 'demo' });
});

test('order payload validation rejects empty items and invalid quantity', () => {
  const { validateOrderInput } = require('../src/db/orders');

  assert.equal(validateOrderInput({ items: [] }).error, 'Carrinho vazio.');
  assert.equal(validateOrderInput({
    items: [{ productId: 'v01', quantity: 100, size: '42', color: '#0a0a0a' }],
    contact: { name: 'Kaina', email: 'kaina@example.com' },
    address: { recipient: 'Kaina', street: 'Rua A', city: 'Sao Paulo', region: 'SP', postalCode: '14000-000', country: 'Brasil' },
    shipping: 'standard',
    payment: 'pix',
  }).error, 'Quantidade invalida.');
});

test('order totals are calculated from product prices, shipping, and coupon', async () => {
  const { buildOrderQuote } = require('../src/db/orders');

  const prisma = {
    product: {
      findMany: async () => [
        { id: 'v01', name: 'Produto 1', priceCents: 10000, active: true },
        { id: 'v02', name: 'Produto 2', priceCents: 5000, active: true },
      ],
    },
    coupon: {
      findUnique: async () => ({ code: 'VELKOR15', active: true, discountType: 'PERCENT', discountValue: 15, startsAt: null, expiresAt: null }),
    },
  };

  const quote = await buildOrderQuote(prisma, {
    items: [
      { productId: 'v01', quantity: 2, size: '42', color: '#0a0a0a' },
      { productId: 'v02', quantity: 1, size: 'ONE', color: '#fff' },
    ],
    coupon: 'VELKOR15',
    shipping: 'express',
  });

  assert.equal(quote.subtotalCents, 25000);
  assert.equal(quote.discountCents, 3750);
  assert.equal(quote.shippingCents, 3900);
  assert.equal(quote.totalCents, 25150);
});
