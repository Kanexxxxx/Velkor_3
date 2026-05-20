'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Product } from '@/types/product';
import { fallbackCatalog, fetchCatalog, fetchProduct, writeCachedCatalog, type CatalogState } from '@/services/productApi';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface CatalogLoadState extends CatalogState {
  status: LoadStatus;
  error: string;
  retry: () => void;
}

function getInitialCatalogState() {
  return {
    catalog: { products: [], categories: fallbackCatalog.categories, source: 'api' as const },
    status: 'idle' as LoadStatus,
  };
}

export function useProductCatalog(): CatalogLoadState {
  const [catalog, setCatalog] = useState<CatalogState>(() => getInitialCatalogState().catalog);
  const [status, setStatus] = useState<LoadStatus>(() => getInitialCatalogState().status);
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
        writeCachedCatalog(nextCatalog);
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

    fetchProduct(initialProduct.slug || initialProduct.id)
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

export function useProductsById(productIds: string[]) {
  const [productsById, setProductsById] = useState<Record<string, Product>>({});
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState('');
  const normalizedIds = productIds.filter(Boolean).sort().join('|');

  useEffect(() => {
    const ids = normalizedIds ? normalizedIds.split('|') : [];
    if (!ids.length) {
      setProductsById({});
      setStatus('ready');
      setError('');
      return;
    }

    let active = true;
    setStatus('loading');
    setError('');

    Promise.all(ids.map(id => fetchProduct(id)))
      .then(products => {
        if (!active) return;
        setProductsById(Object.fromEntries(products.map(product => [product.id, product])));
        setStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setStatus('error');
        setError('Nao foi possivel carregar todos os produtos do carrinho.');
      });

    return () => {
      active = false;
    };
  }, [normalizedIds]);

  return { productsById, status, error };
}
