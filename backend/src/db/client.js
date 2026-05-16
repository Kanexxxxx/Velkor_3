let prisma;

function getDatabaseUrl() {
  return (process.env.DATABASE_URL || '').trim().replace(/^"|"$/g, '');
}

function isPlaceholderDatabaseUrl(url) {
  return [
    'johndoe:randompassword',
    'usuario:senha',
    'user:password',
    'localhost:5432/mydb',
  ].some(marker => url.includes(marker));
}

function isDatabaseConfigured() {
  const url = getDatabaseUrl();
  return Boolean(url) && !isPlaceholderDatabaseUrl(url);
}

function getPrisma() {
  if (!isDatabaseConfigured()) return null;
  if (!prisma) {
    const { PrismaPg } = require('@prisma/adapter-pg');
    const { PrismaClient } = require('@prisma/client');
    const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

module.exports = { getPrisma, isDatabaseConfigured };
