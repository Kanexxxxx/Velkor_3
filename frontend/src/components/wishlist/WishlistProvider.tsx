'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { addRemoteWishlistItem, removeRemoteWishlistItem, syncRemoteWishlist } from '@/services/wishlistApi';
import { normalizeWishlist, WISHLIST_STORAGE_KEY } from '@/services/wishlist';

interface WishlistContextValue {
  productIds: string[];
  isSyncing: boolean;
  syncError: string;
  retrySync: () => void;
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncAttempt, setSyncAttempt] = useState(0);

  useEffect(() => {
    setProductIds(readStoredWishlist());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(productIds));
  }, [isReady, productIds]);

  useEffect(() => {
    if (!isReady) return;
    let active = true;
    setIsSyncing(true);
    setSyncError('');

    syncRemoteWishlist(productIds)
      .then(remoteProductIds => {
        if (!active) return;
        if (remoteProductIds.length) setProductIds(remoteProductIds);
      })
      .catch(() => {
        if (!active) return;
        setSyncError('Favoritos em modo demo. Tentaremos sincronizar novamente.');
      })
      .finally(() => {
        if (active) setIsSyncing(false);
      });

    return () => {
      active = false;
    };
  // run only after hydration and explicit retries, not after every optimistic favorite change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, syncAttempt]);

  const isWishlisted = useCallback((productId: string) => productIds.includes(productId), [productIds]);

  const toggleWishlist = useCallback((productId: string) => {
    const willAdd = !productIds.includes(productId);
    setProductIds(current => current.includes(productId)
      ? current.filter(id => id !== productId)
      : [...current, productId]
    );
    const request = willAdd ? addRemoteWishlistItem(productId) : removeRemoteWishlistItem(productId);
    request.catch(() => {
      setSyncError('Favorito salvo localmente. Nao foi possivel sincronizar agora.');
    });
  }, [productIds]);

  const removeWishlist = useCallback((productId: string) => {
    setProductIds(current => current.filter(id => id !== productId));
    removeRemoteWishlistItem(productId).catch(() => {
      setSyncError('Favorito removido localmente. Nao foi possivel sincronizar agora.');
    });
  }, []);

  const retrySync = useCallback(() => {
    setSyncAttempt(current => current + 1);
  }, []);

  const value = useMemo<WishlistContextValue>(
    () => ({ productIds, isSyncing, syncError, retrySync, isWishlisted, toggleWishlist, removeWishlist }),
    [isSyncing, isWishlisted, productIds, removeWishlist, retrySync, syncError, toggleWishlist]
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
