import type { MetadataRoute } from 'next';
import { brand } from '@/services/brand';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/account/reset-password']
      }
    ],
    sitemap: `${brand.siteUrl}/sitemap.xml`
  };
}
