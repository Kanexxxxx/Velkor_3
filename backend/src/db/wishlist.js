const { getPrisma } = require('./client');

async function listWishlist(sessionId) {
  const prisma = getPrisma();
  if (!prisma) return { productIds: [], storage: 'demo' };

  const items = await prisma.wishlistItem.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });

  return { productIds: items.map(item => item.productId), storage: 'database' };
}

async function addWishlistItem(sessionId, productId) {
  const prisma = getPrisma();
  if (!prisma) return { productId, storage: 'demo' };

  const product = await prisma.product.findFirst({ where: { id: productId, active: true } });
  if (!product) {
    const error = new Error('Produto nao encontrado.');
    error.statusCode = 404;
    throw error;
  }

  await prisma.wishlistItem.upsert({
    where: { sessionId_productId: { sessionId, productId } },
    update: {},
    create: { sessionId, productId },
  });

  return { productId, storage: 'database' };
}

async function deleteWishlistItem(sessionId, productId) {
  const prisma = getPrisma();
  if (!prisma) return { ok: true, storage: 'demo' };

  await prisma.wishlistItem.deleteMany({ where: { sessionId, productId } });
  return { ok: true, storage: 'database' };
}

module.exports = { addWishlistItem, deleteWishlistItem, listWishlist };
