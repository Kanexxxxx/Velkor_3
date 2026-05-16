import { API_BASE_URL } from '@/services/api';
import { getGuestSessionId } from '@/services/guestSession';
import type { CartItem } from '@/types/cart';
import type { Order, OrderContact, OrderPayment, OrderShipping } from '@/types/order';
import type { Address } from '@/types/user';

interface CreateOrderInput {
  items: CartItem[];
  contact: OrderContact;
  address: Address;
  coupon?: string;
  payment: OrderPayment;
  shipping: OrderShipping;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const sessionId = getGuestSessionId();
  if (!sessionId) throw new Error('Sessao indisponivel.');

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Velkor-Session': sessionId,
      ...init?.headers,
    },
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(data.error ?? `Erro de pedido: ${response.status}`);
  return data as T;
}

export async function createRemoteOrder(input: CreateOrderInput) {
  const data = await request<{ order?: Order; storage?: string }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!data.order) throw new Error('Pedido nao retornado pelo servidor.');
  return data.order;
}

export async function fetchRemoteOrders() {
  const data = await request<{ orders?: Order[] }>('/api/orders');
  return Array.isArray(data.orders) ? data.orders : [];
}

export async function fetchRemoteOrder(id: string): Promise<Order | null> {
  try {
    const data = await request<{ order?: Order }>(`/api/orders/${encodeURIComponent(id)}`);
    return data.order ?? null;
  } catch {
    return null;
  }
}
