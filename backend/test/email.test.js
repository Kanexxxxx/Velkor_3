const assert = require('node:assert/strict');
const test = require('node:test');

test('email service uses safe dev mode when SMTP is not configured', async () => {
  const { createEmailClient } = require('../src/services/email');
  const client = createEmailClient({ EMAIL_DEV_MODE: 'true' });

  const result = await client.sendEmail({
    to: 'customer@example.com',
    subject: 'VELKOR test',
    text: 'hello',
    html: '<p>hello</p>',
    template: 'test',
  });

  assert.deepEqual(result, { sent: false, mode: 'dev', template: 'test', to: 'customer@example.com' });
});

test('email templates build password reset, order confirmation, and shipped content', () => {
  const { passwordResetTemplate, orderConfirmationTemplate, orderShippedTemplate } = require('../src/services/email-templates');

  const reset = passwordResetTemplate({ resetUrl: 'https://velkor.test/reset?token=raw-token' });
  const order = orderConfirmationTemplate({
    order: {
      id: 'ord_1',
      total: 199.9,
      items: [{ productId: 'v01', quantity: 2 }],
    },
  });
  const shipped = orderShippedTemplate({ order: { id: 'ord_1' } });

  assert.match(reset.subject, /redefinir sua senha/i);
  assert.match(reset.text, /https:\/\/velkor\.test\/reset\?token=raw-token/);
  assert.match(order.subject, /pedido/i);
  assert.match(order.text, /ord_1/);
  assert.match(order.text, /parabens/i);
  assert.match(shipped.subject, /enviado/i);
  assert.match(shipped.text, /ord_1/);
});

test('order email helper sends confirmation only when an order exists', async () => {
  const { sendOrderConfirmationIfNeeded } = require('../src/services/order-email');
  const sent = [];
  const emailService = {
    sendOrderConfirmation: async payload => {
      sent.push(payload);
      return { sent: false, mode: 'dev' };
    },
  };

  const result = await sendOrderConfirmationIfNeeded({
    orderResult: { order: { id: 'ord_2', contact: { email: 'buyer@example.com' }, total: 99, items: [] }, storage: 'database' },
    emailService,
  });
  const skipped = await sendOrderConfirmationIfNeeded({
    orderResult: { order: null, storage: 'demo' },
    emailService,
  });

  assert.equal(result.mode, 'dev');
  assert.equal(sent[0].to, 'buyer@example.com');
  assert.equal(skipped, null);
});

test('order email helper sends shipped email only for fulfilled orders', async () => {
  const { sendOrderShippedIfNeeded } = require('../src/services/order-email');
  const sent = [];
  const emailService = {
    sendOrderShipped: async payload => {
      sent.push(payload);
      return { sent: false, mode: 'dev' };
    },
  };

  const result = await sendOrderShippedIfNeeded({
    orderResult: { order: { id: 'ord_3', status: 'shipped', email: 'buyer@example.com' }, storage: 'database' },
    emailService,
  });
  const skipped = await sendOrderShippedIfNeeded({
    orderResult: { order: { id: 'ord_4', status: 'paid', email: 'buyer@example.com' }, storage: 'database' },
    emailService,
  });

  assert.equal(result.mode, 'dev');
  assert.equal(sent[0].to, 'buyer@example.com');
  assert.equal(skipped, null);
});

test('newsletter unsubscribe is idempotent without database config', async () => {
  delete process.env.DATABASE_URL;
  const { unsubscribeNewsletter } = require('../src/db/newsletter');
  const calls = [];

  const result = await unsubscribeNewsletter(' Customer@Example.com ', email => {
    calls.push(email);
    return { ok: true };
  });

  assert.deepEqual(result, { ok: true, storage: 'json' });
  assert.deepEqual(calls, ['customer@example.com']);
});
