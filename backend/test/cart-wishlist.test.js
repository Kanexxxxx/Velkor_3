const assert = require('node:assert/strict');
const test = require('node:test');

test('cart repository returns empty demo cart when database is not configured', async () => {
  delete process.env.DATABASE_URL;

  const { listCartItems } = require('../src/db/cart');

  const result = await listCartItems('guest-test-session');

  assert.deepEqual(result, { items: [], storage: 'demo' });
});

test('wishlist repository returns empty demo wishlist when database is not configured', async () => {
  delete process.env.DATABASE_URL;

  const { listWishlist } = require('../src/db/wishlist');

  const result = await listWishlist('guest-test-session');

  assert.deepEqual(result, { productIds: [], storage: 'demo' });
});

test('session helper accepts stable guest session ids and rejects unsafe values', () => {
  const { normalizeSessionId } = require('../src/db/session');

  assert.equal(normalizeSessionId('guest_abc-123.def'), 'guest_abc-123.def');
  assert.equal(normalizeSessionId(''), null);
  assert.equal(normalizeSessionId('../bad'), null);
  assert.equal(normalizeSessionId('a'.repeat(121)), null);
});
