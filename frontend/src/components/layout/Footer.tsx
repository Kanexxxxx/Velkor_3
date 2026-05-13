import Link from 'next/link';
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

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="4" />
      <circle cx="12" cy="12" r="3.3" />
      <path d="M16.4 7.6h.01" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4.5a7.5 7.5 0 0 0-6.3 11.5L5 19l3.1-.7A7.5 7.5 0 1 0 12 4.5Z" />
      <path d="M9.3 8.8c.2-.2.4-.2.6 0l.8 1.2c.1.2.1.4 0 .6l-.4.5c.7 1.3 1.6 2.1 2.9 2.7l.5-.4c.2-.1.4-.1.6 0l1.2.8c.2.2.2.4 0 .6-.4.6-1 .9-1.6.8-2.7-.2-5.2-2.7-5.4-5.4 0-.6.3-1.2.8-1.6Z" />
    </svg>
  );
}

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
                <InstagramIcon />
              </a>
              <a href={brand.whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp oficial da VELKOR">
                <WhatsAppIcon />
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
