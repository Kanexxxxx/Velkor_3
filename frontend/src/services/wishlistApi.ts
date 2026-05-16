import { API_BASE_URL } from '@/services/api';
import { getGuestSessionId } from '@/services/guestSession';
import { normalizeWishlist } from '@/services/wishlist';

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

  if (!response.ok) throw new Error(`Erro de favoritos: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function fetchRemoteWishlist() {
  const data = await request<{ productIds?: unknown }>('/api/wishlist');
  return normalizeWishlist(data.productIds);
}

export async function addRemoteWishlistItem(productId: string) {
  await request(`/api/wishlist/${encodeURIComponent(productId)}`, { method: 'POST' });
}

export async function removeRemoteWishlistItem(productId: string) {
  await request(`/api/wishlist/${encodeURIComponent(productId)}`, { method: 'DELETE' });
}

export async function syncRemoteWishlist(productIds: string[]) {
  const remoteProductIds = await fetchRemoteWishlist();
  const remoteSet = new Set(remoteProductIds);

  await Promise.all(productIds
    .filter(productId => !remoteSet.has(productId))
    .map(productId => addRemoteWishlistItem(productId))
  );

  return fetchRemoteWishlist();
}
