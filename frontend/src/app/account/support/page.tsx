import Link from 'next/link';
import { SectionCard } from '@/components/operational';
import { getInfoHref } from '@/services/infoPages';

export const metadata = {
  title: 'Suporte - Conta VELKOR'
};

export default function AccountSupportPage() {
  return (
    <main className="info-page">
      <div className="container">
        <div className="crumbs">
          <Link href="/">Inicio</Link>
          <span className="sep">/</span>
          <Link href="/account">Conta</Link>
          <span className="sep">/</span>
          <span>Suporte</span>
        </div>
        <section className="info-hero">
          <div>
            <div className="section-num">SUPORTE</div>
            <h1>Ajuda <span className="red">VELKOR.</span></h1>
            <p>Use seu codigo de pedido para falar com a loja, acompanhar envio ou solicitar troca.</p>
          </div>
          <Link href="/account/orders" className="btn btn-primary">Ver meus pedidos</Link>
        </section>
        <section className="info-content">
          <SectionCard title="Canais oficiais" description="Fale com a loja usando os contatos publicos da VOLKERR.">
            <p>Email: <a href="mailto:velkor.officiall@gmail.com">velkor.officiall@gmail.com</a></p>
            <p>WhatsApp: <a href="https://wa.me/5516997062339" target="_blank" rel="noreferrer">+55 16 99706-2339</a></p>
          </SectionCard>
          <SectionCard title="Ajuda rapida" description="Use estes caminhos antes de abrir um chamado.">
            <div className="account-actions">
              <Link href={getInfoHref('track-order')} className="btn btn-secondary">Rastrear pedido</Link>
              <Link href={getInfoHref('refund-policy')} className="btn btn-secondary">Trocas e devolucoes</Link>
              <Link href={getInfoHref('shipping-returns')} className="btn btn-secondary">Envio e frete</Link>
            </div>
          </SectionCard>
        </section>
      </div>
    </main>
  );
}
