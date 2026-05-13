import Link from 'next/link';
import { ContactForm, TrackOrderForm } from './InfoForms';
import { getInfoHref, infoNavGroups, infoPages, type InfoPageKey } from '@/services/infoPages';

interface InfoPageViewProps {
  pageKey: InfoPageKey;
}

export function InfoPageView({ pageKey }: InfoPageViewProps) {
  const page = infoPages[pageKey];
  const titleParts = page.title.split(' ');
  const titleStart = titleParts[0];
  const titleEnd = titleParts.slice(1).join(' ') || 'Velkor';

  return (
    <main className="info-page">
      <div className="container">
        <div className="crumbs">
          <Link href="/">Início</Link>
          <span className="sep">/</span>
          <span>{page.group}</span>
          <span className="sep">/</span>
          <span>{page.title}</span>
        </div>

        <section className="info-hero">
          <div>
            <div className="section-num">{page.kicker}</div>
            <h1>{titleStart} <span className="red">{titleEnd}.</span></h1>
            <p>{page.lead}</p>
          </div>
          {pageKey !== 'contact' ? (
            <Link href={getInfoHref('contact')} className="btn btn-primary">Falar com Suporte</Link>
          ) : null}
        </section>

        <section className="info-layout">
          <aside className="info-nav" aria-label="Navegação de informações">
            {Object.entries(infoNavGroups).map(([group, ids]) => (
              <div key={group}>
                <h4>{group}</h4>
                {ids.map(id => (
                  <Link className={id === pageKey ? 'active' : undefined} href={getInfoHref(id)} key={id}>
                    {infoPages[id].title}
                  </Link>
                ))}
              </div>
            ))}
          </aside>

          <article className="info-content">
            {page.blocks.map(block => (
              <section className="info-block" key={block.title}>
                <h2>{block.title}</h2>
                <p>{block.body}</p>
              </section>
            ))}

            {pageKey === 'contact' ? <ContactForm /> : null}
            {pageKey === 'track-order' ? <TrackOrderForm /> : null}
          </article>
        </section>
      </div>
    </main>
  );
}
