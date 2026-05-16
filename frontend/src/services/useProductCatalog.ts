'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Product } from '@/types/product';
import { fallbackCatalog, fetchCatalog, fetchProduct, type CatalogState } from '@/services/productApi';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface CatalogLoadState extends CatalogState {
  status: LoadStatus;
  error: string;
  retry: () => void;
}

export function useProductCatalog(): CatalogLoadState {
  const [catalog, setCatalog] = useState<CatalogState>(fallbackCatalog);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setAttempt(current => current + 1);
  }, []);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError('');

    fetchCatalog()
      .then(nextCatalog => {
        if (!active) return;
        setCatalog(nextCatalog);
        setStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setCatalog(fallbackCatalog);
        setStatus('error');
        setError('Nao foi possivel carregar o catalogo em tempo real. Exibindo modo demo.');
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  return { ...catalog, status, error, retry };
}

export function useProductDetail(initialProduct: Product) {
  const [product, setProduct] = useState(initialProduct);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setAttempt(current => current + 1);
  }, []);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError('');

    fetchProduct(initialProduct.id)
      .then(apiProduct => {
        if (!active) return;
        setProduct(apiProduct);
        setStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setProduct(initialProduct);
        setStatus('error');
        setError('Nao foi possivel atualizar este produto agora. Exibindo dados locais.');
      });

    return () => {
      active = false;
    };
  }, [attempt, initialProduct]);

  return { product, status, error, retry };
}
