'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useCart } from '@/components/cart/CartProvider';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { ProductCard } from '@/components/product/ProductCard';
import { useWishlist } from '@/components/wishlist/WishlistProvider';
import { formatPrice, getProductById } from '@/services/products';
import { useProductsById } from '@/services/useProductCatalog';
import type { Product } from '@/types/product';

export function WishlistPageClient() {
  const { productIds } = useWishlist();
  const { addItem } = useCart();
  const { notify } = useNotifications();
  const { productsById, status } = useProductsById(productIds);

  const wishlistProducts = useMemo<Product[]>(
    () => productIds
      .map(id => productsById[id] ?? getProductById(id))
      .filter((product): product is Product => Boolean(product)),
    [productIds, productsById]
  );

  const totalValue = wishlistProducts.reduce((sum, product) => sum + product.price, 0);

  function addAllToCart() {
    if (wishlistProducts.length === 0) return;
    wishlistProducts.forEach(product => {
      addItem({
        productId: product.id,
        size: product.sizes[0],
        color: product.colors[0]
      });
    });
    notify(`${wishlistProducts.length} produto(s) adicionados à sacola.`, 'success');
    window.dispatchEvent(new Event('velkor:open-cart'));
  }

  return (
    <main className="info-page">
      <div className="container">
        <div className="crumbs">
          <Link href="/">Início</Link>
          <span className="sep">/</span>
          <span>Favoritos</span>
        </div>

        <div className="info-hero">
          <div>
            <div className="section-num">PRODUTOS SALVOS</div>
            <h1>Seus <span className="red">Favoritos.</span></h1>
            <p>{wishlistProducts.length} produto{wishlistProducts.length === 1 ? '' : 's'} salvo{wishlistProducts.length === 1 ? '' : 's'}{wishlistProducts.length ? ` · valor total ${formatPrice(totalValue)}` : ''}.</p>
          </div>
          <div className="wishlist-actions">
            {wishlistProducts.length > 0 ? (
              <button type="button" className="btn btn-primary" onClick={addAllToCart}>
                Adicionar todos à sacola
              </button>
            ) : null}
            <Link href="/shop" className="btn btn-ghost">Continuar comprando</Link>
          </div>
        </div>

        {wishlistProducts.length ? (
          <div className="product-grid shop-grid">
            {wishlistProducts.map(product => <ProductCard product={product} key={product.id} />)}
          </div>
        ) : status === 'loading' ? (
          <div className="empty-state">
            <h2>Carregando favoritos.</h2>
            <p>Estamos buscando os produtos salvos no catalogo atual.</p>
          </div>
        ) : (
          <div className="empty-state">
            <h2>Nenhum favorito ainda.</h2>
            <p>Toque no coração de qualquer produto para salvá-lo aqui. Eles ficam guardados para suas próximas visitas.</p>
            <Link href="/shop" className="btn btn-primary">Ver produtos</Link>
          </div>
        )}
      </div>
    </main>
  );
}
