const { getPrisma } = require('./client');

function toApiCartItem(item) {
  return {
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    size: item.size || '',
    color: item.color || '',
  };
}

async function listCartItems(sessionId) {
  const prisma = getPrisma();
  if (!prisma) return { items: [], storage: 'demo' };

  const items = await prisma.cartItem.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });

  return { items: items.map(toApiCartItem), storage: 'database' };
}

async function addCartItem(sessionId, input) {
  const prisma = getPrisma();
  if (!prisma) return { item: { id: `${input.productId}:${input.size}:${input.color}`, ...input }, storage: 'demo' };

  const product = await prisma.product.findFirst({ where: { id: input.productId, active: true } });
  if (!product) {
    const error = new Error('Produto nao encontrado.');
    error.statusCode = 404;
    throw error;
  }

  const existing = await prisma.cartItem.findFirst({
    where: {
      sessionId,
      productId: input.productId,
      size: input.size,
      color: input.color,
    },
  });

  const item = existing
    ? await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + input.quantity },
    })
    : await prisma.cartItem.create({
      data: {
        sessionId,
        productId: input.productId,
        quantity: input.quantity,
        size: input.size,
        color: input.color,
      },
    });

  return { item: toApiCartItem(item), storage: 'database' };
}

async function updateCartItem(sessionId, id, quantity) {
  const prisma = getPrisma();
  if (!prisma) return { item: null, storage: 'demo' };

  const existing = await prisma.cartItem.findFirst({ where: { id, sessionId } });
  if (!existing) {
    const error = new Error('Item nao encontrado.');
    error.statusCode = 404;
    throw error;
  }

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id } });
    return { item: null, storage: 'database' };
  }

  const item = await prisma.cartItem.update({
    where: { id },
    data: { quantity },
  });

  return { item: toApiCartItem(item), storage: 'database' };
}

async function deleteCartItem(sessionId, id) {
  const prisma = getPrisma();
  if (!prisma) return { ok: true, storage: 'demo' };

  const existing = await prisma.cartItem.findFirst({ where: { id, sessionId } });
  if (!existing) return { ok: true, storage: 'database' };

  await prisma.cartItem.delete({ where: { id } });
  return { ok: true, storage: 'database' };
}

module.exports = { addCartItem, deleteCartItem, listCartItems, updateCartItem };
