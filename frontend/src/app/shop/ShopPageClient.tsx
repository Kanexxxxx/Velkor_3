'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from '@/components/product/ProductCard';
import { categoryLabels, formatPrice } from '@/services/products';
import { useProductCatalog } from '@/services/useProductCatalog';
import type { Product, ProductCategory } from '@/types/product';

type SortValue = 'popular' | 'new' | 'price-asc' | 'price-desc' | 'rating';

const categories: ProductCategory[] = ['sneakers', 'apparel', 'accessories'];
const sizes = ['XS', 'S', 'M', 'L', 'XL', '39', '40', '41', '42', '43', '44'];
const colors = ['#0a0a0a', '#ff1a3d', '#f5f1ea', '#6a6a6a', '#2a2a2a'];

const categoryCopy: Record<ProductCategory, { title: string; red: string; eyebrow: string }> = {
  sneakers: {
    title: 'Tênis e',
    red: 'Calçados.',
    eyebrow: 'CALÇADOS DE PERFORMANCE · SILHUETAS URBANAS · DROP FW26'
  },
  apparel: {
    title: 'Vestuário',
    red: 'Velkor.',
    eyebrow: 'CASACOS · MALHAS · CALÇAS · TOPS'
  },
  accessories: {
    title: 'Acessórios',
    red: 'Técnicos.',
    eyebrow: 'BOLSAS · ÓCULOS · CINTOS · EQUIPAMENTOS'
  }
};

function isCategory(value: string | null): value is ProductCategory {
  return value === 'sneakers' || value === 'apparel' || value === 'accessories';
}

function isSortValue(value: string | null): value is SortValue {
  return value === 'popular' || value === 'new' || value === 'price-asc' || value === 'price-desc' || value === 'rating';
}

function getCategorySet(categoryParam: string | null) {
  return new Set<ProductCategory>(isCategory(categoryParam) ? [categoryParam] : []);
}

function getSort(sortParam: string | null): SortValue {
  return isSortValue(sortParam) ? sortParam : 'popular';
}

function sortProducts(items: Product[], sort: SortValue) {
  return [...items].sort((a, b) => {
    if (sort === 'price-asc') return a.price - b.price;
    if (sort === 'price-desc') return b.price - a.price;
    if (sort === 'rating') return b.rating - a.rating;
    if (sort === 'new') {
      const aNew = a.tag === 'new' || a.badge === 'NEW' ? 1 : 0;
      const bNew = b.tag === 'new' || b.badge === 'NEW' ? 1 : 0;
      return bNew - aNew;
    }

    return b.reviews - a.reviews;
  });
}

function CatalogStatus({ status, error, onRetry }: { status: 'idle' | 'loading' | 'ready' | 'error'; error: string; onRetry: () => void }) {
  if (status === 'loading') {
    return <p className="catalog-status" aria-live="polite">Atualizando catálogo...</p>;
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

export function ShopPageClient() {
  const catalog = useProductCatalog();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('cat');
  const sortParam = searchParams.get('sort');
  const queryParam = searchParams.get('q');
  const [selectedCategories, setSelectedCategories] = useState<Set<ProductCategory>>(() => getCategorySet(categoryParam));
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(() => new Set());
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState(3000);
  const [sort, setSort] = useState<SortValue>(() => getSort(sortParam));
  const [search, setSearch] = useState(queryParam ?? '');
  const productList = catalog.products;
  const availableCategories = catalog.categories.map(category => category.slug).filter(isCategory);
  const visibleCategories = availableCategories.length ? availableCategories : categories;
  const brands = useMemo(() => Array.from(new Set(productList.map(product => product.brand))).sort(), [productList]);
  const countByCategory = useCallback((category: ProductCategory) => productList.filter(product => product.category === category).length, [productList]);
  const countByBrand = useCallback((brand: string) => productList.filter(product => product.brand === brand).length, [productList]);

  useEffect(() => {
    setSelectedCategories(getCategorySet(categoryParam));
  }, [categoryParam]);

  useEffect(() => {
    setSort(getSort(sortParam));
  }, [sortParam]);

  useEffect(() => {
    setSearch(queryParam ?? '');
  }, [queryParam]);

  const activeCategory = selectedCategories.size === 1 ? Array.from(selectedCategories)[0] : null;
  const heroCopy = activeCategory ? categoryCopy[activeCategory] : null;

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const filtered = productList.filter(product => {
      const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(product.category);
      const matchesBrand = selectedBrands.size === 0 || selectedBrands.has(product.brand);
      const matchesSize = !selectedSize || product.sizes.includes(selectedSize);
      const matchesColor = !selectedColor || product.colors.includes(selectedColor);
      const matchesPrice = product.price <= maxPrice;
      const matchesSearch = !term || [
        product.name,
        product.brand,
        categoryLabels[product.category]
      ].some(value => value.toLocaleLowerCase('pt-BR').includes(term));

      return matchesCategory && matchesBrand && matchesSize && matchesColor && matchesPrice && matchesSearch;
    });

    return sortProducts(filtered, sort);
  }, [maxPrice, productList, search, selectedBrands, selectedCategories, selectedColor, selectedSize, sort]);

  function toggleCategory(category: ProductCategory) {
    setSelectedCategories(current => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function toggleBrand(brand: string) {
    setSelectedBrands(current => {
      const next = new Set(current);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });
  }

  function clearFilters() {
    setSelectedCategories(new Set());
    setSelectedBrands(new Set());
    setSelectedSize(null);
    setSelectedColor(null);
    setMaxPrice(3000);
    setSearch('');
    setSort('popular');
  }

  return (
    <>
      <section className="shop-hero">
        <div className="container">
          <div className="crumbs">
            <Link href="/">Início</Link>
            <span className="sep">/</span>
            <span>Loja</span>
          </div>
          <h1>
            {heroCopy ? (
              <>
                {heroCopy.title} <span className="red">{heroCopy.red}</span>
              </>
            ) : (
              <>
                Todos os <span className="red">Produtos.</span>
              </>
            )}
          </h1>
          <div className="eyebrow" style={{ marginTop: 18 }}>
            {heroCopy?.eyebrow ?? 'FW26 · DROP 018 · CURADO PARA AS RUAS'}
          </div>
        </div>
      </section>

      <main className="container">
        <div className="shop-layout">
          <aside className="filters" aria-label="Filtros da loja">
            <div className="filter-group">
              <h4>Buscar</h4>
              <label className="sr-only" htmlFor="shop-search">Buscar produtos</label>
              <input
                id="shop-search"
                className="search-input"
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="BUSCAR"
                style={{ width: '100%', paddingLeft: 16 }}
              />
            </div>

            <div className="filter-group">
              <h4>Categorias</h4>
              <div className="filter-list">
                {visibleCategories.map(category => (
                  <label key={category}>
                    <input
                      type="checkbox"
                      checked={selectedCategories.has(category)}
                      onChange={() => toggleCategory(category)}
                    />
                    {categoryLabels[category]}
                    <span className="count">{countByCategory(category)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>Tamanho</h4>
              <div className="size-grid">
                {sizes.map(size => (
                  <button
                    className={selectedSize === size ? 'active' : undefined}
                    type="button"
                    aria-pressed={selectedSize === size}
                    key={size}
                    onClick={() => setSelectedSize(current => (current === size ? null : size))}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>Preço</h4>
              <div className="price-range">
                <label className="sr-only" htmlFor="max-price">Preço máximo</label>
                <input
                  id="max-price"
                  type="range"
                  min="200"
                  max="3000"
                  step="10"
                  value={maxPrice}
                  onChange={event => setMaxPrice(Number(event.target.value))}
                />
                <div className="price-vals">
                  <span>R$ 200</span>
                  <span>{formatPrice(maxPrice)}</span>
                </div>
              </div>
            </div>

            <div className="filter-group">
              <h4>Marca</h4>
              <div className="filter-list">
                {brands.map(brand => (
                  <label key={brand}>
                    <input
                      type="checkbox"
                      checked={selectedBrands.has(brand)}
                      onChange={() => toggleBrand(brand)}
                    />
                    {brand}
                    <span className="count">{countByBrand(brand)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <h4>Cor</h4>
              <div className="color-row">
                {colors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`color-swatch${selectedColor === color ? ' active' : ''}`}
                    aria-label={`Filtrar pela cor ${color}`}
                    aria-pressed={selectedColor === color}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(current => (current === color ? null : color))}
                  />
                ))}
              </div>
            </div>

            <div className="filter-group">
              <button className="btn btn-ghost" type="button" onClick={clearFilters}>
                Limpar filtros
              </button>
            </div>
          </aside>

          <section className="shop-main" aria-live="polite">
            <CatalogStatus status={catalog.status} error={catalog.error} onRetry={catalog.retry} />

            <div className="shop-toolbar">
              <div className="count">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'produto' : 'produtos'} encontrados
              </div>
              <label className="sort-select">
                <span className="sr-only">Ordenar produtos</span>
                <select value={sort} onChange={event => setSort(event.target.value as SortValue)}>
                  <option value="popular">Mais populares</option>
                  <option value="new">Novidades</option>
                  <option value="price-asc">Menor preço</option>
                  <option value="price-desc">Maior preço</option>
                  <option value="rating">Melhor avaliação</option>
                </select>
              </label>
            </div>

            {filteredProducts.length > 0 ? (
              <div className="shop-grid">
                {filteredProducts.map(product => (
                  <ProductCard product={product} key={product.id} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h2>Nenhum produto encontrado.</h2>
                <p>Ajuste os filtros ou limpe a busca para ver novamente o catálogo Velkor.</p>
                <button className="btn btn-primary" type="button" onClick={clearFilters}>
                  Limpar filtros
                </button>
              </div>
            )}

            <nav className="pagination" aria-label="Paginação da loja">
              <span className="active" aria-current="page">1</span>
            </nav>
          </section>
        </div>
      </main>
    </>
  );
}
