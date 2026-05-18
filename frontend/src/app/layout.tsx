import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import '@/styles/globals.css';
import { Analytics } from '@/components/Analytics';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { CartProvider } from '@/components/cart/CartProvider';
import { CookieConsent } from '@/components/CookieConsent';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { NotificationProvider } from '@/components/notifications/NotificationProvider';
import { WishlistProvider } from '@/components/wishlist/WishlistProvider';
import { brand } from '@/services/brand';

export const metadata: Metadata = {
  metadataBase: new URL(brand.siteUrl),
  title: {
    default: 'VELKOR - Streetwear e sneakers premium',
    template: '%s - VELKOR'
  },
  description: 'VELKOR é uma loja premium de streetwear e sneakers com curadoria urbana, suporte direto e experiência de compra limpa.',
  applicationName: brand.name,
  authors: [{ name: brand.name }],
  creator: brand.name,
  publisher: brand.name,
  alternates: {
    canonical: '/'
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/',
    siteName: brand.name,
    title: 'VELKOR - Streetwear e sneakers premium',
    description: 'Curadoria premium de streetwear, sneakers e acessórios para presença urbana.'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VELKOR - Streetwear e sneakers premium',
    description: 'Curadoria premium de streetwear, sneakers e acessórios para presença urbana.'
  },
  icons: {
    icon: '/favicon.svg'
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <Analytics />
        <NotificationProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <Suspense fallback={null}>
                  <Navbar />
                </Suspense>
                <main>{children}</main>
                <Footer />
                <CookieConsent />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
