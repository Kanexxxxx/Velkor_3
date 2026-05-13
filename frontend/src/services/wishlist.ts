export const WISHLIST_STORAGE_KEY = 'velkor_wishlist_v1';

export function normalizeWishlist(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim())));
}
