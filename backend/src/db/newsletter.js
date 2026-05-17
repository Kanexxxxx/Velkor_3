const { getPrisma } = require('./client');

async function subscribeNewsletter(rawEmail, jsonFallback) {
  const email = rawEmail.trim().toLowerCase();
  const prisma = getPrisma();

  if (!prisma) {
    return { ...jsonFallback(email), storage: 'json' };
  }

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });
  if (existing) {
    if (!existing.isActive) {
      await prisma.newsletterSubscriber.update({
        where: { email },
        data: { isActive: true },
      });
    }
    return { duplicate: true, storage: 'database' };
  }

  await prisma.newsletterSubscriber.create({ data: { email } });
  return { duplicate: false, storage: 'database' };
}

async function unsubscribeNewsletter(rawEmail, jsonFallback) {
  const email = rawEmail.trim().toLowerCase();
  const prisma = getPrisma();

  if (!prisma) {
    return { ...jsonFallback(email), storage: 'json' };
  }

  await prisma.newsletterSubscriber.updateMany({
    where: { email },
    data: { isActive: false },
  });
  return { ok: true, storage: 'database' };
}

module.exports = { subscribeNewsletter, unsubscribeNewsletter };
