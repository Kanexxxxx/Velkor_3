import type { MetadataRoute } from 'next';
import { brand } from '@/services/brand';
import { infoPageSlugs } from '@/services/infoPages';
import { products } from '@/services/products';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = brand.siteUrl;
  const now = new Date();
  const staticRoutes = ['', '/shop', '/wishlist', '/account', '/checkout'];
  const infoRoutes = Object.values(infoPageSlugs).map(slug => `/${slug}`);
  const productRoutes = products.map(product => `/product/${product.id}`);

  return [...staticRoutes, ...infoRoutes, ...productRoutes].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route.startsWith('/product') || route === '/shop' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route === '/shop' ? 0.9 : 0.7
  }));
}
