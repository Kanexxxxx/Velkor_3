'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { isAccountApiUnavailable, listCoupons } from '@/services/accountApi';
import { formatPrice } from '@/services/products';
import type { AdminCoupon } from '@/services/adminApi';

function couponValue(coupon: AdminCoupon) {
  if (coupon.discountType === 'PERCENT') return `${coupon.discountValue}% OFF`;
  return `${formatPrice(coupon.discountValue / 100)} OFF`;
}

function couponValidity(coupon: AdminCoupon) {
  if (!coupon.expiresAt) return 'Sem data final definida';
  return `Valido ate ${new Date(coupon.expiresAt).toLocaleDateString('pt-BR')}`;
}

export function CouponsPageClient() {
  const { isReady, isAuthenticated } = useAuth();
  const { notify } = useNotifications();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;

    let active = true;
    setLoading(true);
    setError('');
    listCoupons()
      .then(({ coupons: nextCoupons }) => {
        if (active) setCoupons(nextCoupons);
      })
      .catch(caught => {
        if (!active) return;
        if (isAccountApiUnavailable(caught)) {
          setCoupons([]);
          setError('');
        } else {
          setError(caught instanceof Error ? caught.message : 'Nao foi possivel carregar seus cupons.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [isAuthenticated, isReady]);

  if (!isReady) {
    return <main className="info-page"><div className="container"><p className="eyebrow">Carregando...</p></div></main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="info-page">
        <div className="container">
          <section className="empty-state">
            <h2>Entre para ver seus cupons.</h2>
            <p>Cupons disponiveis ficam salvos na area da conta para usar no checkout.</p>
            <Link className="btn btn-primary" href="/account">Entrar na conta</Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="info-page account-dashboard">
      <div className="container">
        <div className="crumbs">
          <Link href="/">Inicio</Link>
          <span className="sep">/</span>
          <Link href="/account">Conta</Link>
          <span className="sep">/</span>
          <span>Cupons</span>
        </div>

        <header className="account-header">
          <div>
            <div className="section-num">BENEFICIOS</div>
            <h1>Meus <span className="red">Cupons.</span></h1>
            <p className="account-meta">Promocoes ativas para aplicar no checkout da VOLKERR.</p>
          </div>
          <Link className="btn btn-ghost" href="/account">Voltar para conta</Link>
        </header>

        <section className="account-shell">
          <article className="account-panel">
            <header className="account-panel-header">
              <div>
                <h2>Cupons disponiveis</h2>
                <p>Copie o codigo e aplique no resumo do checkout antes de finalizar o pagamento.</p>
              </div>
              <Link className="btn btn-primary" href="/checkout">Ir para checkout</Link>
            </header>

            {loading ? <div className="empty-state"><p>Carregando cupons...</p></div> : null}
            {error ? <div className="empty-state"><h2>Falha ao carregar.</h2><p>{error}</p></div> : null}

            {!loading && !error && coupons.length === 0 ? (
              <div className="empty-state">
                <h2>Nenhum cupom ativo agora.</h2>
                <p>Quando uma promocao estiver disponivel, ela aparece aqui automaticamente.</p>
                <Link className="btn btn-primary" href="/shop">Ver produtos</Link>
              </div>
            ) : null}

            {!loading && !error && coupons.length > 0 ? (
              <div className="summary-items" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 0 }}>
                {coupons.map(coupon => (
                  <div className="summary-item" style={{ gridTemplateColumns: '1fr auto' }} key={coupon.id}>
                    <div>
                      <h5>{coupon.code}</h5>
                      <div className="meta">{couponValue(coupon)} - {couponValidity(coupon)} - {coupon.maxRedemptions ? `${coupon.maxRedemptions - coupon.redeemedCount} usos restantes` : 'uso liberado'}</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={async () => {
                        await navigator.clipboard?.writeText(coupon.code);
                        setCopiedCode(coupon.code);
                        notify('Cupom copiado.', 'success');
                      }}
                    >
                      {copiedCode === coupon.code ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        </section>
      </div>
    </main>
  );
}
