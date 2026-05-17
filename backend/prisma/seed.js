const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { categories, products } = require('../src/db/seed-data');
const { hashPassword } = require('../src/db/auth');

function buildAdminSeedInput(env = process.env) {
  const email = typeof env.ADMIN_EMAIL === 'string' ? env.ADMIN_EMAIL.trim().toLowerCase() : '';
  const password = typeof env.ADMIN_PASSWORD === 'string' ? env.ADMIN_PASSWORD : '';
  if (!email || !password) return null;
  return { email, password, role: 'ADMIN' };
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

async function seedCatalog(prisma) {
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

async function seedAdmin(prisma, env = process.env) {
  const admin = buildAdminSeedInput(env);
  if (!admin) return null;

  const passwordHash = await hashPassword(admin.password);
  const user = await prisma.user.upsert({
    where: { email: admin.email },
    update: { role: 'ADMIN', passwordHash },
    create: {
      email: admin.email,
      name: 'Admin VELKOR',
      role: 'ADMIN',
      passwordHash,
      emailVerified: true,
    },
  });

  console.log(`Admin seed ensured for ${user.email}`);
  return user;
}

async function main() {
  const prisma = createPrismaClient();
  try {
    await seedCatalog(prisma);
    await seedAdmin(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(async error => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { buildAdminSeedInput, seedAdmin, seedCatalog };
