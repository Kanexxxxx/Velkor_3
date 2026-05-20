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

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function boolEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function hasSecret(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function buildAdminSettings(env = process.env) {
  return {
    store: {
      appName: env.VELKOR_APP_NAME || 'VELKOR',
      publicUrl: env.VELKOR_PUBLIC_URL || 'http://localhost:3000',
      supportEmail: env.VELKOR_SUPPORT_EMAIL || 'velkor.officiall@gmail.com',
      whatsapp: env.VELKOR_WHATSAPP || '',
      instagram: env.VELKOR_INSTAGRAM || '',
      allowedOrigins: String(env.ALLOWED_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean),
      legacyAdminUnlockEnabled: String(env.LEGACY_ADMIN_UNLOCK_ENABLED).toLowerCase() !== 'false' && hasSecret(env.ADMIN_SECRET),
    },
    integrations: {
      mercadoPago: {
        configured: hasSecret(env.MERCADO_PAGO_ACCESS_TOKEN),
        devMode: boolEnv(env.MERCADO_PAGO_DEV_MODE, true) || !hasSecret(env.MERCADO_PAGO_ACCESS_TOKEN),
        webhookConfigured: hasSecret(env.MERCADO_PAGO_WEBHOOK_SECRET),
      },
      email: {
        configured: hasSecret(env.GMAIL_USER) && hasSecret(env.GMAIL_PASS),
        devMode: boolEnv(env.EMAIL_DEV_MODE, true),
        user: env.GMAIL_USER || '',
      },
      melhorEnvio: {
        configured: hasSecret(env.MELHOR_ENVIO_ACCESS_TOKEN) && hasSecret(env.MELHOR_ENVIO_ORIGIN_CEP),
        env: env.MELHOR_ENVIO_ENV || 'sandbox',
        originCepConfigured: hasSecret(env.MELHOR_ENVIO_ORIGIN_CEP),
      },
    },
  };
}

function mapProductWriteError(error) {
  if (error?.code === 'P2002') {
    const conflict = new Error('Produto com ID ou slug ja cadastrado.');
    conflict.statusCode = 409;
    return conflict;
  }
  if (error?.code === 'P2025') {
    const missing = new Error('Produto nao encontrado.');
    missing.statusCode = 404;
    return missing;
  }
  return error;
}

function mapUserWriteError(error) {
  if (error?.code === 'P2002') {
    const conflict = new Error('Email ja cadastrado em outro cliente.');
    conflict.statusCode = 409;
    return conflict;
  }
  if (error?.code === 'P2025') {
    const missing = new Error('Cliente nao encontrado.');
    missing.statusCode = 404;
    return missing;
  }
  return error;
}

function toAdminAddress(address) {
  if (!address) return null;
  return {
    id: address.id,
    recipient: address.fullName || '',
    street: [address.street, address.number].filter(Boolean).join(', '),
    complement: address.complement || '',
    neighborhood: address.neighborhood || '',
    city: address.city || '',
    region: address.state || '',
    postalCode: address.postalCode || '',
    country: address.country || 'BR',
    phone: address.phone || '',
    createdAt: toIso(address.createdAt),
    updatedAt: toIso(address.updatedAt),
  };
}

function toAdminOrderSummary(order) {
  if (!order) return null;
  return {
    id: order.id,
    status: order.status === 'PENDING' ? 'pending' : String(order.status || '').toLowerCase(),
    total: Number(order.totalCents || 0) / 100,
    createdAt: toIso(order.createdAt),
  };
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
    addresses: Array.isArray(user.addresses) ? user.addresses.map(toAdminAddress).filter(Boolean) : [],
    orders: Array.isArray(user.orders) ? user.orders.map(toAdminOrderSummary).filter(Boolean) : [],
    createdAt: toIso(user.createdAt),
    updatedAt: toIso(user.updatedAt),
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

function toAdminAuditLog(log) {
  if (!log) return null;
  const metadata = log.metadata && typeof log.metadata === 'object' ? log.metadata : {};
  return {
    id: log.id,
    action: log.action,
    adminUserId: log.actorId || metadata.adminUserId || null,
    adminEmail: log.actor?.email || null,
    targetType: log.entity || metadata.targetType || '',
    targetId: log.entityId || metadata.targetId || null,
    timestamp: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt,
    metadata,
  };
}

function toAdminProduct(product) {
  if (!product) return null;
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category?.slug || product.category,
    categoryId: product.categoryId,
    brand: product.brand,
    price: product.priceCents / 100,
    oldPrice: product.oldPriceCents ? product.oldPriceCents / 100 : null,
    rating: product.rating,
    reviews: product.reviews,
    badge: product.badge || null,
    discount: product.discount ?? null,
    colors: Array.isArray(product.colors) ? product.colors : [],
    image: product.image,
    images: Array.isArray(product.images) ? product.images : [],
    sizes: Array.isArray(product.sizes) ? product.sizes : [],
    tag: product.tag,
    active: Boolean(product.active),
    createdAt: product.createdAt instanceof Date ? product.createdAt.toISOString() : product.createdAt,
    updatedAt: product.updatedAt instanceof Date ? product.updatedAt.toISOString() : product.updatedAt,
  };
}

function parseList(value) {
  if (Array.isArray(value)) {
    return value.map(item => normalizeText(item, 300)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(',').map(item => normalizeText(item, 300)).filter(Boolean);
  }
  return [];
}

function validateProductPayload(payload, { partial = false } = {}) {
  if (!payload || typeof payload !== 'object') return { error: 'Payload invalido.' };

  const has = key => Object.prototype.hasOwnProperty.call(payload, key);
  const data = {};

  if (!partial || has('id')) {
    const id = normalizeText(payload.id, 80).toLowerCase();
    if (!/^[a-z0-9_-]{2,80}$/.test(id)) return { error: 'ID do produto invalido.' };
    data.id = id;
  }

  if (!partial || has('slug')) {
    const slugSource = has('slug') ? payload.slug : payload.id;
    const slug = normalizeText(slugSource, 100).toLowerCase();
    if (!/^[a-z0-9_-]{2,100}$/.test(slug)) return { error: 'Slug do produto invalido.' };
    data.slug = slug;
  }

  if (!partial || has('name')) {
    const name = normalizeText(payload.name, 180);
    if (name.length < 2) return { error: 'Nome do produto invalido.' };
    data.name = name;
  }

  if (!partial || has('category')) {
    const category = normalizeText(payload.category, 80).toLowerCase();
    if (!/^[a-z0-9_-]{2,80}$/.test(category)) return { error: 'Categoria invalida.' };
    data.categorySlug = category;
  }

  if (!partial || has('brand')) {
    const brand = normalizeText(payload.brand, 120);
    if (brand.length < 2) return { error: 'Marca invalida.' };
    data.brand = brand;
  }

  if (!partial || has('price')) {
    const price = Number(payload.price);
    if (!Number.isFinite(price) || price <= 0) return { error: 'Preco invalido.' };
    data.priceCents = Math.round(price * 100);
  }

  if (has('oldPrice')) {
    if (payload.oldPrice === '' || payload.oldPrice === null || payload.oldPrice === undefined) data.oldPriceCents = null;
    else {
      const oldPrice = Number(payload.oldPrice);
      if (!Number.isFinite(oldPrice) || oldPrice <= 0) return { error: 'Preco antigo invalido.' };
      data.oldPriceCents = Math.round(oldPrice * 100);
    }
  } else if (!partial) {
    data.oldPriceCents = null;
  }

  if (has('rating')) {
    const rating = Number(payload.rating);
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) return { error: 'Avaliacao invalida.' };
    data.rating = rating;
  } else if (!partial) {
    data.rating = 0;
  }

  if (has('reviews')) {
    const reviews = Number(payload.reviews);
    if (!Number.isInteger(reviews) || reviews < 0) return { error: 'Numero de reviews invalido.' };
    data.reviews = reviews;
  } else if (!partial) {
    data.reviews = 0;
  }

  if (has('badge')) data.badge = normalizeText(payload.badge, 40) || null;

  if (has('discount')) {
    if (payload.discount === '' || payload.discount === null || payload.discount === undefined) data.discount = null;
    else {
      const discount = Number(payload.discount);
      if (!Number.isInteger(discount) || discount < 0 || discount > 100) return { error: 'Desconto invalido.' };
      data.discount = discount;
    }
  }

  if (!partial || has('colors')) {
    const colors = parseList(payload.colors);
    if (!colors.length) return { error: 'Informe ao menos uma cor.' };
    data.colors = colors;
  }

  if (!partial || has('image')) {
    const image = normalizeText(payload.image, 500);
    if (!image) return { error: 'Imagem principal invalida.' };
    data.image = image;
  }

  if (has('images')) data.images = parseList(payload.images);
  else if (!partial) data.images = [];

  if (!partial || has('sizes')) {
    const sizes = parseList(payload.sizes);
    if (!sizes.length) return { error: 'Informe ao menos um tamanho.' };
    data.sizes = sizes;
  }

  if (!partial || has('tag')) {
    const tag = normalizeText(payload.tag, 40).toLowerCase();
    if (!tag) return { error: 'Tag invalida.' };
    data.tag = tag;
  }

  if (has('active')) data.active = Boolean(payload.active);
  else if (!partial) data.active = true;

  return { value: data };
}

function validateAdminUserPatch(payload) {
  if (!payload || typeof payload !== 'object') return { error: 'Payload invalido.' };
  const data = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
    const name = normalizeText(payload.name, 120);
    data.name = name || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
    const email = normalizeText(payload.email, 160).toLowerCase();
    if (!isValidEmail(email)) return { error: 'Email invalido.' };
    data.email = email;
  }

  if (payload.role === 'ADMIN' || payload.role === 'CUSTOMER') data.role = payload.role;
  else if (Object.prototype.hasOwnProperty.call(payload, 'role')) return { error: 'Role invalida.' };

  if (typeof payload.emailVerified === 'boolean') data.emailVerified = payload.emailVerified;
  else if (Object.prototype.hasOwnProperty.call(payload, 'emailVerified')) return { error: 'Status de email invalido.' };

  return { value: data };
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
    paymentStatus: order.paymentStatus ? String(order.paymentStatus).toLowerCase() : undefined,
    paymentProvider: order.paymentProvider || undefined,
    paymentPreferenceId: order.paymentPreferenceId || undefined,
    paidAt: order.paidAt instanceof Date ? order.paidAt.toISOString() : order.paidAt || undefined,
    shipping: order.shippingMethod || 'standard',
    trackingCode: order.trackingCode || undefined,
    shippedAt: order.shippedAt instanceof Date ? order.shippedAt.toISOString() : order.shippedAt || undefined,
    contact: {
      name: order.contactName || '',
      email: order.email,
      phone: order.contactPhone || '',
    },
    address: order.shippingAddress ? toAdminAddress(order.shippingAddress) : {},
    items: (order.items || []).map(item => ({
      productId: item.productId,
      name: item.name || item.productId,
      unitPrice: Number(item.unitPriceCents || 0) / 100,
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

async function listAdminAuditLogs({ take = 50 } = {}) {
  const prisma = getPrisma();
  if (!prisma) return { logs: [], storage: 'demo' };
  const logs = await prisma.adminAuditLog.findMany({
    take: Math.min(Math.max(Number(take) || 50, 1), 100),
    include: { actor: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return { logs: logs.map(toAdminAuditLog).filter(Boolean), storage: 'database' };
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

async function updateOrderShipping(id, payload, adminUserId) {
  const prisma = getPrisma();
  if (!prisma) return { order: null, storage: 'demo' };
  const trackingCode = normalizeText(payload?.trackingCode, 80);
  if (!trackingCode) {
    const error = new Error('Codigo de rastreio invalido.');
    error.statusCode = 400;
    throw error;
  }

  const order = await prisma.$transaction(async tx => {
    const updated = await tx.order.update({
      where: { id },
      data: {
        status: 'FULFILLED',
        trackingCode,
        shippedAt: new Date(),
      },
      include: { items: true, shippingAddress: true },
    });
    await logAdminAction(tx, { adminUserId, action: 'order.shipping.update', targetType: 'order', targetId: id, metadata: { trackingCode } });
    return updated;
  });
  return { order: toApiOrder(order), storage: 'database' };
}

async function getOrderForNotification(id, adminUserId) {
  const prisma = getPrisma();
  if (!prisma) return { order: null, storage: 'demo' };
  const order = await prisma.$transaction(async tx => {
    const found = await tx.order.findUnique({
      where: { id },
      include: { items: true, shippingAddress: true },
    });
    if (found) {
      await logAdminAction(tx, { adminUserId, action: 'order.email.resend_confirmation', targetType: 'order', targetId: id });
    }
    return found;
  });
  return { order, storage: 'database' };
}

async function listAdminUsers() {
  const prisma = getPrisma();
  if (!prisma) return { users: [], storage: 'demo' };
  const users = await prisma.user.findMany({
    include: {
      addresses: { orderBy: { updatedAt: 'desc' } },
      orders: { orderBy: { createdAt: 'desc' }, take: 6 },
    },
    orderBy: { createdAt: 'desc' },
  });
  return { users: users.map(toAdminUser), storage: 'database' };
}

async function updateAdminUser(id, patch, adminUserId) {
  const prisma = getPrisma();
  if (!prisma) return { user: null, storage: 'demo' };
  const parsed = validateAdminUserPatch(patch);
  if (parsed.error) {
    const error = new Error(parsed.error);
    error.statusCode = 400;
    throw error;
  }

  const user = await prisma.$transaction(async tx => {
    const updated = await tx.user.update({
      where: { id },
      data: parsed.value,
      include: {
        addresses: { orderBy: { updatedAt: 'desc' } },
        orders: { orderBy: { createdAt: 'desc' }, take: 6 },
      },
    });
    await logAdminAction(tx, { adminUserId, action: 'user.update', targetType: 'user', targetId: id, metadata: parsed.value });
    return updated;
  }).catch(error => {
    throw mapUserWriteError(error);
  });
  return { user: toAdminUser(user), storage: 'database' };
}

async function getUserForEmailVerification(id, adminUserId) {
  const prisma = getPrisma();
  if (!prisma) return { user: null, storage: 'demo' };
  const user = await prisma.$transaction(async tx => {
    const found = await tx.user.findUnique({
      where: { id },
      select: { id: true, email: true, emailVerified: true },
    });
    if (found) {
      await logAdminAction(tx, { adminUserId, action: 'user.email.resend_verification', targetType: 'user', targetId: id });
    }
    return found;
  });
  return { user, storage: 'database' };
}

async function listCoupons() {
  const prisma = getPrisma();
  if (!prisma) return { coupons: [], storage: 'demo' };
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
  return { coupons: coupons.map(toAdminCoupon), storage: 'database' };
}

async function listPublicCoupons() {
  const prisma = getPrisma();
  if (!prisma) return { coupons: [], storage: 'demo' };
  const now = new Date();
  const coupons = await prisma.coupon.findMany({
    where: {
      active: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
  return { coupons: coupons.map(toAdminCoupon), storage: 'database' };
}

async function findCategoryBySlug(txOrPrisma, slug) {
  const category = await txOrPrisma.category.findUnique({ where: { slug } });
  if (!category) {
    const error = new Error('Categoria invalida.');
    error.statusCode = 400;
    throw error;
  }
  return category;
}

async function listAdminProducts() {
  const prisma = getPrisma();
  if (!prisma) return { products: [], storage: 'demo' };
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { updatedAt: 'desc' },
  });
  return { products: products.map(toAdminProduct), storage: 'database' };
}

async function createProduct(payload, adminUserId) {
  const prisma = getPrisma();
  if (!prisma) return { product: null, storage: 'demo' };
  const parsed = validateProductPayload(payload);
  if (parsed.error) {
    const error = new Error(parsed.error);
    error.statusCode = 400;
    throw error;
  }

  const product = await prisma.$transaction(async tx => {
    const category = await findCategoryBySlug(tx, parsed.value.categorySlug);
    const { categorySlug, ...data } = parsed.value;
    const created = await tx.product.create({
      data: { ...data, categoryId: category.id },
      include: { category: true },
    });
    await logAdminAction(tx, { adminUserId, action: 'product.create', targetType: 'product', targetId: created.id, metadata: { name: created.name } });
    return created;
  }).catch(error => {
    throw mapProductWriteError(error);
  });
  return { product: toAdminProduct(product), storage: 'database' };
}

async function updateProduct(id, payload, adminUserId) {
  const prisma = getPrisma();
  if (!prisma) return { product: null, storage: 'demo' };
  const parsed = validateProductPayload(payload, { partial: true });
  if (parsed.error) {
    const error = new Error(parsed.error);
    error.statusCode = 400;
    throw error;
  }

  const product = await prisma.$transaction(async tx => {
    const data = { ...parsed.value };
    if (data.categorySlug) {
      const category = await findCategoryBySlug(tx, data.categorySlug);
      data.categoryId = category.id;
      delete data.categorySlug;
    }
    delete data.id;
    const updated = await tx.product.update({
      where: { id },
      data,
      include: { category: true },
    });
    await logAdminAction(tx, { adminUserId, action: 'product.update', targetType: 'product', targetId: id, metadata: data });
    return updated;
  }).catch(error => {
    throw mapProductWriteError(error);
  });
  return { product: toAdminProduct(product), storage: 'database' };
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

async function getOrderForPaymentLink(id, adminUserId) {
  const prisma = getPrisma();
  if (!prisma) return { order: null, storage: 'demo' };
  const order = await prisma.$transaction(async tx => {
    const found = await tx.order.findUnique({
      where: { id },
      include: { items: true, shippingAddress: true },
    });
    if (found) {
      await logAdminAction(tx, { adminUserId, action: 'order.payment_link.generate', targetType: 'order', targetId: id });
    }
    return found;
  });
  return { order, storage: 'database' };
}

module.exports = {
  buildAdminSettings,
  createCoupon,
  createProduct,
  getOrderForPaymentLink,
  listAdminOrders,
  getOrderForNotification,
  getUserForEmailVerification,
  listAdminAuditLogs,
  listAdminProducts,
  listAdminUsers,
  listCoupons,
  listPublicCoupons,
  listNewsletterSubscribers,
  logAdminAction,
  toAdminUser,
  toAdminAuditLog,
  toAdminProduct,
  updateAdminUser,
  updateCoupon,
  updateNewsletterSubscriber,
  updateOrderShipping,
  updateOrderStatus,
  updateProduct,
  validateAdminUserPatch,
  validateCouponPayload,
  validateProductPayload,
};
