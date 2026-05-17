'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getInfoHref } from '@/services/infoPages';
import { formatPrice, products } from '@/services/products';
import { readOrders } from '@/services/orders';
import { fetchAdminOrders, getAdminMe, isAdminApiUnavailable, legacyUnlock } from '@/services/adminApi';
import type { Order } from '@/types/order';

export function AdminPageClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [unlocked, setUnlocked] = useState(false);
  const [attempt, setAttempt] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [apiMode, setApiMode] = useState<'real' | 'legacy' | 'demo'>('demo');

  async function loadRealAdminData() {
    const remoteOrders = await fetchAdminOrders();
    setOrders(remoteOrders);
    setApiMode('real');
    setUnlocked(true);
  }

  useEffect(() => {
    let cancelled = false;

    async function checkAdmin() {
      setCheckingAdmin(true);
      setError('');
      try {
        await getAdminMe();
        const remoteOrders = await fetchAdminOrders();
        if (cancelled) return;
        setOrders(remoteOrders);
        setApiMode('real');
        setUnlocked(true);
      } catch (err) {
        if (cancelled) return;
        if (isAdminApiUnavailable(err)) {
          setOrders(readOrders());
          setApiMode('demo');
        } else {
          setUnlocked(false);
          setApiMode('legacy');
        }
      } finally {
        if (!cancelled) setCheckingAdmin(false);
      }
    }

    checkAdmin();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshAdminData() {
    setLoading(true);
    setError('');
    try {
      await loadRealAdminData();
    } catch {
      setOrders(readOrders());
      setApiMode('demo');
      setError('Nao foi possivel atualizar dados reais agora. Exibindo fallback demo.');
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    const revenue = orders.reduce((sum, order) => sum + order.total, 0);
    const pending = orders.filter(order => order.status === 'pending').length;
    const units = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

    return { revenue, pending, units };
  }, [orders]);

  const categoryCounts = products.reduce<Record<string, number>>((counts, product) => {
    counts[product.category] = (counts[product.category] ?? 0) + 1;
    return counts;
  }, {});

  if (checkingAdmin) {
    return (
      <main className="info-page">
        <div className="container" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
            <div className="section-num" style={{ marginBottom: 12 }}>PAINEL ADMIN</div>
            <h1 style={{ marginBottom: 16 }}>Validando <span className="red">acesso.</span></h1>
            <p>Conferindo sessao administrativa...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!unlocked) {
    async function handleUnlock(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      setLoading(true);
      setError('');
      try {
        await legacyUnlock(attempt);
        setOrders(readOrders());
        setApiMode('legacy');
        setUnlocked(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Senha incorreta.');
        setAttempt('');
      } finally {
        setLoading(false);
      }
    }

    return (
      <main className="info-page">
        <div className="container" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
            <div className="section-num" style={{ marginBottom: 12 }}>PAINEL ADMIN</div>
            <h1 style={{ marginBottom: 24 }}>Acesso <span className="red">Restrito.</span></h1>
            <p style={{ marginBottom: 24 }}>Entre com uma conta ADMIN. O acesso legado por senha permanece temporario para rollback.</p>
            <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field">
                <label htmlFor="admin-password">Senha de acesso legado</label>
                <input
                  id="admin-password"
                  type="password"
                  value={attempt}
                  onChange={event => setAttempt(event.target.value)}
                  autoComplete="current-password"
                  autoFocus
                  required
                />
              </div>
              {error ? <p style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{error}</p> : null}
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? 'Verificando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="info-page">
      <div className="container">
        <div className="crumbs">
          <Link href="/">Inicio</Link>
          <span className="sep">/</span>
          <span>Admin</span>
        </div>

        <section className="info-hero">
          <div>
            <div className="section-num">PAINEL ADMIN</div>
            <h1>Controle <span className="red">Velkor.</span></h1>
            <p>{apiMode === 'real' ? 'Dados administrativos carregados com sessao real protegida.' : 'Fallback administrativo temporario para validacao e rollback controlado.'}</p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" onClick={refreshAdminData} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
            <Link href="/shop" className="btn btn-primary">Ver loja</Link>
          </div>
        </section>

        {error ? (
          <section className="info-content" style={{ marginBottom: 24 }}>
            <p style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{error}</p>
          </section>
        ) : null}

        <section className="info-content" style={{ marginBottom: 32 }}>
          <div className="account-grid">
            <div className="info-block">
              <h2>Receita demo</h2>
              <p>{formatPrice(totals.revenue)}</p>
            </div>
            <div className="info-block">
              <h2>Pedidos</h2>
              <p>{orders.length} pedidos · {totals.pending} pendentes</p>
            </div>
            <div className="info-block">
              <h2>Produtos</h2>
              <p>{products.length} itens cadastrados</p>
            </div>
            <div className="info-block">
              <h2>Unidades vendidas</h2>
              <p>{totals.units} unidades {apiMode === 'real' ? 'registradas' : 'no storage local'}</p>
            </div>
          </div>
        </section>

        <section className="info-layout">
          <aside className="info-nav">
            <div>
              <h4>Catalogo</h4>
              <Link href="/shop?cat=sneakers">Tenis ({categoryCounts.sneakers ?? 0})</Link>
              <Link href="/shop?cat=apparel">Vestuario ({categoryCounts.apparel ?? 0})</Link>
              <Link href="/shop?cat=accessories">Acessorios ({categoryCounts.accessories ?? 0})</Link>
            </div>
            <div>
              <h4>Operacao</h4>
              <Link href="/checkout">Checkout</Link>
              <Link href={getInfoHref('track-order')}>Rastreio</Link>
              <Link href={getInfoHref('refund-policy')}>Reembolso</Link>
            </div>
          </aside>

          <article className="info-content">
            <section className="info-block">
              <h2>Pedidos recentes</h2>
              {orders.length ? (
                <div className="summary-items" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 0 }}>
                  {orders.slice(0, 6).map(order => (
                    <div className="summary-item" style={{ gridTemplateColumns: '1fr auto' }} key={order.id}>
                      <div>
                        <h5>{order.id}</h5>
                        <div className="meta">{order.status.toUpperCase()} · {new Date(order.createdAt).toLocaleDateString('pt-BR')}</div>
                      </div>
                      <div className="price">{formatPrice(order.total)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Nenhum pedido criado ainda. Finalize um checkout para alimentar este painel.</p>
              )}
            </section>

            <section className="info-block">
              <h2>Catalogo ativo</h2>
              <div className="summary-items" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 0 }}>
                {products.slice(0, 8).map(product => (
                  <div className="summary-item" style={{ gridTemplateColumns: '1fr auto' }} key={product.id}>
                    <div>
                      <h5>{product.name}</h5>
                      <div className="meta">{product.brand} · {product.category}</div>
                    </div>
                    <div className="price">{formatPrice(product.price)}</div>
                  </div>
                ))}
              </div>
            </section>
          </article>
        </section>
      </div>
    </main>
  );
}
