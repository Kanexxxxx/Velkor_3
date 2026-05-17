const { createEmailClient } = require('./email');

function getOrderEmail(order) {
  return order?.contact?.email || order?.email || '';
}

async function sendOrderConfirmationIfNeeded({ orderResult, emailService = createEmailClient() }) {
  if (!orderResult?.order || orderResult.storage !== 'database') return null;
  const to = getOrderEmail(orderResult.order);
  if (!to) return null;

  try {
    return await emailService.sendOrderConfirmation({ to, order: orderResult.order });
  } catch (err) {
    console.warn(`email.order_confirmation.failed order=${orderResult.order.id} message=${err instanceof Error ? err.message : 'unknown'}`);
    return { sent: false, mode: 'error' };
  }
}

module.exports = { sendOrderConfirmationIfNeeded };
