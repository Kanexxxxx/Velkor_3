const { getPrisma } = require('./client');
const { categories: fallbackCategories, products: fallbackProducts } = require('./seed-data');

function toApiProduct(product) {
  if (!product) return null;
  return {
    id: product.id,
    slug: product.slug || product.id,
    name: product.name,
    category: product.category?.slug || product.category,
    brand: product.brand,
    price: product.priceCents ? product.priceCents / 100 : product.price,
    oldPrice: product.oldPriceCents ? product.oldPriceCents / 100 : product.oldPrice,
    rating: product.rating,
    reviews: product.reviews,
    badge: product.badge || undefined,
    discount: product.discount || undefined,
    colors: product.colors || [],
    image: product.image,
    images: product.images || undefined,
    sizes: product.sizes || [],
    tag: product.tag,
  };
}

function toApiCategory(category) {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description || undefined,
  };
}

async function listProducts() {
  const prisma = getPrisma();
  if (!prisma) return fallbackProducts.map(toApiProduct);

  const products = await prisma.product.findMany({
    where: { active: true },
    include: { category: true },
    orderBy: { id: 'asc' },
  });

  return products.map(toApiProduct);
}

async function getProductBySlug(slug) {
  const prisma = getPrisma();
  if (!prisma) {
    return fallbackProducts.map(toApiProduct).find(product => product.slug === slug || product.id === slug) || null;
  }

  const product = await prisma.product.findFirst({
    where: {
      active: true,
      OR: [{ slug }, { id: slug }],
    },
    include: { category: true },
  });

  return toApiProduct(product);
}

async function listCategories() {
  const prisma = getPrisma();
  if (!prisma) return fallbackCategories.map(toApiCategory);

  const categories = await prisma.category.findMany({
    orderBy: { slug: 'asc' },
  });

  return categories.map(toApiCategory);
}

module.exports = { getProductBySlug, listCategories, listProducts };
