import { API_BASE_URL } from '@/services/api';
import type { Product, ProductCategory } from '@/types/product';
import { products as fallbackProducts } from '@/services/products';

export interface ApiCategory {
  id: string;
  slug: ProductCategory;
  name: string;
  description?: string;
}

export type CatalogSource = 'api' | 'fallback';

export interface CatalogState {
  products: Product[];
  categories: ApiCategory[];
  source: CatalogSource;
}

const CATALOG_CACHE_KEY = 'velkor_catalog_cache_v1';
const REQUEST_TIMEOUT_MS = 5000;
const fallbackCategories: ApiCategory[] = [
  { id: 'cat_sneakers', slug: 'sneakers', name: 'Tenis' },
  { id: 'cat_apparel', slug: 'apparel', name: 'Vestuario' },
  { id: 'cat_accessories', slug: 'accessories', name: 'Acessorios' }
];

function isProductCategory(value: unknown): value is ProductCategory {
  return value === 'sneakers' || value === 'apparel' || value === 'accessories';
}

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeProduct(value: unknown): Product | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<Product>;
  if (
    typeof item.id !== 'string' ||
    typeof item.name !== 'string' ||
    !isProductCategory(item.category) ||
    typeof item.brand !== 'string' ||
    typeof item.price !== 'number' ||
    typeof item.image !== 'string'
  ) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    category: item.category,
    brand: item.brand,
    price: item.price,
    oldPrice: typeof item.oldPrice === 'number' ? item.oldPrice : undefined,
    rating: typeof item.rating === 'number' ? item.rating : 0,
    reviews: typeof item.reviews === 'number' ? item.reviews : 0,
    badge: item.badge === 'NEW' || item.badge === 'TRENDING' ? item.badge : undefined,
    discount: typeof item.discount === 'number' ? item.discount : undefined,
    colors: safeArray(item.colors).filter((color): color is string => typeof color === 'string'),
    image: item.image,
    images: safeArray(item.images).filter((image): image is string => typeof image === 'string'),
    sizes: safeArray(item.sizes).filter((size): size is string => typeof size === 'string'),
    tag: item.tag === 'trending' || item.tag === 'best' || item.tag === 'new' ? item.tag : 'new'
  };
}

function normalizeCategory(value: unknown): ApiCategory | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<ApiCategory>;
  if (typeof item.id !== 'string' || !isProductCategory(item.slug) || typeof item.name !== 'string') {
    return null;
  }
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: typeof item.description === 'string' ? item.description : undefined
  };
}

async function fetchJson<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: 'no-store',
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`API respondeu ${response.status}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchCatalog(): Promise<CatalogState> {
  const [productsResponse, categoriesResponse] = await Promise.all([
    fetchJson<{ products?: unknown[] }>('/api/products'),
    fetchJson<{ categories?: unknown[] }>('/api/categories')
  ]);

  const apiProducts = safeArray(productsResponse.products).map(normalizeProduct).filter((product): product is Product => Boolean(product));
  const apiCategories = safeArray(categoriesResponse.categories).map(normalizeCategory).filter((category): category is ApiCategory => Boolean(category));

  if (apiProducts.length === 0) throw new Error('Catalogo vazio.');

  return {
    products: apiProducts,
    categories: apiCategories.length ? apiCategories : fallbackCategories,
    source: 'api'
  };
}

export function readCachedCatalog(): CatalogState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { products?: unknown[]; categories?: unknown[]; source?: string };
    const cachedProducts = safeArray(parsed.products).map(normalizeProduct).filter((product): product is Product => Boolean(product));
    const cachedCategories = safeArray(parsed.categories).map(normalizeCategory).filter((category): category is ApiCategory => Boolean(category));
    if (!cachedProducts.length) return null;
    return {
      products: cachedProducts,
      categories: cachedCategories.length ? cachedCategories : fallbackCategories,
      source: 'api',
    };
  } catch {
    return null;
  }
}

export function writeCachedCatalog(catalog: CatalogState) {
  if (typeof window === 'undefined' || catalog.source !== 'api') return;
  try {
    window.localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(catalog));
  } catch {
    // Cache is best-effort only.
  }
}

export async function fetchProduct(slug: string): Promise<Product> {
  const response = await fetchJson<{ product?: unknown }>(`/api/products/${encodeURIComponent(slug)}`);
  const product = normalizeProduct(response.product);
  if (!product) throw new Error('Produto invalido.');
  return product;
}

export const fallbackCatalog: CatalogState = {
  products: fallbackProducts,
  categories: fallbackCategories,
  source: 'fallback'
};
