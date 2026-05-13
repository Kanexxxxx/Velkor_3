import type { CartItem, CartSummary } from '@/types/cart';

export const CART_STORAGE_KEY = 'velkor_cart_v1';

export function calculateCartSummary(items: CartItem[], prices: Record<string, number>): CartSummary {
  const subtotal = items.reduce((sum, item) => {
    return sum + (prices[item.productId] ?? 0) * item.quantity;
  }, 0);

  return {
    subtotal,
    total: subtotal,
    itemsCount: items.reduce((sum, item) => sum + item.quantity, 0)
  };
}
