'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { getOrder, isAccountApiUnavailable } from '@/services/accountApi';
import { loadOrdersForUser, orderStatusLabels } from '@/services/orders';
import { createPaymentPreference } from '@/services/paymentsApi';
import { formatPrice, getProductById } from '@/services/products';
import { useProductsById } from '@/services/useProductCatalog';
import type { Order } from '@/types/order';

interface OrderDetailPageClientProps {
  orderId: string;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function paymentStatusLabel(status: Order['paymentStatus']) {
  switch (status) {
    case 'approved': return 'Aprovado';
    case 'rejected': return 'Recusado';
    case 'refunded': return 'Reembolsado';
    case 'pending':
    default: return 'Aguardando pagamento';
  }
}

function shippingMethodLabel(shipping: string | undefined) {
  const value = String(shipping || '').toLowerCase();
  if (value.includes('sedex')) return 'SEDEX';
  if (value.includes('pac')) return 'PAC';
  if (value.includes('express')) return 'Expressa';
  return 'Padrao';
}

export function OrderDetailPageClient({ orderId }: OrderDetailPageClientProps) {
  const { user, isAuthenticated, isReady } = useAuth();
  const { notify } = useNotifications();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [paying, setPaying] = useState(false);

  const productIds = useMemo(() => Array.from(new Set(order?.items.map(item => item.productId) ?? [])), [order]);
  const { productsById } = useProductsById(productIds);

  useEffect(() => {
    if (!isReady || !user) return;

    let active = true;
    setLoading(true);
    setError('');

    getOrder(orderId)
      .then(({ order: nextOrder }) => {
        if (active) setOrder(nextOrder);
      })
      .catch(async caught => {
        if (!active) return;
        if (isAccountApiUnavailable(caught)) {
          const localOrders = await loadOrdersForUser(user.id);
          setOrder(localOrders.find(item => item.id === orderId) ?? null);
          setError(localOrders.some(item => item.id === orderId) ? '' : 'Pedido nao encontrado nesta conta.');
          return;
        }
        setOrder(null);
        setError(caught instanceof Error ? caught.message : 'Nao foi possivel carregar este pedido.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [isReady, orderId, refreshKey, user]);

  if (!isReady) {
    return <main className="info-page"><div className="container"><p className="eyebrow">Carregando...</p></div></main>;
  }

  if (!isAuthenticated || !user) {
    return (
      <main className="info-page">
        <div className="container">
          <section className="empty-state">
            <h2>Entre para acompanhar o pedido.</h2>
            <p>Use a mesma conta do checkout para ver pagamento, envio e itens comprados.</p>
            <Link className="btn btn-primary" href="/account">Entrar na conta</Link>
          </section>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="info-page account-dashboard">
        <div className="container">
          <p className="eyebrow">Pedido</p>
          <section className="account-panel">
            <div className="empty-state"><p>Carregando detalhes do pedido...</p></div>
          </section>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="info-page account-dashboard">
        <div className="container">
          <div className="crumbs">
            <Link href="/">Inicio</Link>
            <span className="sep">/</span>
            <Link href="/account/orders">Pedidos</Link>
            <span className="sep">/</span>
            <span>{orderId}</span>
          </div>
          <section className="empty-state">
            <h2>Pedido nao encontrado.</h2>
            <p>{error || 'Nao encontramos este pedido na sua conta.'}</p>
            <div className="order-actions">
              <button type="button" className="btn btn-primary" onClick={() => setRefreshKey(key => key + 1)}>Tentar novamente</button>
              <Link className="btn btn-ghost" href="/account/orders">Voltar aos pedidos</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const status = orderStatusLabels[order.status] ?? orderStatusLabels.pending;
  const canPayAgain = ['pending', 'cancelled'].includes(order.status) || order.paymentStatus === 'rejected';

  async function handlePayAgain() {
    if (!order) return;
    try {
      setPaying(true);
      const preference = await createPaymentPreference(order.id);
      window.location.href = preference.initPoint;
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Nao foi possivel reabrir o pagamento.', 'error');
      setPaying(false);
    }
  }

  return (
    <main className="info-page account-dashboard">
      <div className="container">
        <div className="crumbs">
          <Link href="/">Inicio</Link>
          <span className="sep">/</span>
          <Link href="/account/orders">Pedidos</Link>
          <span className="sep">/</span>
          <span>#{order.id}</span>
        </div>

        <header className="account-header">
          <div>
            <div className="section-num">ACOMPANHAMENTO</div>
            <h1>Pedido <span className="red">#{order.id.slice(0, 8)}.</span></h1>
            <p className="account-meta">Criado em {formatDate(order.createdAt)} para {order.contact.email}</p>
          </div>
          <Link className="btn btn-ghost" href="/account/orders">Voltar aos pedidos</Link>
        </header>

        <section className="account-stats">
          <div className="stat-card">
            <span className="stat-num">{status.label}</span>
            <span className="stat-label">Status do pedido</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{paymentStatusLabel(order.paymentStatus)}</span>
            <span className="stat-label">Pagamento</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{shippingMethodLabel(order.shipping)}</span>
            <span className="stat-label">Entrega</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{formatPrice(order.total)}</span>
            <span className="stat-label">Total</span>
          </div>
        </section>

        <section className="account-shell">
          <article className="account-panel">
            <header className="account-panel-header">
              <div>
                <h2>Detalhes do pedido</h2>
                <p>Acompanhe o pagamento, revise os itens e retome o checkout se o pedido ainda estiver pendente.</p>
              </div>
              <div className="order-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setRefreshKey(key => key + 1)}>Atualizar</button>
                {canPayAgain ? (
                  <button type="button" className="btn btn-primary" disabled={paying} onClick={handlePayAgain}>
                    {paying ? 'Abrindo Mercado Pago...' : 'Pagar agora'}
                  </button>
                ) : null}
              </div>
            </header>

            <div className="order-card" style={{ overflow: 'visible' }}>
              <div className="order-card-summary">
                <span className={`order-status status-${status.tone}`}>{status.label}</span>
                <span className="order-code">Pagamento: {paymentStatusLabel(order.paymentStatus)}</span>
                <span className="order-total">{formatPrice(order.total)}</span>
              </div>
              <div className="order-body">
                <div className="summary-items" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 0 }}>
                  {order.items.map(item => {
                    const product = productsById[item.productId] ?? getProductById(item.productId);
                    const price = item.unitPrice ?? product?.price ?? 0;
                    return (
                      <div className="summary-item" key={`${item.productId}-${item.size}-${item.color}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product?.image ?? '/favicon.svg'} alt={product?.name ?? item.name ?? item.productId} />
                        <div>
                          <h5>{product?.name ?? item.name ?? item.productId}</h5>
                          <div className="meta">Tam. {item.size} - QTD {item.quantity}</div>
                        </div>
                        <div className="price">{formatPrice(price * item.quantity)}</div>
                      </div>
                    );
                  })}
                </div>

                <dl className="order-grid">
                  <div><dt>Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
                  <div><dt>Frete</dt><dd>{order.shippingCost ? formatPrice(order.shippingCost) : 'Gratis'}</dd></div>
                  <div><dt>Desconto</dt><dd>{order.discount ? `-${formatPrice(order.discount)}` : formatPrice(0)}</dd></div>
                  <div><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
                  <div><dt>Quem recebe</dt><dd>{order.address.recipient || order.contact.name}</dd></div>
                  <div><dt>Telefone</dt><dd>{order.contact.phone || order.address.phone || 'Nao informado'}</dd></div>
                  <div><dt>Endereco</dt><dd>{order.address.street}, {order.address.city}/{order.address.region}</dd></div>
                  <div><dt>CEP</dt><dd>{order.address.postalCode}</dd></div>
                </dl>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
