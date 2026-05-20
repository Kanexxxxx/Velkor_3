'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCart } from '@/components/cart/CartProvider';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { SectionCard, StatusBadge, Timeline, type TimelineItem } from '@/components/operational';
import { getOrder, isAccountApiUnavailable, resendOrderConfirmation } from '@/services/accountApi';
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
  return 'Padrão';
}

function buildOrderTimeline(order: Order): TimelineItem[] {
  if (order.status === 'cancelled') {
    return [
      { title: 'Pedido criado', description: formatDate(order.createdAt), state: 'complete' },
      { title: 'Pedido cancelado', description: 'Este pedido não segue para pagamento ou envio.', state: 'danger' },
    ];
  }

  const paymentApproved = order.paymentStatus === 'approved' || ['paid', 'processing', 'shipped', 'fulfilled', 'delivered'].includes(order.status);
  const preparing = ['processing', 'shipped', 'fulfilled', 'delivered'].includes(order.status);
  const shipped = ['shipped', 'fulfilled', 'delivered'].includes(order.status);
  const delivered = ['fulfilled', 'delivered'].includes(order.status);

  return [
    { title: 'Pedido criado', description: formatDate(order.createdAt), state: 'complete' },
    {
      title: paymentApproved ? 'Pagamento aprovado' : 'Aguardando pagamento',
      description: paymentApproved ? 'Pagamento confirmado no sistema.' : 'Finalize pelo Mercado Pago para confirmar o pedido.',
      state: paymentApproved ? 'complete' : 'current',
    },
    {
      title: 'Em separação',
      description: 'A equipe prepara os itens para envio.',
      state: preparing ? 'complete' : 'pending',
    },
    {
      title: 'Enviado',
      description: shipped ? `Pedido saiu para transporte.${order.trackingCode ? ` Rastreio: ${order.trackingCode}.` : ''}` : 'O código de rastreio aparece aqui quando for enviado.',
      state: shipped ? 'complete' : 'pending',
    },
    {
      title: 'Entregue',
      description: delivered ? 'Entrega concluída.' : 'Aguardando atualização final.',
      state: delivered ? 'complete' : 'pending',
    },
  ];
}

export function OrderDetailPageClient({ orderId }: OrderDetailPageClientProps) {
  const { user, isAuthenticated, isReady } = useAuth();
  const { addItem } = useCart();
  const { notify } = useNotifications();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [paying, setPaying] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

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
          setError(localOrders.some(item => item.id === orderId) ? '' : 'Pedido não encontrado nesta conta.');
          return;
        }
        setOrder(null);
        setError(caught instanceof Error ? caught.message : 'Não foi possível carregar este pedido.');
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
            <Link href="/">Início</Link>
            <span className="sep">/</span>
            <Link href="/account/orders">Pedidos</Link>
            <span className="sep">/</span>
            <span>{orderId}</span>
          </div>
          <section className="empty-state">
            <h2>Pedido não encontrado.</h2>
            <p>{error || 'Não encontramos este pedido na sua conta.'}</p>
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
      notify(caught instanceof Error ? caught.message : 'Não foi possível reabrir o pagamento.', 'error');
      setPaying(false);
    }
  }

  async function handleResendConfirmation() {
    if (!order) return;
    try {
      setResendingEmail(true);
      await resendOrderConfirmation(order.id);
      notify('Confirmação do pedido reenviada para seu email.', 'success');
    } catch (caught) {
      notify(caught instanceof Error ? caught.message : 'Não foi possível reenviar a confirmação.', 'error');
    } finally {
      setResendingEmail(false);
    }
  }

  function handleBuyAgain() {
    if (!order) return;
    order.items.forEach(item => {
      addItem({
        productId: item.productId,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
      });
    });
    notify(`${order.items.length} item(ns) do pedido foram adicionados a sacola.`, 'success');
    window.dispatchEvent(new Event('velkor:open-cart'));
  }

  return (
    <main className="info-page account-dashboard">
      <div className="container">
        <div className="crumbs">
          <Link href="/">Início</Link>
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

        <SectionCard
          title="Linha do tempo"
          description="Acompanhe o andamento do pedido sem precisar falar com suporte."
          actions={(
            <StatusBadge tone={order.paymentStatus === 'approved' ? 'success' : order.paymentStatus === 'rejected' ? 'danger' : 'warning'}>
              {paymentStatusLabel(order.paymentStatus)}
            </StatusBadge>
          )}
          className="order-timeline-card"
        >
          <Timeline items={buildOrderTimeline(order)} />
        </SectionCard>

        <section className="account-shell">
          <article className="account-panel">
            <header className="account-panel-header">
              <div>
                <h2>Detalhes do pedido</h2>
                <p>Acompanhe o pagamento, revise os itens e retome o checkout se o pedido ainda estiver pendente.</p>
              </div>
              <div className="order-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setRefreshKey(key => key + 1)}>Atualizar</button>
                <button type="button" className="btn btn-ghost" disabled={resendingEmail} onClick={handleResendConfirmation}>
                  {resendingEmail ? 'Reenviando...' : 'Reenviar confirmação'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleBuyAgain}>
                  Comprar novamente
                </button>
                {canPayAgain ? (
                  <button type="button" className="btn btn-primary" disabled={paying} onClick={handlePayAgain}>
                    {paying ? 'Abrindo Mercado Pago...' : 'Pagar agora'}
                  </button>
                ) : null}
              </div>
            </header>

            <div className="order-card order-card-overflow">
              <div className="order-card-summary">
                <span className={`order-status status-${status.tone}`}>{status.label}</span>
                <span className="order-code">Pagamento: {paymentStatusLabel(order.paymentStatus)}</span>
                <span className="order-total">{formatPrice(order.total)}</span>
              </div>
              <div className="order-body">
                <div className="summary-items summary-items-flush">
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
                  <div><dt>Frete</dt><dd>{order.shippingCost ? formatPrice(order.shippingCost) : 'Grátis'}</dd></div>
                  <div><dt>Desconto</dt><dd>{order.discount ? `-${formatPrice(order.discount)}` : formatPrice(0)}</dd></div>
                  <div><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
                  <div><dt>Quem recebe</dt><dd>{order.address.recipient || order.contact.name}</dd></div>
                  <div><dt>Telefone</dt><dd>{order.contact.phone || order.address.phone || 'Não informado'}</dd></div>
                  <div><dt>Endereço</dt><dd>{order.address.street}, {order.address.city}/{order.address.region}</dd></div>
                  <div><dt>CEP</dt><dd>{order.address.postalCode}</dd></div>
                  <div><dt>Rastreio</dt><dd>{order.trackingCode || 'Ainda não informado'}</dd></div>
                  <div><dt>Enviado em</dt><dd>{order.shippedAt ? formatDate(order.shippedAt) : 'Aguardando envio'}</dd></div>
                </dl>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
