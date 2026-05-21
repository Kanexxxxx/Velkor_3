'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Check, Heart, Package, RefreshCcw, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { trackEvent } from '@/components/Analytics';
import { useCart } from '@/components/cart/CartProvider';
import { ProductCard } from '@/components/product/ProductCard';
import { useWishlist } from '@/components/wishlist/WishlistProvider';
import { getInfoHref } from '@/services/infoPages';
import { categoryLabels, formatPrice } from '@/services/products';
import { useProductCatalog, useProductDetail } from '@/services/useProductCatalog';
import type { Product } from '@/types/product';

interface ProductDetailClientProps {
  product: Product;
}

type TabId = 'desc' | 'specs' | 'ship' | 'reviews';

const colorNames: Record<string, string> = {
  '#0a0a0a': 'Ônix',
  '#ff1a3d': 'Vermelho Signal',
  '#f5f1ea': 'Osso',
  '#6a6a6a': 'Aço',
  '#2a2a2a': 'Grafite'
};

function CatalogStatus({ status, error, onRetry }: { status: 'idle' | 'loading' | 'ready' | 'error'; error: string; onRetry: () => void }) {
  if (status === 'loading') {
    return <p className="catalog-status" aria-live="polite">Atualizando produto...</p>;
  }

  if (status === 'error') {
    return (
      <div className="catalog-status error" role="status">
        <span>{error}</span>
        <button type="button" onClick={onRetry}>Tentar novamente</button>
      </div>
    );
  }

  return null;
}

export function ProductDetailClient({ product: initialProduct }: ProductDetailClientProps) {
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const detailState = useProductDetail(initialProduct);
  const catalog = useProductCatalog();
  const product = detailState.product;
  const images = useMemo(() => (product.images?.length ? product.images : [product.image]), [product.image, product.images]);
  const [activeImage, setActiveImage] = useState(images[0]);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0]);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<TabId>('desc');
  const saved = isWishlisted(product.id);

  useEffect(() => {
    setActiveImage(images[0]);
    setSelectedColor(product.colors[0]);
    setSelectedSize(product.sizes[0]);
  }, [images, product.colors, product.sizes]);

  const relatedProducts = useMemo(
    () => catalog.products.filter(item => item.category === product.category && item.id !== product.id).slice(0, 4),
    [catalog.products, product.category, product.id]
  );
  const categoryLabel = categoryLabels[product.category] ?? product.category;

  const discount = product.discount ?? (
    product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0
  );
  const canPurchase = product.price > 0;

  const tabContent: Record<TabId, string[]> = {
    desc: [
      `O ${product.name} é uma das construções mais exigentes da Velkor, pensado com disciplina material e engenharia para atravessar a cidade por anos.`,
      'Cada peça é finalizada com documentação de acervo. As tiragens são limitadas e não há reposição quando a edição encerra.',
      'Design monolítico, intencional e feito para envelhecer bem no uso real.'
    ],
    specs: [
      'Construção: estrutura reforçada, acabamento premium e pontos de tensão pensados para uso urbano intenso.',
      'Materiais: base técnica com componentes reciclados, superfícies resistentes e toque macio nas áreas de contato.',
      'Origem: coleção FW26, numerada por lote e preparada para drops limitados.'
    ],
    ship: [
      'Frete grátis em pedidos acima de R$ 499. As opções expressas aparecem no checkout.',
      'Prazo estimado: capitais em 2 a 5 dias úteis e demais regiões em 4 a 8 dias úteis.',
      'Troca e devolução em até 30 dias para produtos sem uso e com embalagem original.'
    ],
    reviews: [
      '★★★★★ "Construção impecável e presença forte no visual." · AM / São Paulo',
      '★★★★★ "A peça chegou bem embalada e veste melhor do que eu esperava." · RV / Curitiba',
      '★★★★★ "A Velkor acertou a mistura de silhueta forte com marca discreta." · DK / Recife'
    ]
  };

  return (
    <section className="pdp">
      <div className="container">
        <div className="pdp-grid">
          <div className="pdp-gallery">
            <div className="pdp-thumbs" aria-label="Galeria do produto">
              {images.map((image, index) => (
                <button
                  className={activeImage === image ? 'active' : undefined}
                  type="button"
                  key={image}
                  onClick={() => setActiveImage(image)}
                  aria-label={`Ver imagem ${index + 1} de ${product.name}`}
                >
                  <Image src={image} alt="" width={120} height={120} sizes="80px" />
                </button>
              ))}
            </div>
            <div className="pdp-main-image">
              <Image
                src={activeImage}
                alt={product.name}
                width={900}
                height={1100}
                priority
                sizes="(max-width: 1100px) 100vw, 55vw"
              />
            </div>
          </div>

          <div className="pdp-info">
            <CatalogStatus status={detailState.status} error={detailState.error || catalog.error} onRetry={detailState.retry} />

            <div className="crumbs">
              <Link href="/">Início</Link>
              <span className="sep">/</span>
              <Link href={`/shop?cat=${product.category}`}>{categoryLabel}</Link>
              <span className="sep">/</span>
              <span>{product.name}</span>
            </div>

            <div className="eyebrow" style={{ marginBottom: 14 }}>
              {product.brand.toUpperCase()} · {categoryLabel.toUpperCase()}
            </div>
            <h1>{product.name}</h1>

            <div className="pdp-meta">
              <div className="pdp-stars" aria-label={`${product.rating.toLocaleString('pt-BR')} de 5 estrelas`}>
                {Array.from({ length: 5 }, (_, index) => (
                  <Star fill={index < Math.round(product.rating) ? 'currentColor' : 'none'} strokeWidth={1.5} key={index} aria-hidden="true" />
                ))}
              </div>
              <span>{product.rating.toLocaleString('pt-BR')} ({product.reviews.toLocaleString('pt-BR')} avaliações)</span>
            </div>

            <div className="pdp-price-row">
              <span className="now">{formatPrice(product.price)}</span>
              {product.oldPrice ? <span className="old">{formatPrice(product.oldPrice)}</span> : null}
              {discount > 0 ? <span className="save">ECONOMIZE {discount}%</span> : null}
            </div>

            <div className="pdp-section">
              <h5>Cor <span>{colorNames[selectedColor] ?? 'Personalizada'}</span></h5>
              <div className="color-options">
                {product.colors.map(color => (
                  <button
                    className={`color-pick${selectedColor === color ? ' active' : ''}`}
                    type="button"
                    key={color}
                    style={{ backgroundColor: color }}
                    aria-label={`Selecionar cor ${colorNames[color] ?? color}`}
                    aria-pressed={selectedColor === color}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>

            <div className="pdp-section">
              <h5>
                Tamanho <Link href={getInfoHref('size-guide')}>Guia de Tamanhos</Link>
              </h5>
              <div className="size-options">
                {product.sizes.map(size => (
                  <button
                    className={selectedSize === size ? 'active' : undefined}
                    type="button"
                    key={size}
                    aria-pressed={selectedSize === size}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="pdp-actions">
              <div className="qty-control" aria-label="Quantidade">
                <button type="button" onClick={() => setQuantity(current => Math.max(1, current - 1))} aria-label="Diminuir quantidade">−</button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity(current => current + 1)} aria-label="Aumentar quantidade">+</button>
              </div>
              <button
                className="pdp-buy"
                type="button"
                disabled={!canPurchase}
                onClick={() => {
                  if (!canPurchase) return;
                  addItem({
                    productId: product.id,
                    quantity,
                    size: selectedSize,
                    color: selectedColor
                  });
                  trackEvent('AddToCart', { content_ids: [product.id], content_name: product.name, value: product.price * quantity, currency: 'BRL' });
                  window.dispatchEvent(new Event('velkor:open-cart'));
                }}
              >
                {canPurchase ? 'Adicionar à sacola' : 'Produto indisponível'} <span>{formatPrice(product.price * quantity)}</span>
              </button>
              <button
                className={`pdp-wish${saved ? ' active' : ''}`}
                type="button"
                aria-label={saved ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                aria-pressed={saved}
                onClick={() => toggleWishlist(product.id)}
              >
                <Heart width={18} height={18} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>

            <ul className="pdp-perks">
              <li><Check aria-hidden="true" /> FRETE GRÁTIS ACIMA DE R$ 499</li>
              <li><Package aria-hidden="true" /> EMBALAGEM PREMIUM · IDENTIFICAÇÃO DE LOTE INCLUSA</li>
              <li><RefreshCcw aria-hidden="true" /> TROCA E DEVOLUÇÃO EM ATÉ 30 DIAS</li>
            </ul>
          </div>
        </div>

        <div className="pdp-tabs">
          <div className="tabs-nav" role="tablist" aria-label="Informações do produto">
            {[
              ['desc', 'Descrição'],
              ['specs', 'Materiais e Especificações'],
              ['ship', 'Frete'],
              ['reviews', `Avaliações (${product.reviews.toLocaleString('pt-BR')})`]
            ].map(([id, label]) => (
              <button
                className={activeTab === id ? 'active' : undefined}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                key={id}
                onClick={() => setActiveTab(id as TabId)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="tab-content" role="tabpanel">
            {tabContent[activeTab].map(paragraph => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>

        <section className="section" style={{ padding: '100px 0 40px' }}>
          <div className="section-head">
            <div>
              <div className="section-num">TALVEZ VOCÊ CURTA</div>
              <h2 className="section-title">Do <span className="red">Mesmo Drop</span></h2>
            </div>
            <Link href="/shop" className="section-link">
              Ver todos
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="product-grid">
            {relatedProducts.map(related => (
              <ProductCard product={related} key={related.id} />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
