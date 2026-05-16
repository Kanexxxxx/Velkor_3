const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { categories, products } = require('../src/db/seed-data');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
      },
      create: category,
    });
  }

  const categoryBySlug = Object.fromEntries(
    (await prisma.category.findMany()).map(category => [category.slug, category]),
  );

  for (const product of products) {
    const category = categoryBySlug[product.category];
    if (!category) throw new Error(`Missing category for product ${product.id}`);

    await prisma.product.upsert({
      where: { id: product.id },
      update: {
        slug: product.slug,
        name: product.name,
        categoryId: category.id,
        brand: product.brand,
        priceCents: product.price * 100,
        oldPriceCents: product.oldPrice ? product.oldPrice * 100 : null,
        rating: product.rating,
        reviews: product.reviews,
        badge: product.badge || null,
        discount: product.discount || null,
        colors: product.colors,
        image: product.image,
        images: product.images || null,
        sizes: product.sizes,
        tag: product.tag,
        active: true,
      },
      create: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        categoryId: category.id,
        brand: product.brand,
        priceCents: product.price * 100,
        oldPriceCents: product.oldPrice ? product.oldPrice * 100 : null,
        rating: product.rating,
        reviews: product.reviews,
        badge: product.badge || null,
        discount: product.discount || null,
        colors: product.colors,
        image: product.image,
        images: product.images || null,
        sizes: product.sizes,
        tag: product.tag,
      },
    });
  }

  await prisma.coupon.upsert({
    where: { code: 'VELKOR15' },
    update: { discountType: 'PERCENT', discountValue: 15, active: true },
    create: { code: 'VELKOR15', discountType: 'PERCENT', discountValue: 15 },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async error => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
