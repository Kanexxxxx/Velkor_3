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

test('email templates build password reset and order confirmation content', () => {
  const { passwordResetTemplate, orderConfirmationTemplate } = require('../src/services/email-templates');

  const reset = passwordResetTemplate({ resetUrl: 'https://velkor.test/reset?token=raw-token' });
  const order = orderConfirmationTemplate({
    order: {
      id: 'ord_1',
      total: 199.9,
      items: [{ productId: 'v01', quantity: 2 }],
    },
  });

  assert.match(reset.subject, /redefinir sua senha/i);
  assert.match(reset.text, /https:\/\/velkor\.test\/reset\?token=raw-token/);
  assert.match(order.subject, /pedido/i);
  assert.match(order.text, /ord_1/);
});
