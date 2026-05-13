'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { trackEvent } from '@/components/Analytics';
import { ProductCard } from '@/components/product/ProductCard';
import { products } from '@/services/products';
import type { Product } from '@/types/product';

function ArrowIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={size} height={size} aria-hidden="true">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7z" />
    </svg>
  );
}

const trendingProducts = products.filter(product => product.tag === 'trending' || product.tag === 'best').slice(0, 4);
const newProducts = products.filter(product => product.tag === 'new' || product.badge === 'NEW').slice(0, 4);
const bestProducts = products.filter(product => product.tag === 'best').slice(0, 3);

const marqueeText = (
  <>
    VELKOR <span className="star" aria-hidden="true">✦</span> SIGNAL 001 <span className="star" aria-hidden="true">✦</span> <span className="ghost">NOVA TEMPORADA</span> <span className="star" aria-hidden="true">✦</span> FW26 / DROP 001 <span className="star" aria-hidden="true">✦</span> <span className="ghost">DESENVOLVIDO NO BRASIL</span> <span className="star" aria-hidden="true">✦</span> ENVIO NACIONAL <span className="star" aria-hidden="true">✦</span>
  </>
);

const categories = [
  {
    href: '/shop?cat=sneakers',
    className: 'cat-card large',
    image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=1200&q=80',
    title: <>Tênis<br />e calçados</>
  },
  {
    href: '/shop?cat=apparel',
    className: 'cat-card',
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=1000&q=80',
    title: <>Casacos</>
  },
  {
    href: '/shop?cat=apparel',
    className: 'cat-card',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1000&q=80',
    title: <>Camisetas e tops</>
  },
  {
    href: '/shop?cat=accessories',
    className: 'cat-card',
    image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=1000&q=80',
    title: <>Bolsas e equipamentos</>
  },
  {
    href: '/shop?cat=accessories',
    className: 'cat-card',
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=1000&q=80',
    title: <>Óculos</>
  }
];

const testimonials = [
  {
    initials: 'LF',
    name: 'Lucas Fernandes',
    meta: 'São Paulo · Compra verificada',
    text: 'O Estrato V03 é absurdo. A construção lembra relógio de luxo: cada costura parece intencional. Usei por meses e ele ficou melhor ainda.'
  },
  {
    initials: 'AM',
    name: 'Amara Mendes',
    meta: 'São Paulo · Compra verificada',
    text: 'A Velkor acertou o impossível: silhueta forte, marca discreta e acabamento que chama atenção sem gritar.'
  },
  {
    initials: 'RV',
    name: 'Rafael Vega',
    meta: 'Curitiba · Compra verificada',
    text: 'Recebi em casa, abri a caixa e já deu pra sentir o nível. Produto com presença real, sem precisar de logotipo gritante pra mostrar valor.'
  }
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-img" />

        <div className="hero-inner">
          <div>
            <div className="hero-meta">
              <div className="hero-meta-row"><span>FW26 / DROP_001</span><b>— AO VIVO</b></div>
              <div className="hero-meta-row"><span>ORIGEM — SÃO PAULO · BR</span><b>DROP LIMITADO</b></div>
            </div>
            <h1 className="hero-title">
              <span className="line"><span>VISTA&nbsp;O</span></span>
              <span className="line"><span className="accent">FUTURO.</span></span>
              <span className="line"><span className="outline">REESCREVA</span></span>
              <span className="line"><span>A&nbsp;RUA.</span></span>
            </h1>
          </div>

          <aside className="hero-side">
            <p className="hero-desc">
              A Velkor constrói streetwear como arquitetura: cortes técnicos, silhuetas monolíticas e estudo obsessivo de materiais. Produto desenhado para a cidade depois da meia-noite.
            </p>
            <div className="hero-cta-row">
              <Link href="/shop" className="btn btn-primary">
                Comprar Agora
                <span className="btn-arrow"><ArrowIcon /></span>
              </Link>
              <Link href="#collection" className="btn btn-ghost">Ver FW26</Link>
            </div>
            <div className="eyebrow" style={{ marginTop: 20, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <span>★ 4.9 / 312 AVALIAÇÕES</span>
              <span>FRETE GRÁTIS NO BRASIL</span>
            </div>
          </aside>
        </div>
      </section>

      <div className="marquee">
        <div className="marquee-track">
          <span>{marqueeText}</span>
          <span>{marqueeText}</span>
        </div>
      </div>

      <section className="section" id="collection">
        <div className="container">
          <div className="section-head reveal in">
            <div>
              <div className="section-num">01 / FW26 — O ACERVO</div>
              <h2 className="section-title">Coleção <span className="it red">Destaque</span></h2>
            </div>
            <Link href="/shop" className="section-link">
              Ver todos os drops
              <ArrowIcon />
            </Link>
          </div>

          <div className="featured-collection reveal in">
            <article className="feature-card">
              <div className="bg" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1556906781-9a412961c28c?w=1200&q=80')" }} />
              <div className="overlay" />
              <div className="content">
                <div className="label">SIGNAL — 001</div>
                <h3>Cortes<br />Phantom</h3>
                <p>Cápsula monocromática com jaquetas curtas e denim técnico de alta resistência, construído para o uso diário.</p>
                <Link href="/shop?cat=apparel" className="btn btn-ghost">
                  Explorar cápsula
                  <ArrowIcon />
                </Link>
              </div>
            </article>

            <article className="feature-card dark">
              <div className="bg" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80')" }} />
              <div className="overlay" />
              <div className="content">
                <div className="label">CALÇADOS — V03</div>
                <h3>Velkor<br />Stratum.</h3>
                <p>Nossa silhueta mais avançada: entressola com carbono, cabedal em malha reciclada e estrutura feita para a próxima década.</p>
                <Link href="/shop?cat=sneakers" className="btn btn-primary">
                  Reservar par
                  <ArrowIcon />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <ProductSection
        number="02 / EM ALTA"
        title={<>Mais <span className="red">Pedidos.</span></>}
        href="/shop?sort=popular"
        linkLabel="Ver tendências"
        products={trendingProducts}
      />

      <section className="section">
        <div className="container">
          <div className="section-head reveal in">
            <div>
              <div className="section-num">03 / CATEGORIAS</div>
              <h2 className="section-title">Loja por <span className="it">Universo</span></h2>
            </div>
          </div>

          <div className="cat-grid reveal in">
            {categories.map(category => (
              <Link href={category.href} className={category.className} key={`${category.href}-${category.image}`}>
                <div className="bg" style={{ backgroundImage: `url('${category.image}')` }} />
                <div className="info">
                  <h4>{category.title}</h4>
                  <div className="arrow"><ArrowIcon size={18} /></div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <ProductSection
        number="04 / NOVIDADES"
        title={<>Direto do <span className="red">Laboratório</span></>}
        href="/shop?sort=new"
        linkLabel="Ver novidades"
        products={newProducts}
      />

      <ProductSection
        number="05 / RANKING"
        title={<>Mais <span className="it">Vendidos</span></>}
        href="/shop?sort=popular"
        linkLabel="Ranking completo"
        products={bestProducts}
        gridClassName="product-grid cols-3 reveal in"
      />

      <section className="section" id="stories">
        <div className="container">
          <div className="section-head reveal in">
            <div>
              <div className="section-num">06 / SINAIS</div>
              <h2 className="section-title">Vozes das <span className="red">Ruas</span></h2>
            </div>
          </div>

          <div className="testimonials reveal in">
            {testimonials.map(testimonial => (
              <article className="testimonial" key={testimonial.name}>
                <div className="testimonial-stars">
                  {Array.from({ length: 5 }).map((_, index) => <StarIcon key={index} />)}
                </div>
                <p className="testimonial-text">&ldquo;{testimonial.text}&rdquo;</p>
                <div className="testimonial-user">
                  <div className="testimonial-avatar">{testimonial.initials}</div>
                  <div className="testimonial-meta">
                    <b>{testimonial.name}</b>
                    <span>{testimonial.meta}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="newsletter">
        <div className="newsletter-inner reveal in">
          <div className="eyebrow" style={{ marginBottom: 20 }}>07 / ENTRE NA FREQUÊNCIA</div>
          <h2>Saiba<br /><span className="outline">Primeiro.</span> Vista <span className="red">Primeiro.</span></h2>
          <p>Alertas de drops, prévias do acervo e reposições exclusivas antes de todo mundo. Sem spam. Sem ruído. Só sinal.</p>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'loading') return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/api/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json() as { ok?: boolean; duplicate?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Erro ao assinar.');
      if (!data.duplicate) {
        trackEvent('Lead', { content_name: 'newsletter' });
      }
      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg('Não foi possível confirmar a assinatura. Tente novamente.');
    }
  }

  if (status === 'success') {
    return (
      <div className="newsletter-success">
        <span aria-hidden="true">✦</span>
        <p>Você está dentro. Os próximos drops chegam primeiro no seu email.</p>
      </div>
    );
  }

  return (
    <form className="newsletter-form" onSubmit={handleSubmit} noValidate>
      <label className="sr-only" htmlFor="newsletterEmail">Email para newsletter</label>
      <input
        id="newsletterEmail"
        type="email"
        placeholder="seu@email.com"
        required
        value={email}
        onChange={event => setEmail(event.target.value)}
        disabled={status === 'loading'}
        autoComplete="email"
      />
      <button type="submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Aguarde...' : 'Assinar'}
        {status !== 'loading' ? <ArrowIcon /> : null}
      </button>
      {status === 'error' ? <p className="newsletter-error">{errorMsg}</p> : null}
    </form>
  );
}

interface ProductSectionProps {
  number: string;
  title: ReactNode;
  href: string;
  linkLabel: string;
  products: Product[];
  gridClassName?: string;
}

function ProductSection({ number, title, href, linkLabel, products: sectionProducts, gridClassName = 'product-grid reveal in' }: ProductSectionProps) {
  return (
    <section className="section" style={{ paddingTop: number.startsWith('02') ? 40 : undefined }}>
      <div className="container">
        <div className="section-head reveal in">
          <div>
            <div className="section-num">{number}</div>
            <h2 className="section-title">{title}</h2>
          </div>
          <Link href={href} className="section-link">
            {linkLabel}
            <ArrowIcon />
          </Link>
        </div>

        <div className={gridClassName}>
          {sectionProducts.map(product => <ProductCard product={product} key={product.id} />)}
        </div>
      </div>
    </section>
  );
}
