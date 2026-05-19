import type { Address, User } from '@/types/user';
import type { Order } from '@/types/order';
import type { AdminCoupon } from '@/services/adminApi';
import { AuthError, type AuthApiUser } from '@/services/authApi';

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
    response = await fetch(`/api/account${path}`, {
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
    throw new AuthError(data.error ?? 'Erro da conta.', data.error ?? 'account_error', response.status);
  }
  return data as T;
}

function mapUserResponse(data: { user: AuthApiUser }) {
  return { user: toUser(data.user), rawUser: data.user };
}

export function isAccountApiUnavailable(error: unknown) {
  return error instanceof AuthError && (error.status === 0 || error.status === 503);
}

export async function getMe() {
  try {
    return mapUserResponse(await request<{ user: AuthApiUser }>('/me'));
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) return null;
    throw error;
  }
}

export async function updateProfile(name: string) {
  return mapUserResponse(await request<{ user: AuthApiUser }>('/profile', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  }));
}

export async function listOrders() {
  return request<{ orders: Order[]; storage?: string }>('/orders');
}

export async function getOrder(id: string) {
  return request<{ order: Order; storage?: string }>(`/orders/${encodeURIComponent(id)}`);
}

export async function resendOrderConfirmation(id: string) {
  return request<{ ok: true; email?: { sent?: boolean; mode?: string } }>(`/orders/${encodeURIComponent(id)}/resend-confirmation`, {
    method: 'POST',
  });
}

export async function upsertAddress(address: Omit<Address, 'id'> & { id?: string }) {
  const path = address.id ? `/addresses/${encodeURIComponent(address.id)}` : '/addresses';
  return request<{ address: Address; addresses: Address[] }>(path, {
    method: address.id ? 'PATCH' : 'POST',
    body: JSON.stringify(address),
  });
}

export async function deleteAddress(id: string) {
  return request<{ addresses: Address[] }>(`/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function setDefaultAddress(id: string) {
  return request<{ addresses: Address[] }>(`/addresses/${encodeURIComponent(id)}/default`, { method: 'POST' });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await request<{ ok: true }>('/security/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function logoutAllSessions() {
  return request<{ ok: true; revoked: number }>('/security/logout-all', { method: 'POST' });
}

export async function requestEmailVerification() {
  await request<{ ok: true }>('/verify-email/resend', { method: 'POST' });
}

export async function listCoupons() {
  return request<{ coupons: AdminCoupon[]; storage?: string }>('/coupons');
}
