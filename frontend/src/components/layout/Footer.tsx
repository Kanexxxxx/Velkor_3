import Link from 'next/link';
import { Camera, MessageCircle } from 'lucide-react';
import { brand } from '@/services/brand';
import { getInfoHref } from '@/services/infoPages';
import { BrandLogo } from './BrandLogo';

const footerGroups = [
  {
    title: 'Loja',
    links: [
      { href: '/shop?cat=sneakers', label: 'Tênis' },
      { href: '/shop?cat=apparel', label: 'Vestuário' },
      { href: '/shop?cat=accessories', label: 'Acessórios' },
      { href: '/shop?sort=new', label: 'Novidades' },
      { href: '/shop?sort=popular', label: 'Drops limitados' }
    ]
  },
  {
    title: 'Suporte',
    links: [
      { href: getInfoHref('shipping-returns'), label: 'Envio e devoluções' },
      { href: getInfoHref('size-guide'), label: 'Guia de tamanhos' },
      { href: getInfoHref('track-order'), label: 'Rastrear pedido' },
      { href: getInfoHref('contact'), label: 'Contato' },
      { href: getInfoHref('faq'), label: 'FAQ' }
    ]
  },
  {
    title: 'Marca',
    links: [
      { href: getInfoHref('story'), label: 'Nossa história' },
      { href: getInfoHref('stockists'), label: 'Lojas parceiras' },
      { href: getInfoHref('careers'), label: 'Carreiras' },
      { href: getInfoHref('press'), label: 'Imprensa' },
      { href: getInfoHref('sustainability'), label: 'Sustentabilidade' }
    ]
  }
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <BrandLogo />
            <p>{brand.tagline}</p>
            <div className="footer-social">
              <a href={brand.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram oficial da VELKOR">
                <Camera strokeWidth={1.7} aria-hidden="true" />
              </a>
              <a href={brand.whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp oficial da VELKOR">
                <MessageCircle strokeWidth={1.7} aria-hidden="true" />
              </a>
            </div>
            <div className="eyebrow" style={{ marginTop: 18 }}>
              <a href={`mailto:${brand.supportEmail}`}>{brand.supportEmail}</a><br />
              <a href={brand.whatsappUrl} target="_blank" rel="noopener noreferrer">{brand.whatsapp}</a>
            </div>
          </div>

          {footerGroups.map(group => (
            <div className="footer-col" key={group.title}>
              <h5>{group.title}</h5>
              <ul>
                {group.links.map(link => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <div>2026 VELKOR · STREETWEAR & SNEAKERS PREMIUM</div>
          <div className="legal">
            <Link href={getInfoHref('privacy')}>Privacidade</Link>
            <Link href={getInfoHref('terms')}>Termos</Link>
            <Link href={getInfoHref('refund-policy')}>Reembolso</Link>
            <Link href={getInfoHref('cookies')}>Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
