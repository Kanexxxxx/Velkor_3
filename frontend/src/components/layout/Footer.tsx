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
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M11.42 9.49c-.19-.09-1.1-.54-1.27-.61s-.29-.09-.42.1-.48.6-.59.73-.21.14-.4 0a5.13 5.13 0 0 1-1.49-.92 5.25 5.25 0 0 1-1-1.29c-.11-.18 0-.28.08-.38s.18-.21.28-.32a1.39 1.39 0 0 0 .18-.31.38.38 0 0 0 0-.33c0-.09-.42-1-.58-1.37s-.3-.32-.41-.32h-.4a.72.72 0 0 0-.5.23 2.1 2.1 0 0 0-.65 1.55A3.59 3.59 0 0 0 5 8.2 8.32 8.32 0 0 0 8.19 11c.44.19.78.3 1.05.39a2.53 2.53 0 0 0 1.17.07 1.93 1.93 0 0 0 1.26-.88 1.67 1.67 0 0 0 .11-.88c-.05-.07-.17-.12-.36-.21z" />
      <path d="M13.29 2.68A7.36 7.36 0 0 0 8 .5a7.44 7.44 0 0 0-6.41 11.15l-1 3.85 3.94-1a7.4 7.4 0 0 0 3.55.9H8a7.44 7.44 0 0 0 5.29-12.72zM8 14.12a6.12 6.12 0 0 1-3.15-.87l-.22-.13-2.34.61.62-2.28-.14-.23a6.18 6.18 0 0 1 9.6-7.65 6.12 6.12 0 0 1 1.81 4.37A6.19 6.19 0 0 1 8 14.12z" />
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
