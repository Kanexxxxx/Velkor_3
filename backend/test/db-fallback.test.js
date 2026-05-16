const assert = require('node:assert/strict');
const test = require('node:test');

test('product repository serves mock products when database is not configured', async () => {
  delete process.env.DATABASE_URL;

  const { listProducts, getProductBySlug } = require('../src/db/products');

  const products = await listProducts();
  assert.equal(products.length, 12);
  assert.equal(products[0].id, 'v01');

  const product = await getProductBySlug('v01');
  assert.equal(product.name, 'Estrato V03 - Carbono');
});

test('category repository serves seeded categories when database is not configured', async () => {
  delete process.env.DATABASE_URL;

  const { listCategories } = require('../src/db/products');

  const categories = await listCategories();
  assert.deepEqual(categories.map(category => category.slug), ['sneakers', 'apparel', 'accessories']);
});

test('newsletter repository uses JSON fallback when database is not configured', async () => {
  delete process.env.DATABASE_URL;

  const { subscribeNewsletter } = require('../src/db/newsletter');
  const calls = [];

  const result = await subscribeNewsletter('USER@Example.COM', email => {
    calls.push(email);
    return { duplicate: false };
  });

  assert.deepEqual(calls, ['user@example.com']);
  assert.deepEqual(result, { duplicate: false, storage: 'json' });
});
