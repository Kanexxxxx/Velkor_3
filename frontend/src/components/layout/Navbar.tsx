'use client';

import Link from 'next/link';
import { Heart, Search, ShoppingBag, User } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { useCart } from '@/components/cart/CartProvider';
import { useAuth } from '@/components/auth/AuthProvider';
import { UserMenu } from '@/components/auth/UserMenu';
import { useWishlist } from '@/components/wishlist/WishlistProvider';
import { getInfoHref } from '@/services/infoPages';
import { BrandLogo } from './BrandLogo';

const navItems = [
  { href: '/', label: 'Início' },
  { href: '/shop', label: 'Loja' },
  { href: '/shop?cat=sneakers', label: 'Tênis' },
  { href: '/shop?cat=apparel', label: 'Vestuário' },
  { href: '/shop?cat=accessories', label: 'Acessórios' },
  { href: getInfoHref('story'), label: 'Histórias' }
];

function isActive(pathname: string | null, currentSearch: string, href: string) {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';

  const [targetPath, targetSearch = ''] = href.split('?');
  if (pathname !== targetPath) return false;

  const currentParams = new URLSearchParams(currentSearch);
  if (!targetSearch) {
    return targetPath === '/shop' ? !currentParams.has('cat') : currentSearch === '';
  }

  const targetParams = new URLSearchParams(targetSearch);
  for (const [key, value] of targetParams) {
    if (currentParams.get(key) !== value) return false;
  }

  return true;
}

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [siteSearch, setSiteSearch] = useState('');
  const [hasHydrated, setHasHydrated] = useState(false);
  const { summary } = useCart();
  const { productIds: wishlistIds } = useWishlist();
  const { user, isAuthenticated, isReady, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = siteSearch.trim();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : '/shop');
    setIsMenuOpen(false);
  }

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen || isCartOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen, isCartOpen]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setIsCartOpen(false);
      }
    }

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, []);

  useEffect(() => {
    function openCart() {
      setIsCartOpen(true);
    }

    window.addEventListener('velkor:open-cart', openCart);
    return () => window.removeEventListener('velkor:open-cart', openCart);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname, currentSearch]);

  return (
    <>
      <header className="nav" id="nav">
        <div className="nav-inner">
          <BrandLogo />

          <nav aria-label="Navegação principal">
            <ul className="nav-menu">
              {navItems.map(item => {
                const active = isActive(pathname, currentSearch, item.href);
                return (
                  <li key={item.href}>
                    <Link href={item.href} className={active ? 'active' : undefined} aria-current={active ? 'page' : undefined}>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="nav-actions">
            <form className="search-wrap" role="search" onSubmit={submitSearch}>
              <button className="search-submit" type="submit" aria-label="Pesquisar no acervo">
                <Search className="search-icon" aria-hidden="true" />
              </button>
              <label className="sr-only" htmlFor="siteSearch">Buscar no acervo</label>
              <input
                id="siteSearch"
                className="search-input"
                type="search"
                placeholder="Buscar no acervo"
                value={siteSearch}
                onChange={event => setSiteSearch(event.target.value)}
              />
            </form>

            {hasHydrated && isReady && isAuthenticated ? (
              <UserMenu />
            ) : (
              <Link className="icon-btn" href="/account" aria-label="Entrar ou criar conta">
                <User aria-hidden="true" />
              </Link>
            )}

            <Link className="icon-btn" href="/wishlist" aria-label={`Favoritos (${wishlistIds.length})`}>
              <Heart aria-hidden="true" />
              {wishlistIds.length > 0 ? <span className="cart-count" aria-hidden="true">{wishlistIds.length}</span> : null}
            </Link>
            <button
              className="icon-btn"
              type="button"
              aria-label={`Abrir sacola (${summary.itemsCount})`}
              aria-controls="cartDrawer"
              aria-expanded={isCartOpen}
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingBag aria-hidden="true" />
              {summary.itemsCount > 0 ? <span className="cart-count" id="cartCount">{summary.itemsCount}</span> : null}
            </button>
            <button
              className={`menu-toggle ${isMenuOpen ? 'open' : ''}`.trim()}
              type="button"
              aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-controls="mobileMenu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen(open => !open)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`.trim()} id="mobileMenu" aria-hidden={!isMenuOpen}>
        {hasHydrated && isReady && user ? (
          <div className="mobile-account">
            <span className="mobile-avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
          </div>
        ) : (
          <Link href="/account" className="btn btn-primary mobile-cta" onClick={() => setIsMenuOpen(false)}>
            Entrar / Criar conta
          </Link>
        )}

        <form className="mobile-search-form" role="search" onSubmit={submitSearch}>
          <label className="sr-only" htmlFor="mobileSearch">Buscar no acervo</label>
          <button className="search-submit" type="submit" aria-label="Pesquisar no acervo">
            <Search className="search-icon" aria-hidden="true" />
          </button>
          <input
            id="mobileSearch"
            className="search-input"
            type="search"
            placeholder="Buscar no acervo"
            value={siteSearch}
            onChange={event => setSiteSearch(event.target.value)}
          />
        </form>

        <ul>
          {navItems.map(item => {
            const active = isActive(pathname, currentSearch, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={active ? 'active' : undefined}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {hasHydrated && isReady && user ? (
          <div className="mobile-account-actions">
            <Link href="/account?tab=profile">Meu perfil</Link>
            <Link href="/account?tab=orders">Meus pedidos</Link>
            <Link href="/account?tab=addresses">Endereços</Link>
            <Link href="/wishlist">Favoritos</Link>
            <button type="button" onClick={() => { logout(); setIsMenuOpen(false); }}>Sair</button>
          </div>
        ) : null}
      </div>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
