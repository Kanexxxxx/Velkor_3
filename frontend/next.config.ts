import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

// CSP: domínios explícitos — sem wildcard '*'.
// Em desenvolvimento, o Next.js precisa de 'unsafe-eval' para compilar e
// hidratar páginas. Em produção essa permissão não é enviada.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com https://connect.facebook.net`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://images.unsplash.com https://www.facebook.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' ${isDev ? 'http://localhost:3001 http://127.0.0.1:3001 ' : 'https://volkerr.com.br https://www.volkerr.com.br '}https://viacep.com.br${isDev ? ' ws://localhost:3000 ws://127.0.0.1:3000' : ''}`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: 'http://localhost:3001/api/auth/:path*'
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:3001/uploads/:path*'
      }
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' }
        ]
      }
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com'
      },
      {
        protocol: 'https',
        hostname: 'volkerr.com.br'
      },
      {
        protocol: 'https',
        hostname: 'www.volkerr.com.br'
      },
      {
        protocol: 'http',
        hostname: 'localhost'
      }
    ]
  }
};

export default nextConfig;
