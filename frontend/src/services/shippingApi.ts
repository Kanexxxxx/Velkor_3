import { API_BASE_URL } from '@/services/api';
import type { CartItem } from '@/types/cart';

export interface ShippingQuote {
  id: string;
  provider: string;
  name: string;
  price: number;
  priceCents: number;
  deliveryTime: number;
}

export async function quoteShipping(postalCode: string, items: CartItem[]) {
  const response = await fetch(`${API_BASE_URL}/api/shipping/quote`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ postalCode, items }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({})) as { error?: string; quotes?: ShippingQuote[] };
  if (!response.ok) throw new Error(data.error ?? 'Nao foi possivel calcular o frete.');
  return Array.isArray(data.quotes) ? data.quotes : [];
}
