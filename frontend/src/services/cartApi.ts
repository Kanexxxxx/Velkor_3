import { API_BASE_URL } from '@/services/api';
import { getGuestSessionId } from '@/services/guestSession';
import type { AddCartItemInput, CartItem } from '@/types/cart';

interface ApiCartItem extends CartItem {
  id?: string;
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

  if (!response.ok) throw new Error(`Erro de carrinho: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function fetchRemoteCart() {
  const data = await request<{ items?: ApiCartItem[] }>('/api/cart');
  return Array.isArray(data.items)
    ? data.items.filter(item => item.productId && item.size && item.color && item.quantity > 0)
    : [];
}

export async function addRemoteCartItem(input: AddCartItemInput) {
  await request('/api/cart/items', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateRemoteCartItem(item: CartItem, quantity: number) {
  const remoteItems = await fetchRemoteCart();
  const remote = remoteItems.find(remoteItem => (
    remoteItem.productId === item.productId &&
    remoteItem.size === item.size &&
    remoteItem.color === item.color
  ));
  if (!remote?.id) return;

  await request(`/api/cart/items/${encodeURIComponent(remote.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
}

export async function removeRemoteCartItem(item: CartItem) {
  const remoteItems = await fetchRemoteCart();
  const remote = remoteItems.find(remoteItem => (
    remoteItem.productId === item.productId &&
    remoteItem.size === item.size &&
    remoteItem.color === item.color
  ));
  if (!remote?.id) return;

  await request(`/api/cart/items/${encodeURIComponent(remote.id)}`, {
    method: 'DELETE',
  });
}

export async function syncRemoteCart(items: CartItem[]) {
  const remoteItems = await fetchRemoteCart();
  const remoteKeys = new Set(remoteItems.map(item => `${item.productId}:${item.size}:${item.color}`));

  await Promise.all(items
    .filter(item => !remoteKeys.has(`${item.productId}:${item.size}:${item.color}`))
    .map(item => addRemoteCartItem(item))
  );

  return fetchRemoteCart();
}
