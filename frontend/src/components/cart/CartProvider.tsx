'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CART_STORAGE_KEY, calculateCartSummary } from '@/services/cart';
import { products } from '@/services/products';
import type { AddCartItemInput, CartItem, CartSummary } from '@/types/cart';

interface CartContextValue {
  items: CartItem[];
  summary: CartSummary;
  addItem: (item: AddCartItemInput) => void;
  updateQuantity: (item: CartItem, quantity: number) => void;
  removeItem: (item: CartItem) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function itemKey(item: Pick<CartItem, 'productId' | 'size' | 'color'>) {
  return `${item.productId}:${item.size}:${item.color}`;
}

function readStoredCart(): CartItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as CartItem[];
    return Array.isArray(parsed) ? parsed.filter(item => item.productId && item.size && item.color && item.quantity > 0) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setItems(readStoredCart());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [isReady, items]);

  const prices = useMemo(
    () => Object.fromEntries(products.map(product => [product.id, product.price])),
    []
  );

  const summary = useMemo(() => calculateCartSummary(items, prices), [items, prices]);

  const addItem = useCallback((input: AddCartItemInput) => {
    const quantity = input.quantity ?? 1;

    setItems(current => {
      const key = itemKey(input);
      const existing = current.find(item => itemKey(item) === key);

      if (existing) {
        return current.map(item => itemKey(item) === key ? { ...item, quantity: item.quantity + quantity } : item);
      }

      return [...current, { ...input, quantity }];
    });
  }, []);

  const removeItem = useCallback((target: CartItem) => {
    setItems(current => current.filter(item => itemKey(item) !== itemKey(target)));
  }, []);

  const updateQuantity = useCallback((target: CartItem, quantity: number) => {
    if (quantity <= 0) {
      removeItem(target);
      return;
    }

    setItems(current => current.map(item => itemKey(item) === itemKey(target) ? { ...item, quantity } : item));
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({ items, summary, addItem, updateQuantity, removeItem, clearCart }),
    [addItem, clearCart, items, removeItem, summary, updateQuantity]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart precisa estar dentro de CartProvider');
  }

  return context;
}
