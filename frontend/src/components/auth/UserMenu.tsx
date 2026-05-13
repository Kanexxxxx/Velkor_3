'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthProvider';
import { useNotifications } from '@/components/notifications/NotificationProvider';

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'V';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserMenu() {
  const { user, logout } = useAuth();
  const { notify } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  if (!user) return null;

  function handleLogout() {
    logout();
    setOpen(false);
    notify('Sessão encerrada.', 'info');
  }

  return (
    <div className={`user-menu${open ? ' open' : ''}`} ref={wrapperRef}>
      <button
        type="button"
        className="user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        <span className="user-avatar" aria-hidden="true">{getInitials(user.name)}</span>
        <span className="user-menu-meta">
          <span className="user-menu-hello">Olá,</span>
          <span className="user-menu-name">{user.name.split(' ')[0]}</span>
        </span>
      </button>
      {open ? (
        <div className="user-menu-panel" role="menu">
          <div className="user-menu-header">
            <div className="user-menu-avatar-lg" aria-hidden="true">{getInitials(user.name)}</div>
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <ul>
            <li><Link role="menuitem" href="/account?tab=profile" onClick={() => setOpen(false)}>Meu perfil</Link></li>
            <li><Link role="menuitem" href="/account?tab=orders" onClick={() => setOpen(false)}>Meus pedidos</Link></li>
            <li><Link role="menuitem" href="/account?tab=addresses" onClick={() => setOpen(false)}>Endereços</Link></li>
            <li><Link role="menuitem" href="/wishlist" onClick={() => setOpen(false)}>Favoritos</Link></li>
            <li><Link role="menuitem" href="/account?tab=security" onClick={() => setOpen(false)}>Senha & segurança</Link></li>
          </ul>
          <button type="button" className="user-menu-logout" role="menuitem" onClick={handleLogout}>
            Sair da conta
          </button>
        </div>
      ) : null}
    </div>
  );
}
