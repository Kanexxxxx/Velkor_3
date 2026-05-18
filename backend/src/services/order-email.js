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

async function sendOrderShippedIfNeeded({ orderResult, emailService = createEmailClient() }) {
  if (!orderResult?.order || orderResult.storage !== 'database') return null;
  if (!['shipped', 'fulfilled'].includes(String(orderResult.order.status || '').toLowerCase())) return null;
  const to = getOrderEmail(orderResult.order);
  if (!to) return null;

  try {
    return await emailService.sendOrderShipped({ to, order: orderResult.order });
  } catch (err) {
    console.warn(`email.order_shipped.failed order=${orderResult.order.id} message=${err instanceof Error ? err.message : 'unknown'}`);
    return { sent: false, mode: 'error' };
  }
}

async function sendPaymentApprovedIfNeeded({ orderResult, emailService = createEmailClient() }) {
  if (!orderResult?.order || orderResult.storage !== 'database') return null;
  const status = String(orderResult.order.status || '').toLowerCase();
  const paymentStatus = String(orderResult.order.paymentStatus || '').toLowerCase();
  if (!['paid', 'processing', 'shipped', 'fulfilled'].includes(status) && paymentStatus !== 'approved') return null;
  const to = getOrderEmail(orderResult.order);
  if (!to) return null;

  try {
    return await emailService.sendOrderPaymentApproved({ to, order: orderResult.order });
  } catch (err) {
    console.warn(`email.payment_approved.failed order=${orderResult.order.id} message=${err instanceof Error ? err.message : 'unknown'}`);
    return { sent: false, mode: 'error' };
  }
}

module.exports = { sendOrderConfirmationIfNeeded, sendOrderShippedIfNeeded, sendPaymentApprovedIfNeeded };
