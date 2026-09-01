const { getPrisma } = require('./client');
const { mapAsaasStatus } = require('../services/asaas');

function mapMercadoPagoStatus(status) {
  if (status === 'approved') return { paymentStatus: 'APPROVED', orderStatus: 'PAID' };
  if (status === 'rejected') return { paymentStatus: 'REJECTED', orderStatus: null };
  if (status === 'refunded') return { paymentStatus: 'REFUNDED', orderStatus: null };
  return { paymentStatus: 'PENDING', orderStatus: null };
}

function mapProviderStatus(provider, status) {
  if (provider === 'asaas') return mapAsaasStatus(status);
  return mapMercadoPagoStatus(status);
}

async function getOrderForPayment(orderId, sessionId, customerEmail = '') {
  const prisma = getPrisma();
  if (!prisma) return null;
  return prisma.order.findFirst({
    where: {
      id: orderId,
      OR: [
        { sessionId },
        ...(customerEmail ? [{ email: customerEmail }] : []),
      ],
    },
    include: { items: true, shippingAddress: true },
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

async function createPaymentPreferenceRecord({ orderId, sessionId, checkoutId, preferenceId, provider = 'mercado_pago', customerEmail = '' }) {
  const prisma = getPrisma();
  if (!prisma) return { order: null, storage: 'demo' };

  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentProvider: provider,
      paymentPreferenceId: checkoutId || preferenceId,
      paymentStatus: 'PENDING',
    },
  });

  if (sessionId && order.sessionId !== sessionId && (!customerEmail || order.email !== customerEmail)) {
    const error = new Error('Pedido nao encontrado.');
    error.statusCode = 404;
    throw error;
  }

  return { order, storage: 'database' };
}

async function processPaymentWebhook({ eventId, eventType, externalId, orderId, status, payload, provider = 'mercado_pago' }) {
  const prisma = getPrisma();
  if (!prisma) return { processed: false, duplicate: false, storage: 'demo' };

  const existing = await prisma.paymentWebhookEvent.findUnique({ where: { eventId } });
  if (existing) return { processed: false, duplicate: true, storage: 'database' };

  const mapped = mapProviderStatus(provider, status);
  await prisma.$transaction(async tx => {
    await tx.paymentWebhookEvent.create({
      data: {
        provider,
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
          paymentProvider: provider,
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
  mapProviderStatus,
  processPaymentWebhook,
};
