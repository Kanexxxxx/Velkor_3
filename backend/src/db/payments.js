const { getPrisma } = require('./client');

function mapMercadoPagoStatus(status) {
  if (status === 'approved') return { paymentStatus: 'APPROVED', orderStatus: 'PAID' };
  if (status === 'rejected') return { paymentStatus: 'REJECTED', orderStatus: null };
  if (status === 'refunded') return { paymentStatus: 'REFUNDED', orderStatus: null };
  return { paymentStatus: 'PENDING', orderStatus: null };
}

async function getOrderForPayment(orderId, sessionId) {
  const prisma = getPrisma();
  if (!prisma) return null;
  return prisma.order.findFirst({
    where: { id: orderId, sessionId },
    include: { items: true },
  });
}

async function getOrderForNotification(orderId) {
  const prisma = getPrisma();
  if (!prisma || !orderId) return null;
  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, shippingAddress: true },
  });
}

async function createPaymentPreferenceRecord({ orderId, sessionId, preferenceId }) {
  const prisma = getPrisma();
  if (!prisma) return { order: null, storage: 'demo' };

  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentProvider: 'mercado_pago',
      paymentPreferenceId: preferenceId,
      paymentStatus: 'PENDING',
    },
  });

  if (sessionId && order.sessionId !== sessionId) {
    const error = new Error('Pedido nao encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return { order, storage: 'database' };
}

async function processPaymentWebhook({ eventId, eventType, externalId, orderId, status, payload }) {
  const prisma = getPrisma();
  if (!prisma) return { processed: false, duplicate: false, storage: 'demo' };

  const existing = await prisma.paymentWebhookEvent.findUnique({ where: { eventId } });
  if (existing) return { processed: false, duplicate: true, storage: 'database' };

  const mapped = mapMercadoPagoStatus(status);
  await prisma.$transaction(async tx => {
    await tx.paymentWebhookEvent.create({
      data: {
        provider: 'mercado_pago',
        eventId,
        eventType,
        externalId,
        orderId,
        payload,
      },
    });

    if (orderId) {
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentProvider: 'mercado_pago',
          paymentExternalId: externalId,
          paymentStatus: mapped.paymentStatus,
          ...(mapped.orderStatus ? { status: mapped.orderStatus } : {}),
          ...(mapped.paymentStatus === 'APPROVED' ? { paidAt: new Date() } : {}),
        },
      });
    }
  });

  return { processed: true, duplicate: false, storage: 'database' };
}

module.exports = {
  createPaymentPreferenceRecord,
  getOrderForNotification,
  getOrderForPayment,
  mapMercadoPagoStatus,
  processPaymentWebhook,
};
