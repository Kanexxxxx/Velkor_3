'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart, Star, X } from 'lucide-react';
import { useState } from 'react';
import { trackEvent } from '@/components/Analytics';
import { useCart } from '@/components/cart/CartProvider';
import { useWishlist } from '@/components/wishlist/WishlistProvider';
import type { Product } from '@/types/product';
import { categoryLabels, formatPrice } from '@/services/products';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [showSizePicker, setShowSizePicker] = useState(false);
  const saved = isWishlisted(product.id);

  const hasSingleSize = product.sizes.length === 1 && product.sizes[0] === 'ONE';
  const categoryLabel = categoryLabels[product.category] ?? product.category;
  const productHref = `/product/${encodeURIComponent(product.slug || product.id)}`;

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
        <Link href={productHref} tabIndex={showSizePicker ? -1 : undefined}>
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
          <Heart aria-hidden="true" />
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
                <X width={12} height={12} strokeWidth={2.5} aria-hidden="true" />
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
        <div className="product-cat">{product.brand} · {categoryLabel}</div>
        <Link href={productHref}>
          <h3 className="product-name">{product.name}</h3>
        </Link>
        <div className="product-row">
          <div className="product-price">
            {product.oldPrice ? <span className="old">{formatPrice(product.oldPrice)}</span> : null}
            {formatPrice(product.price)}
          </div>
          <div className="product-rating">
            <Star fill="currentColor" aria-hidden="true" />
            <span>{product.rating.toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
