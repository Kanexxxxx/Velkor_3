const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getPrisma } = require('./client');

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const RESET_TOKEN_DURATION_MS = 1000 * 60 * 60;
const EMAIL_VERIFICATION_TOKEN_DURATION_MS = 1000 * 60 * 60 * 24;

function createRawSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashSessionToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, 12);
}

async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    role: user.role,
    emailVerified: Boolean(user.emailVerified),
    addresses: Array.isArray(user.addresses) ? user.addresses.map(toPublicAddress) : [],
  };
}

function toPublicAddress(address) {
  return {
    id: address.id,
    label: address.label || 'Endereco',
    recipient: address.fullName,
    street: address.street,
    complement: address.complement || undefined,
    city: address.city,
    region: address.state,
    postalCode: address.postalCode,
    country: address.country || 'Brasil',
    phone: address.phone || undefined,
    isDefault: Boolean(address.isDefault),
  };
}

function sessionExpiryDate(now = Date.now()) {
  return new Date(now + SESSION_DURATION_MS);
}

async function createSession({ userId, ipAddress = null, userAgent = null }) {
  const prisma = getPrisma();
  if (!prisma) return null;

  const rawToken = createRawSessionToken();
  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash: hashSessionToken(rawToken),
      expiresAt: sessionExpiryDate(),
      ipAddress,
      userAgent,
    },
  });

  return { rawToken, session };
}

async function findSessionUser(rawToken) {
  const prisma = getPrisma();
  if (!prisma || !rawToken) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(rawToken) },
    include: { user: { include: { addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] } } } },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;

  return { session, user: toPublicUser(session.user), userRecord: session.user };
}

async function deleteSession(rawToken) {
  const prisma = getPrisma();
  if (!prisma || !rawToken) return false;

  await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(rawToken) } });
  return true;
}

async function deleteOtherSessions(userId, currentRawToken) {
  const prisma = getPrisma();
  if (!prisma) return 0;

  const result = await prisma.session.deleteMany({
    where: {
      userId,
      tokenHash: { not: hashSessionToken(currentRawToken) },
    },
  });
  return result.count;
}

async function listSessions(userId) {
  const prisma = getPrisma();
  if (!prisma) return [];

  return prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    select: { id: true, createdAt: true, expiresAt: true, ipAddress: true, userAgent: true },
    orderBy: { createdAt: 'desc' },
  });
}

async function revokeSession(userId, id) {
  const prisma = getPrisma();
  if (!prisma) return false;

  const result = await prisma.session.deleteMany({ where: { userId, id } });
  return result.count > 0;
}

async function findUserByEmail(email) {
  const prisma = getPrisma();
  if (!prisma) return null;
  return prisma.user.findUnique({ where: { email }, include: { addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] } } });
}

async function createUser({ email, password, name }) {
  const prisma = getPrisma();
  if (!prisma) return null;

  return prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(password),
      emailVerified: false,
    },
  });
}

async function updateUserProfile(userId, { name }) {
  const prisma = getPrisma();
  if (!prisma) return null;
  return prisma.user.update({ where: { id: userId }, data: { name } });
}

async function updateUserPassword(userId, password) {
  const prisma = getPrisma();
  if (!prisma) return null;
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password) },
  });
}

function normalizeAddressInput(input = {}) {
  const street = String(input.street || '').trim();
  const recipient = String(input.recipient || '').trim();
  const city = String(input.city || '').trim();
  const region = String(input.region || '').trim();
  const postalCode = String(input.postalCode || '').trim();
  if (!recipient || !street || !city || !region || !postalCode) return null;
  return {
    label: String(input.label || 'Endereco').trim().slice(0, 80) || 'Endereco',
    fullName: recipient.slice(0, 120),
    phone: String(input.phone || '').trim().slice(0, 40) || null,
    postalCode: postalCode.slice(0, 20),
    street: street.slice(0, 180),
    number: 'S/N',
    complement: String(input.complement || '').trim().slice(0, 180) || null,
    city: city.slice(0, 100),
    state: region.slice(0, 40),
    country: String(input.country || 'Brasil').trim().slice(0, 80) || 'Brasil',
    isDefault: Boolean(input.isDefault),
  };
}

async function upsertUserAddress(userId, input) {
  const prisma = getPrisma();
  if (!prisma) return null;
  const data = normalizeAddressInput(input);
  if (!data) return null;
  const addressId = typeof input.id === 'string' ? input.id.trim() : '';

  return prisma.$transaction(async tx => {
    if (data.isDefault) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }

    let address;
    if (addressId) {
      address = await tx.address.findFirst({ where: { id: addressId, userId } });
      if (!address) return null;
      address = await tx.address.update({ where: { id: address.id }, data });
    } else {
      address = await tx.address.create({ data: { ...data, userId } });
    }

    const addresses = await tx.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    if (!addresses.some(item => item.isDefault) && addresses[0]) {
      await tx.address.update({ where: { id: addresses[0].id }, data: { isDefault: true } });
    }

    return { address: toPublicAddress(address), addresses: (await tx.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] })).map(toPublicAddress) };
  });
}

async function deleteUserAddress(userId, addressId) {
  const prisma = getPrisma();
  if (!prisma) return null;
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) return null;
  await prisma.address.delete({ where: { id: address.id } });
  const addresses = await prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  if (!addresses.some(item => item.isDefault) && addresses[0]) {
    await prisma.address.update({ where: { id: addresses[0].id }, data: { isDefault: true } });
  }
  return (await prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] })).map(toPublicAddress);
}

async function setDefaultUserAddress(userId, addressId) {
  const prisma = getPrisma();
  if (!prisma) return null;
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) return null;
  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.address.update({ where: { id: address.id }, data: { isDefault: true } }),
  ]);
  return (await prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] })).map(toPublicAddress);
}

async function createPasswordResetToken(email) {
  const prisma = getPrisma();
  if (!prisma) return null;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const rawToken = createRawSessionToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_DURATION_MS),
    },
  });

  return rawToken;
}

async function createEmailVerificationToken(userId) {
  const prisma = getPrisma();
  if (!prisma) return null;

  const rawToken = createRawSessionToken();
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashSessionToken(rawToken),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_DURATION_MS),
    },
  });

  return rawToken;
}

async function consumeEmailVerificationToken(rawToken) {
  const prisma = getPrisma();
  if (!prisma || !rawToken) return false;

  const tokenHash = hashSessionToken(rawToken);
  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
  });

  if (!verificationToken || verificationToken.usedAt || verificationToken.expiresAt.getTime() < Date.now()) return false;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: true },
    }),
    prisma.emailVerificationToken.update({
      where: { id: verificationToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return true;
}

async function consumePasswordResetToken(rawToken, newPassword) {
  const prisma = getPrisma();
  if (!prisma || !rawToken) return false;

  const tokenHash = hashSessionToken(rawToken);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) return false;

  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash: await hashPassword(newPassword) },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.session.deleteMany({ where: { userId: resetToken.userId } }),
  ]);

  return user;
}

module.exports = {
  SESSION_DURATION_MS,
  createPasswordResetToken,
  createEmailVerificationToken,
  createRawSessionToken,
  createSession,
  createUser,
  consumePasswordResetToken,
  consumeEmailVerificationToken,
  deleteOtherSessions,
  deleteSession,
  findSessionUser,
  findUserByEmail,
  hashPassword,
  hashSessionToken,
  listSessions,
  revokeSession,
  deleteUserAddress,
  setDefaultUserAddress,
  toPublicUser,
  upsertUserAddress,
  updateUserPassword,
  updateUserProfile,
  verifyPassword,
};
