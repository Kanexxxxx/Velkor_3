const { getPrisma } = require('./client');

const ORDER_STATUS_TO_PRISMA = {
  pending: 'PENDING',
  paid: 'PAID',
  fulfilled: 'FULFILLED',
  cancelled: 'CANCELLED',
};

function normalizeText(value, max = 120) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function toAdminUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
    demoUser: Boolean(user.demoUser),
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
    updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt,
  };
}

function toAdminCoupon(coupon) {
  if (!coupon) return null;
  return {
    id: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    active: coupon.active,
    startsAt: coupon.startsAt ? coupon.startsAt.toISOString() : null,
    expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
    maxRedemptions: coupon.maxRedemptions,
    redeemedCount: coupon.redeemedCount,
    createdAt: coupon.createdAt instanceof Date ? coupon.createdAt.toISOString() : coupon.createdAt,
    updatedAt: coupon.updatedAt instanceof Date ? coupon.updatedAt.toISOString() : coupon.updatedAt,
  };
}

function toNewsletterSubscriber(subscriber) {
  if (!subscriber) return null;
  return {
    id: subscriber.id,
    email: subscriber.email,
    source: subscriber.source,
    isActive: subscriber.isActive,
    subscribedAt: subscriber.subscribedAt instanceof Date ? subscriber.subscribedAt.toISOString() : subscriber.subscribedAt,
    updatedAt: subscriber.updatedAt instanceof Date ? subscriber.updatedAt.toISOString() : subscriber.updatedAt,
  };
}

function validateCouponPayload(payload) {
  if (!payload || typeof payload !== 'object') return { error: 'Payload invalido.' };

  const code = normalizeText(payload.code, 40).toUpperCase();
  const discountType = payload.discountType === 'FIXED' ? 'FIXED' : 'PERCENT';
  const discountValue = Number(payload.discountValue);
  const active = typeof payload.active === 'boolean' ? payload.active : true;
  const maxRedemptions = payload.maxRedemptions === null || payload.maxRedemptions === undefined || payload.maxRedemptions === ''
    ? null
    : Number(payload.maxRedemptions);

  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return { error: 'Codigo de cupom invalido.' };
  if (!Number.isInteger(discountValue) || discountValue <= 0) return { error: 'Desconto invalido.' };
  if (discountType === 'PERCENT' && discountValue > 100) return { error: 'Cupom percentual invalido.' };
  if (maxRedemptions !== null && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1)) return { error: 'Limite de usos invalido.' };

  return {
    value: {
      code,
      discountType,
      discountValue,
      active,
      startsAt: payload.startsAt ? new Date(payload.startsAt) : null,
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
      maxRedemptions,
    },
  };
}

function toApiOrder(order) {
  return {
    id: order.id,
    userId: order.userId || undefined,
    status: order.status === 'PENDING' ? 'pending' : order.status.toLowerCase(),
    email: order.email,
    contactName: order.contactName || '',
    total: order.totalCents / 100,
    subtotal: order.subtotalCents / 100,
    discount: order.discountCents / 100,
    shippingCost: order.shippingCents / 100,
    coupon: order.couponCode || undefined,
    payment: order.paymentMethod || 'card',
    shipping: order.shippingMethod || 'standard',
    items: (order.items || []).map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      size: item.size || '',
      color: item.color || '',
    })),
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
  };
}

async function logAdminAction(txOrPrisma, { adminUserId, action, targetType, targetId, metadata = {} }) {
  if (!txOrPrisma?.adminAuditLog) return null;
  return txOrPrisma.adminAuditLog.create({
    data: {
      actorId: adminUserId,
      action,
      entity: targetType,
      entityId: targetId,
      metadata: {
        adminUserId,
        targetType,
        targetId,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    },
  });
}

async function listAdminOrders() {
  const prisma = getPrisma();
  if (!prisma) return { orders: [], storage: 'demo' };

  const orders = await prisma.order.findMany({
    include: { items: true, shippingAddress: true },
    orderBy: { createdAt: 'desc' },
  });
  return { orders: orders.map(toApiOrder), storage: 'database' };
}

async function updateOrderStatus(id, status, adminUserId) {
  const prisma = getPrisma();
  if (!prisma) return { order: null, storage: 'demo' };
  const prismaStatus = ORDER_STATUS_TO_PRISMA[status];
  if (!prismaStatus) {
    const error = new Error('Status invalido.');
    error.statusCode = 400;
    throw error;
  }

  const order = await prisma.$transaction(async tx => {
    const updated = await tx.order.update({
      where: { id },
      data: { status: prismaStatus },
      include: { items: true, shippingAddress: true },
    });
    await logAdminAction(tx, { adminUserId, action: 'order.status.update', targetType: 'order', targetId: id, metadata: { status } });
    return updated;
  });
  return { order: toApiOrder(order), storage: 'database' };
}

async function listAdminUsers() {
  const prisma = getPrisma();
  if (!prisma) return { users: [], storage: 'demo' };
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  return { users: users.map(toAdminUser), storage: 'database' };
}

async function updateAdminUser(id, patch, adminUserId) {
  const prisma = getPrisma();
  if (!prisma) return { user: null, storage: 'demo' };

  const data = {};
  if (patch.role === 'ADMIN' || patch.role === 'CUSTOMER') data.role = patch.role;
  if (typeof patch.emailVerified === 'boolean') data.emailVerified = patch.emailVerified;

  const user = await prisma.$transaction(async tx => {
    const updated = await tx.user.update({ where: { id }, data });
    await logAdminAction(tx, { adminUserId, action: 'user.update', targetType: 'user', targetId: id, metadata: data });
    return updated;
  });
  return { user: toAdminUser(user), storage: 'database' };
}

async function listCoupons() {
  const prisma = getPrisma();
  if (!prisma) return { coupons: [], storage: 'demo' };
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  return { coupons: coupons.map(toAdminCoupon), storage: 'database' };
}

async function createCoupon(payload, adminUserId) {
  const prisma = getPrisma();
  if (!prisma) return { coupon: null, storage: 'demo' };
  const parsed = validateCouponPayload(payload);
  if (parsed.error) {
    const error = new Error(parsed.error);
    error.statusCode = 400;
    throw error;
  }

  const coupon = await prisma.$transaction(async tx => {
    const created = await tx.coupon.create({ data: parsed.value });
    await logAdminAction(tx, { adminUserId, action: 'coupon.create', targetType: 'coupon', targetId: created.id, metadata: { code: created.code } });
    return created;
  });
  return { coupon: toAdminCoupon(coupon), storage: 'database' };
}

async function updateCoupon(id, payload, adminUserId) {
  const prisma = getPrisma();
  if (!prisma) return { coupon: null, storage: 'demo' };
  const parsed = validateCouponPayload(payload);
  if (parsed.error) {
    const error = new Error(parsed.error);
    error.statusCode = 400;
    throw error;
  }

  const coupon = await prisma.$transaction(async tx => {
    const updated = await tx.coupon.update({ where: { id }, data: parsed.value });
    await logAdminAction(tx, { adminUserId, action: 'coupon.update', targetType: 'coupon', targetId: id, metadata: { code: updated.code } });
    return updated;
  });
  return { coupon: toAdminCoupon(coupon), storage: 'database' };
}

async function listNewsletterSubscribers() {
  const prisma = getPrisma();
  if (!prisma) return { subscribers: [], storage: 'demo' };
  const subscribers = await prisma.newsletterSubscriber.findMany({ orderBy: { subscribedAt: 'desc' } });
  return { subscribers: subscribers.map(toNewsletterSubscriber), storage: 'database' };
}

async function updateNewsletterSubscriber(id, patch, adminUserId) {
  const prisma = getPrisma();
  if (!prisma) return { subscriber: null, storage: 'demo' };
  const data = {};
  if (typeof patch.isActive === 'boolean') data.isActive = patch.isActive;

  const subscriber = await prisma.$transaction(async tx => {
    const updated = await tx.newsletterSubscriber.update({ where: { id }, data });
    await logAdminAction(tx, { adminUserId, action: 'newsletter.update', targetType: 'newsletter', targetId: id, metadata: data });
    return updated;
  });
  return { subscriber: toNewsletterSubscriber(subscriber), storage: 'database' };
}

module.exports = {
  createCoupon,
  listAdminOrders,
  listAdminUsers,
  listCoupons,
  listNewsletterSubscribers,
  logAdminAction,
  toAdminUser,
  updateAdminUser,
  updateCoupon,
  updateNewsletterSubscriber,
  updateOrderStatus,
  validateCouponPayload,
};
