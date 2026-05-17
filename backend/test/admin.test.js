const assert = require('node:assert/strict');
const test = require('node:test');

test('admin normalizes and validates coupon payloads', () => {
  const { validateCouponPayload } = require('../src/db/admin');

  assert.deepEqual(validateCouponPayload({ code: ' velkor20 ', discountType: 'PERCENT', discountValue: 20 }).value, {
    code: 'VELKOR20',
    discountType: 'PERCENT',
    discountValue: 20,
    active: true,
    startsAt: null,
    expiresAt: null,
    maxRedemptions: null,
  });
  assert.equal(validateCouponPayload({ code: 'ABC', discountType: 'PERCENT', discountValue: 101 }).error, 'Cupom percentual invalido.');
});

test('admin maps public users without password hashes', () => {
  const { toAdminUser } = require('../src/db/admin');
  const user = toAdminUser({
    id: 'u1',
    email: 'a@b.com',
    name: null,
    role: 'ADMIN',
    emailVerified: true,
    passwordHash: 'secret',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  });

  assert.equal(user.passwordHash, undefined);
  assert.equal(user.role, 'ADMIN');
  assert.equal(user.email, 'a@b.com');
});
