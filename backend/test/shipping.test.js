const assert = require('node:assert/strict');
const test = require('node:test');

test('shipping client maps Melhor Envio responses into checkout quotes', async () => {
  const { createShippingClient } = require('../src/services/shipping');
  const client = createShippingClient({
    MELHOR_ENVIO_ACCESS_TOKEN: 'token',
    MELHOR_ENVIO_ORIGIN_CEP: '14000-000',
    MELHOR_ENVIO_ENV: 'sandbox',
  }, {
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.from.postal_code, '14000000');
      assert.equal(body.to.postal_code, '14030410');
      return {
        ok: true,
        json: async () => [
          { id: 1, name: 'SEDEX', price: '12.82', delivery_time: 3 },
          { id: 2, name: 'PAC', error: 'Servico indisponivel' },
        ],
      };
    },
  });

  const result = await client.quoteShipping({
    toPostalCode: '14030-410',
    items: [{ productId: 'v01', quantity: 2, unitPriceCents: 10000 }],
    subtotalCents: 20000,
  });

  assert.deepEqual(result.quotes, [
    { id: 'melhor-envio:1', provider: 'melhor-envio', name: 'SEDEX', price: 12.82, priceCents: 1282, deliveryTime: 3 },
  ]);
});
