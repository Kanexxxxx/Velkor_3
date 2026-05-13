'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { isValidEmail } from '@/services/auth';
import { getInfoHref } from '@/services/infoPages';
import { orderStatusLabels, readOrders } from '@/services/orders';
import { formatPrice, getProductById } from '@/services/products';
import type { Order } from '@/types/order';

export function ContactForm() {
  const { notify } = useNotifications();
  const [pending, setPending] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();

    if (name.length < 2) { notify('Informe seu nome.', 'error'); return; }
    if (!isValidEmail(email)) { notify('Email inválido.', 'error'); return; }
    if (message.length < 10) { notify('Conte pelo menos um pouco mais sobre o assunto.', 'error'); return; }

    setPending(true);
    setTimeout(() => {
      notify('Mensagem registrada. Em produção, ela vai para o gateway de email configurado.', 'success');
      form.reset();
      setPending(false);
    }, 600);
  }

  return (
    <section className="info-block">
      <h2>Envie uma mensagem</h2>
      <p>Preencha os campos abaixo. O envio real depende da integração de email (consulte a documentação <Link className="auth-link" href={getInfoHref('privacy')}>Privacidade</Link> e a referência interna).</p>
      <form className="account-form" onSubmit={handleSubmit}>
        <div className="field-row cols-2">
          <div className="field"><label htmlFor="contact-name">Nome</label><input id="contact-name" name="name" type="text" required autoComplete="name" /></div>
          <div className="field"><label htmlFor="contact-email">Email</label><input id="contact-email" name="email" type="email" required autoComplete="email" /></div>
        </div>
        <div className="field-row">
          <div className="field"><label htmlFor="contact-subject">Assunto</label><input id="contact-subject" name="subject" type="text" placeholder="Pedido, parceria ou imprensa" /></div>
        </div>
        <div className="field-row">
          <div className="field"><label htmlFor="contact-message">Mensagem</label><textarea id="contact-message" name="message" rows={5} required /></div>
        </div>
        <button type="submit" className="place-order-btn" disabled={pending}>
          {pending ? 'Enviando...' : 'Enviar mensagem'}
        </button>
      </form>
    </section>
  );
}

export function TrackOrderForm() {
  const { notify } = useNotifications();
  const [order, setOrder] = useState<Order | null>(null);
  const [searched, setSearched] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const code = String(data.get('code') ?? '').trim().toUpperCase();
    const email = String(data.get('email') ?? '').trim().toLocaleLowerCase('pt-BR');

    if (!code) { notify('Informe o código do pedido.', 'error'); return; }

    const found = readOrders().find(item => item.id.toUpperCase() === code && (!email || item.contact.email.toLocaleLowerCase('pt-BR') === email));

    setOrder(found ?? null);
    setSearched(true);

    if (!found) {
      notify('Não encontramos este pedido. Verifique o código ou o email usado.', 'error');
    }
  }

  return (
    <section className="info-block">
      <h2>Consultar status do pedido</h2>
      <p>Use o código recebido por email no formato <code>VEL26-018-000000</code>. Você também pode informar o email cadastrado para conferência.</p>
      <form className="account-form" onSubmit={handleSubmit}>
        <div className="field-row cols-2">
          <div className="field"><label htmlFor="track-code">Código do pedido</label><input id="track-code" name="code" type="text" required placeholder="VEL26-018-000284" /></div>
          <div className="field"><label htmlFor="track-email">Email (opcional)</label><input id="track-email" name="email" type="email" autoComplete="email" /></div>
        </div>
        <button type="submit" className="place-order-btn">Rastrear pedido</button>
      </form>

      {searched && order ? (
        <div className="order-card" style={{ marginTop: 24 }}>
          <div className="order-card-summary">
            <strong>#{order.id}</strong>
            <span className={`order-status status-${(orderStatusLabels[order.status] ?? orderStatusLabels.pending).tone}`}>
              {(orderStatusLabels[order.status] ?? orderStatusLabels.pending).label}
            </span>
            <span className="order-total">{formatPrice(order.total)}</span>
          </div>
          <ul className="order-products" style={{ padding: '0 22px 18px' }}>
            {order.items.map(item => {
              const product = getProductById(item.productId);
              return (
                <li key={`${item.productId}-${item.size}-${item.color}`}>
                  <strong>{product?.name ?? item.productId}</strong>
                  <span>Tamanho {item.size} · QTD {item.quantity}</span>
                </li>
              );
            })}
          </ul>
          {order.address ? (
            <p className="track-summary">Entrega para {order.address.street}, {order.address.city}/{order.address.region}.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
