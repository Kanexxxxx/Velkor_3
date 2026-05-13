'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type NotificationVariant = 'info' | 'success' | 'error';

interface NotificationItem {
  id: number;
  message: string;
  variant: NotificationVariant;
}

interface NotificationContextValue {
  notify: (message: string, variant?: NotificationVariant) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

let counter = 0;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setItems(current => current.filter(item => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const notify = useCallback((message: string, variant: NotificationVariant = 'info') => {
    counter += 1;
    const item: NotificationItem = { id: counter, message, variant };
    setItems(current => [...current, item]);
    const timer = setTimeout(() => dismiss(item.id), 4200);
    timers.current.set(item.id, timer);
  }, [dismiss]);

  useEffect(() => {
    const cache = timers.current;
    return () => {
      cache.forEach(timer => clearTimeout(timer));
      cache.clear();
    };
  }, []);

  const value = useMemo<NotificationContextValue>(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            className={`toast toast-${item.variant} show`}
            onClick={() => dismiss(item.id)}
          >
            <span>{item.message}</span>
          </button>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications precisa estar dentro de NotificationProvider');
  }

  return context;
}
