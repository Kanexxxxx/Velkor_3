const { getPrisma } = require('./client');

const SHIPPING_CENTS = {
  standard: 0,
  express: 3900,
};

function makeError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeText(value, max = 120) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validateOrderInput(input) {
  if (!input || typeof input !== 'object') return { error: 'Payload invalido.' };
  if (!Array.isArray(input.items) || input.items.length === 0) return { error: 'Carrinho vazio.' };
  if (input.items.length > 50) return { error: 'Carrinho excede o limite de itens.' };

  for (const item of input.items) {
    const quantity = Number(item?.quantity);
    if (!item || typeof item.productId !== 'string' || !item.productId.trim()) return { error: 'Produto invalido.' };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return { error: 'Quantidade invalida.' };
  }

  const contact = input.contact || {};
  if (!normalizeText(contact.name, 120)) return { error: 'Nome de contato invalido.' };
  if (!isValidEmail(contact.email)) return { error: 'Email invalido.' };

  const address = input.address || {};
  if (!normalizeText(address.recipient, 120)) return { error: 'Destinatario invalido.' };
  if (!normalizeText(address.street, 180)) return { error: 'Endereco invalido.' };
  if (!normalizeText(address.city, 100)) return { error: 'Cidade invalida.' };
  if (!normalizeText(address.region, 40)) return { error: 'Estado invalido.' };
  if (!normalizeText(address.postalCode, 20)) return { error: 'CEP invalido.' };

  const shipping = normalizeText(input.shipping, 120) || 'standard';
  const payment = 'mercado-pago';

  return {
    value: {
      items: input.items.map(item => ({
        productId: normalizeText(item.productId, 80),
        quantity: Number(item.quantity),
        size: normalizeText(item.size, 24) || null,
        color: normalizeText(item.color, 40) || null,
      })),
      contact: {
        name: normalizeText(contact.name, 120),
        email: normalizeText(contact.email, 160).toLowerCase(),
        phone: normalizeText(contact.phone, 40) || null,
      },
      address: {
        recipient: normalizeText(address.recipient, 120),
        street: normalizeText(address.street, 180),
        complement: normalizeText(address.complement, 180) || null,
        city: normalizeText(address.city, 100),
        region: normalizeText(address.region, 40),
        postalCode: normalizeText(address.postalCode, 20),
        country: normalizeText(address.country, 80) || 'Brasil',
        phone: normalizeText(address.phone, 40) || null,
      },
      coupon: normalizeText(input.coupon, 40).toUpperCase() || null,
      shipping,
      payment,
    },
  };
}

async function getCouponDiscount(prisma, couponCode, subtotalCents) {
  if (!couponCode) return { discountCents: 0, couponCode: null };

  const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
  const now = new Date();
  if (!coupon || !coupon.active) return { discountCents: 0, couponCode: null };
  if (coupon.startsAt && coupon.startsAt > now) return { discountCents: 0, couponCode: null };
  if (coupon.expiresAt && coupon.expiresAt < now) return { discountCents: 0, couponCode: null };
  if (coupon.maxRedemptions && coupon.redeemedCount >= coupon.maxRedemptions) return { discountCents: 0, couponCode: null };

  const discountCents = coupon.discountType === 'FIXED'
    ? Math.min(subtotalCents, coupon.discountValue)
    : Math.round(subtotalCents * coupon.discountValue / 100);

  return { discountCents, couponCode: coupon.code };
}

async function resolveShippingCents(input, items, subtotalCents, options = {}) {
  if (SHIPPING_CENTS[input.shipping] !== undefined) {
    return { shippingCents: SHIPPING_CENTS[input.shipping], shippingMethod: input.shipping };
  }

  if (!options.shippingService?.quoteShipping) {
    throw makeError('Frete indisponivel. Calcule o frete novamente.', 400);
  }

  const result = await options.shippingService.quoteShipping({
    toPostalCode: input.address?.postalCode,
    items,
    subtotalCents,
  });
  const quote = result?.quotes?.find(item => item.id === input.shipping);
  if (!quote) throw makeError('Opcao de frete expirada. Calcule o frete novamente.', 400);
  return { shippingCents: quote.priceCents, shippingMethod: quote.id };
}

async function buildOrderQuote(prisma, input, options = {}) {
  const productIds = Array.from(new Set(input.items.map(item => item.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
  });
  const productById = new Map(products.map(product => [product.id, product]));

  const items = input.items.map(item => {
    const product = productById.get(item.productId);
    if (!product) throw makeError(`Produto nao encontrado: ${item.productId}`, 404);
    return {
      ...item,
      name: product.name,
      unitPriceCents: product.priceCents,
      lineTotalCents: product.priceCents * item.quantity,
    };
  });

  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const { shippingCents, shippingMethod } = await resolveShippingCents(input, items, subtotalCents, options);
  const { discountCents, couponCode } = await getCouponDiscount(prisma, input.coupon, subtotalCents);
  const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);

  return { items, subtotalCents, shippingCents, shippingMethod, discountCents, totalCents, couponCode };
}

function toApiOrder(order) {
  const address = order.shippingAddress;
  return {
    id: order.id,
    userId: order.userId || undefined,
    items: order.items.map(item => ({
      productId: item.productId,
      name: item.name,
      unitPrice: item.unitPriceCents / 100,
      quantity: item.quantity,
      size: item.size || '',
      color: item.color || '',
    })),
    status: order.status === 'PENDING' ? 'pending' : order.status.toLowerCase(),
    paymentStatus: order.paymentStatus ? order.paymentStatus.toLowerCase() : 'pending',
    paymentProvider: order.paymentProvider || undefined,
    paymentPreferenceId: order.paymentPreferenceId || undefined,
    paidAt: order.paidAt ? order.paidAt.toISOString() : undefined,
    subtotal: order.subtotalCents / 100,
    shippingCost: order.shippingCents / 100,
    tax: 0,
    discount: order.discountCents / 100,
    coupon: order.couponCode || undefined,
    total: order.totalCents / 100,
    payment: order.paymentMethod || 'mercado-pago',
    shipping: order.shippingMethod || 'standard',
    contact: {
      name: order.contactName || address?.fullName || '',
      email: order.email,
      phone: order.contactPhone || undefined,
    },
    address: {
      id: address?.id || '',
      label: 'Endereco de entrega',
      recipient: address?.fullName || '',
      street: address?.street || '',
      complement: address?.complement || undefined,
      city: address?.city || '',
      region: address?.state || '',
      postalCode: address?.postalCode || '',
      country: address?.country || 'BR',
      phone: address?.phone || undefined,
      isDefault: false,
    },
    createdAt: order.createdAt.toISOString(),
  };
}

async function createOrder(sessionId, rawInput, options = {}) {
  const prisma = getPrisma();
  if (!prisma) {
    const parsed = validateOrderInput(rawInput);
    if (parsed.error) throw makeError(parsed.error);
    return { order: null, storage: 'demo' };
  }

  const parsed = validateOrderInput(rawInput);
  if (parsed.error) throw makeError(parsed.error);
  const input = parsed.value;
  const quote = await buildOrderQuote(prisma, input, options);

  const order = await prisma.$transaction(async tx => {
    const address = await tx.address.create({
      data: {
        fullName: input.address.recipient,
        phone: input.address.phone,
        postalCode: input.address.postalCode,
        street: input.address.street,
        number: 'S/N',
        complement: input.address.complement,
        city: input.address.city,
        state: input.address.region,
        country: input.address.country,
      },
    });

    return tx.order.create({
      data: {
        sessionId,
        email: input.contact.email,
        contactName: input.contact.name,
        contactPhone: input.contact.phone,
        status: 'PENDING',
        subtotalCents: quote.subtotalCents,
        discountCents: quote.discountCents,
        shippingCents: quote.shippingCents,
        totalCents: quote.totalCents,
        couponCode: quote.couponCode,
        paymentMethod: input.payment,
        shippingMethod: quote.shippingMethod,
        shippingAddressId: address.id,
        items: {
          create: quote.items.map(item => ({
            productId: item.productId,
            name: item.name,
            unitPriceCents: item.unitPriceCents,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
          })),
        },
      },
      include: { items: true, shippingAddress: true },
    });
  });

  console.log(`order.created id=${order.id} session=${sessionId} total=${order.totalCents}`);
  return { order: toApiOrder(order), storage: 'database' };
}

async function listOrders(sessionId, customerEmail = '') {
  const prisma = getPrisma();
  if (!prisma) return { orders: [], storage: 'demo' };

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { sessionId },
        ...(customerEmail ? [{ email: customerEmail }] : []),
      ],
    },
    include: { items: true, shippingAddress: true },
    orderBy: { createdAt: 'desc' },
  });

  return { orders: orders.map(toApiOrder), storage: 'database' };
}

async function getOrder(sessionId, id, customerEmail = '') {
  const prisma = getPrisma();
  if (!prisma) return { order: null, storage: 'demo' };

  const order = await prisma.order.findFirst({
    where: {
      id,
      OR: [
        { sessionId },
        ...(customerEmail ? [{ email: customerEmail }] : []),
      ],
    },
    include: { items: true, shippingAddress: true },
  });

  return { order: order ? toApiOrder(order) : null, storage: 'database' };
}

async function validateCoupon(couponCode) {
  const prisma = getPrisma();
  if (!prisma) return { prismaAvailable: false };

  const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
  const now = new Date();
  if (!coupon || !coupon.active) return { prismaAvailable: true, valid: false };
  if (coupon.startsAt && coupon.startsAt > now) return { prismaAvailable: true, valid: false };
  if (coupon.expiresAt && coupon.expiresAt < now) return { prismaAvailable: true, valid: false };
  if (coupon.maxRedemptions && coupon.redeemedCount >= coupon.maxRedemptions) return { prismaAvailable: true, valid: false };

  return {
    prismaAvailable: true,
    valid: true,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
  };
}

module.exports = { buildOrderQuote, createOrder, getOrder, listOrders, validateCoupon, validateOrderInput };
