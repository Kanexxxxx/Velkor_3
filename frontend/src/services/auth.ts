import type { Address, StoredUser, User } from '@/types/user';

export const AUTH_STORAGE_KEY = 'velkor_session_v1';
export const USERS_STORAGE_KEY = 'velkor_users_v1';

export interface SessionPayload {
  userId: string;
  issuedAt: string;
  expiresAt: string;
}

export interface StoredAccount {
  name: string;
  email: string;
}

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isStrongPassword(password: string) {
  return typeof password === 'string' && password.trim().length >= 6;
}

export function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase('pt-BR');
}

export function normalizeAccount(input: StoredAccount): User {
  const email = normalizeEmail(input.email);
  return {
    id: email,
    name: (input.name ?? '').trim() || email.split('@')[0],
    email,
    createdAt: new Date().toISOString(),
    addresses: []
  };
}

function generateId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID().split('-')[0]}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function generateSalt() {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const buffer = new Uint8Array(16);
    crypto.getRandomValues(buffer);
    return Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  return Math.random().toString(36).slice(2);
}

async function digest(value: string) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

export async function hashPassword(password: string, salt: string) {
  return digest(`${salt}::${password}`);
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const candidate = await hashPassword(password, salt);
  return candidate === expectedHash;
}

export function readUsers(): StoredUser[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredUser[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(user => user && typeof user.email === 'string' && typeof user.passwordHash === 'string');
  } catch {
    return [];
  }
}

export function writeUsers(users: StoredUser[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export function findUserByEmail(email: string): StoredUser | undefined {
  return readUsers().find(user => user.email === normalizeEmail(email));
}

export function publicUser(user: StoredUser): User {
  const { passwordHash, passwordSalt, resetToken, resetTokenExpiresAt, ...publicData } = user;
  return publicData;
}

export function persistUser(user: StoredUser) {
  const users = readUsers().filter(item => item.id !== user.id);
  writeUsers([...users, user]);
}

export function readSession(): SessionPayload | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as SessionPayload;
    if (!session.userId || !session.expiresAt) return null;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function writeSession(userId: string): SessionPayload {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + SESSION_DURATION_MS);
  const payload: SessionPayload = {
    userId,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
  }

  return payload;
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function createUser(input: { name: string; email: string; password: string }): Promise<StoredUser> {
  const email = normalizeEmail(input.email);
  const salt = generateSalt();
  const passwordHash = await hashPassword(input.password, salt);
  const user: StoredUser = {
    id: generateId('usr'),
    name: input.name.trim(),
    email,
    createdAt: new Date().toISOString(),
    addresses: [],
    passwordHash,
    passwordSalt: salt
  };
  persistUser(user);
  return user;
}

export async function updateUserPassword(userId: string, newPassword: string) {
  const users = readUsers();
  const target = users.find(user => user.id === userId);
  if (!target) return null;

  const salt = generateSalt();
  target.passwordSalt = salt;
  target.passwordHash = await hashPassword(newPassword, salt);
  delete target.resetToken;
  delete target.resetTokenExpiresAt;
  writeUsers(users);
  return target;
}

export function updateUserProfile(userId: string, patch: Partial<Pick<User, 'name' | 'email' | 'phone'>>) {
  const users = readUsers();
  const target = users.find(user => user.id === userId);
  if (!target) return null;

  if (patch.email && patch.email !== target.email) {
    const email = normalizeEmail(patch.email);
    if (users.some(user => user.id !== userId && user.email === email)) {
      throw new Error('Já existe uma conta com este email.');
    }
    target.email = email;
  }

  if (typeof patch.name === 'string') target.name = patch.name.trim();
  if (typeof patch.phone === 'string') target.phone = patch.phone.trim() || undefined;
  writeUsers(users);
  return target;
}

export function upsertAddress(userId: string, address: Omit<Address, 'id'> & { id?: string }) {
  const users = readUsers();
  const target = users.find(user => user.id === userId);
  if (!target) return null;

  const id = address.id ?? generateId('adr');
  const cleaned: Address = {
    ...address,
    id,
    label: address.label.trim() || 'Endereço',
    recipient: address.recipient.trim(),
    street: address.street.trim(),
    complement: address.complement?.trim() || undefined,
    city: address.city.trim(),
    region: address.region.trim(),
    postalCode: address.postalCode.trim(),
    country: address.country.trim() || 'Brasil',
    phone: address.phone?.trim() || undefined,
    isDefault: Boolean(address.isDefault)
  };

  const existingIndex = target.addresses.findIndex(item => item.id === id);
  if (existingIndex >= 0) {
    target.addresses[existingIndex] = cleaned;
  } else {
    target.addresses.push(cleaned);
  }

  if (cleaned.isDefault || target.addresses.length === 1) {
    target.addresses = target.addresses.map(item => ({ ...item, isDefault: item.id === cleaned.id }));
  }

  writeUsers(users);
  return target;
}

export function deleteAddress(userId: string, addressId: string) {
  const users = readUsers();
  const target = users.find(user => user.id === userId);
  if (!target) return null;

  const wasDefault = target.addresses.find(item => item.id === addressId)?.isDefault;
  target.addresses = target.addresses.filter(item => item.id !== addressId);
  if (wasDefault && target.addresses.length > 0) {
    target.addresses[0].isDefault = true;
  }

  writeUsers(users);
  return target;
}

export function setDefaultAddress(userId: string, addressId: string) {
  const users = readUsers();
  const target = users.find(user => user.id === userId);
  if (!target) return null;
  target.addresses = target.addresses.map(item => ({ ...item, isDefault: item.id === addressId }));
  writeUsers(users);
  return target;
}

export function setResetToken(email: string): { user: StoredUser; token: string } | null {
  const users = readUsers();
  const target = users.find(user => user.email === normalizeEmail(email));
  if (!target) return null;
  const token = generateId('rst').replace('rst_', '');
  target.resetToken = token;
  target.resetTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString(); // 30 min
  writeUsers(users);
  return { user: target, token };
}

export function consumeResetToken(token: string): StoredUser | null {
  const users = readUsers();
  const target = users.find(user => user.resetToken === token && user.resetTokenExpiresAt && new Date(user.resetTokenExpiresAt).getTime() > Date.now());
  return target ?? null;
}
