'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { trackEvent } from '@/components/Analytics';
import { useCart } from '@/components/cart/CartProvider';
import { useWishlist } from '@/components/wishlist/WishlistProvider';
import type { Product } from '@/types/product';
import { categoryLabels, formatPrice } from '@/services/products';

interface ProductCardProps {
  product: Product;
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [showSizePicker, setShowSizePicker] = useState(false);
  const saved = isWishlisted(product.id);

  const hasSingleSize = product.sizes.length === 1 && product.sizes[0] === 'ONE';

  const badges = [
    product.badge === 'NEW' ? <span className="badge new" key="new">NOVO</span> : null,
    product.badge === 'TRENDING' ? <span className="badge" key="trending">EM ALTA</span> : null,
    product.discount ? <span className="badge" key="discount">-{product.discount}%</span> : null
  ].filter(Boolean);

  function handleQuickAdd() {
    if (hasSingleSize) {
      addItem({ productId: product.id, size: product.sizes[0], color: product.colors[0] });
      trackEvent('AddToCart', { content_ids: [product.id], content_name: product.name, value: product.price, currency: 'BRL' });
      window.dispatchEvent(new Event('velkor:open-cart'));
      return;
    }
    setShowSizePicker(true);
  }

  function handleSizeSelect(size: string) {
    addItem({ productId: product.id, size, color: product.colors[0] });
    trackEvent('AddToCart', { content_ids: [product.id], content_name: product.name, value: product.price, currency: 'BRL' });
    setShowSizePicker(false);
    window.dispatchEvent(new Event('velkor:open-cart'));
  }

  return (
    <article className="product-card" data-id={product.id}>
      <div className="product-media">
        <Link href={`/product/${product.id}`} tabIndex={showSizePicker ? -1 : undefined}>
          <Image src={product.image} alt={product.name} width={800} height={960} sizes="(max-width: 760px) 100vw, (max-width: 1100px) 33vw, 25vw" />
        </Link>
        <div className="product-badge">{badges}</div>
        <button
          className={`wishlist-btn${saved ? ' active' : ''}`}
          type="button"
          aria-label={saved ? `Remover ${product.name} dos favoritos` : `Adicionar ${product.name} aos favoritos`}
          aria-pressed={saved}
          onClick={() => toggleWishlist(product.id)}
        >
          <HeartIcon />
        </button>
        <button
          className="quick-add"
          type="button"
          aria-label={`Adicionar ${product.name} ao carrinho`}
          aria-expanded={showSizePicker}
          onClick={handleQuickAdd}
        >
          Adicionar ao carrinho
        </button>

        {showSizePicker ? (
          <div className="size-picker-overlay" role="dialog" aria-label={`Escolher tamanho — ${product.name}`}>
            <div className="size-picker-header">
              <span>Escolha o tamanho</span>
              <button type="button" aria-label="Fechar" onClick={() => setShowSizePicker(false)}>
                <CloseIcon />
              </button>
            </div>
            <div className="size-picker-grid">
              {product.sizes.map(size => (
                <button
                  key={size}
                  type="button"
                  className="size-picker-btn"
                  onClick={() => handleSizeSelect(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="product-info">
        <div className="product-cat">{product.brand} · {categoryLabels[product.category]}</div>
        <Link href={`/product/${product.id}`}>
          <h3 className="product-name">{product.name}</h3>
        </Link>
        <div className="product-row">
          <div className="product-price">
            {product.oldPrice ? <span className="old">{formatPrice(product.oldPrice)}</span> : null}
            {formatPrice(product.price)}
          </div>
          <div className="product-rating">
            <StarIcon />
            <span>{product.rating.toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
