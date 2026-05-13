'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { normalizeWishlist, WISHLIST_STORAGE_KEY } from '@/services/wishlist';

interface WishlistContextValue {
  productIds: string[];
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => void;
  removeWishlist: (productId: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

function readStoredWishlist() {
  if (typeof window === 'undefined') return [];

  try {
    return normalizeWishlist(JSON.parse(window.localStorage.getItem(WISHLIST_STORAGE_KEY) ?? '[]'));
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [productIds, setProductIds] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setProductIds(readStoredWishlist());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(productIds));
  }, [isReady, productIds]);

  const isWishlisted = useCallback((productId: string) => productIds.includes(productId), [productIds]);

  const toggleWishlist = useCallback((productId: string) => {
    setProductIds(current => current.includes(productId)
      ? current.filter(id => id !== productId)
      : [...current, productId]
    );
  }, []);

  const removeWishlist = useCallback((productId: string) => {
    setProductIds(current => current.filter(id => id !== productId));
  }, []);

  const value = useMemo<WishlistContextValue>(
    () => ({ productIds, isWishlisted, toggleWishlist, removeWishlist }),
    [isWishlisted, productIds, removeWishlist, toggleWishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist precisa estar dentro de WishlistProvider');
  }

  return context;
}
