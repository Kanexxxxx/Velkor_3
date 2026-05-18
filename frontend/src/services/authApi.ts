import type { Address, User } from '@/types/user';

export interface AuthApiUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: boolean;
  addresses?: Address[];
}

export interface SessionInfo {
  id: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export class AuthError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.status = status;
  }
}

function toUser(user: AuthApiUser): User {
  return {
    id: user.id,
    name: user.name || user.email.split('@')[0],
    email: user.email,
    emailVerified: user.emailVerified,
    createdAt: new Date().toISOString(),
    addresses: Array.isArray(user.addresses) ? user.addresses : [],
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/auth${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      credentials: 'include',
      cache: 'no-store',
    });
  } catch (err) {
    throw new AuthError(err instanceof Error ? err.message : 'API indisponivel.', 'network_unavailable', 0);
  }

  const data = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) {
    throw new AuthError(data.error ?? 'Erro de autenticacao.', data.error ?? 'auth_error', response.status);
  }
  return data as T;
}

function mapUserResponse(data: { user: AuthApiUser }) {
  return { user: toUser(data.user), rawUser: data.user };
}

export function isAuthApiUnavailable(error: unknown) {
  return error instanceof AuthError && (error.status === 0 || error.status === 503);
}

export async function register(email: string, password: string, name?: string) {
  return mapUserResponse(await request<{ user: AuthApiUser }>('/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  }));
}

export async function login(email: string, password: string) {
  return mapUserResponse(await request<{ user: AuthApiUser }>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }));
}

export async function logout() {
  await request<{ ok: true }>('/logout', { method: 'POST' });
}

export async function getMe() {
  try {
    return mapUserResponse(await request<{ user: AuthApiUser }>('/me'));
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) return null;
    throw error;
  }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await request<{ ok: true }>('/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function updateProfile(name: string) {
  return mapUserResponse(await request<{ user: AuthApiUser }>('/profile', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  }));
}

export async function listSessions() {
  return request<{ sessions: SessionInfo[] }>('/sessions');
}

export async function revokeSession(id: string) {
  await request<{ ok: true }>(`/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function revokeAllSessions() {
  await request<{ ok: true; revoked: number }>('/sessions', { method: 'DELETE' });
}

export async function upsertAddress(address: Omit<Address, 'id'> & { id?: string }) {
  return request<{ address: Address; addresses: Address[] }>('/addresses', {
    method: 'POST',
    body: JSON.stringify(address),
  });
}

export async function deleteAddress(id: string) {
  return request<{ addresses: Address[] }>(`/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function setDefaultAddress(id: string) {
  return request<{ addresses: Address[] }>(`/addresses/${encodeURIComponent(id)}/default`, { method: 'POST' });
}

export async function requestPasswordReset(email: string) {
  await request<{ ok: true }>('/password-reset/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function requestEmailVerification() {
  await request<{ ok: true }>('/email-verification/request', { method: 'POST' });
}

export async function confirmPasswordReset(token: string, newPassword: string) {
  const data = await request<{ ok: true; user?: AuthApiUser }>('/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
  return data.user ? mapUserResponse({ user: data.user }) : null;
}

export async function confirmEmailVerification(token: string) {
  await request<{ ok: true }>('/email-verification/confirm', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}
