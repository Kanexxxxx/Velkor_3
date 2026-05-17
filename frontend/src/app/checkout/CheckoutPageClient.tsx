'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useCart } from '@/components/cart/CartProvider';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { trackEvent } from '@/components/Analytics';
import { isValidEmail } from '@/services/auth';
import { addOrder } from '@/services/orders';
import { createRemoteOrder } from '@/services/orderApi';
import { createPaymentPreference } from '@/services/paymentsApi';
import { createOrderCode } from '@/services/checkout';
import { API_BASE_URL } from '@/services/api';
import { formatPrice, getProductById } from '@/services/products';
import type { Address } from '@/types/user';
import type { Order, OrderPayment, OrderShipping } from '@/types/order';

const shippingPrices: Record<OrderShipping, number> = {
  standard: 0,
  express: 39
};

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <line x1="2" y1="11" x2="22" y2="11" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14" />
      <path d="M18 13h4" />
      <circle cx="17" cy="13" r="1" />
    </svg>
  );
}

function PixIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 22 12 12 22 2 12 12 2Zm0 4.2L6.2 12 12 17.8 17.8 12 12 6.2Z" />
    </svg>
  );
}

function BoletoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="6" y1="9" x2="6" y2="15" strokeWidth="2.5" />
      <line x1="9" y1="9" x2="9" y2="15" strokeWidth="1.2" />
      <line x1="11" y1="9" x2="11" y2="15" strokeWidth="2.5" />
      <line x1="14" y1="9" x2="14" y2="15" strokeWidth="1.2" />
      <line x1="16" y1="9" x2="16" y2="15" strokeWidth="2.5" />
      <line x1="18" y1="9" x2="18" y2="15" strokeWidth="1.2" />
    </svg>
  );
}

interface AddressForm {
  recipient: string;
  street: string;
  complement: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
}

const emptyAddress: AddressForm = {
  recipient: '',
  street: '',
  complement: '',
  city: '',
  region: '',
  postalCode: '',
  country: 'Brasil',
  phone: ''
};

function paymentLabel(payment: OrderPayment) {
  switch (payment) {
    case 'card': return 'Cartão';
    case 'mercado-pago': return 'Mercado Pago';
    case 'pix': return 'Pix';
    case 'boleto': return 'Boleto';
    default: return payment;
  }
}

export function CheckoutPageClient() {
  const { items, summary, clearCart } = useCart();
  const { user, upsertAddress } = useAuth();
  const { notify } = useNotifications();
  const router = useRouter();

  const [shipping, setShipping] = useState<OrderShipping>('standard');
  const [payment, setPayment] = useState<OrderPayment>('card');
  const [coupon, setCoupon] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [appliedCouponPercent, setAppliedCouponPercent] = useState(0);
  const [appliedCouponFixed, setAppliedCouponFixed] = useState(0); // em reais
  const [couponLoading, setCouponLoading] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const [pending, setPending] = useState(false);

  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddress);
  const [saveAddress, setSaveAddress] = useState(true);
  const [cepLoading, setCepLoading] = useState(false);

  useEffect(() => {
    setOrderCode(createOrderCode());
  }, []);

  useEffect(() => {
    if (!user) return;
    setContact(state => ({
      name: state.name || user.name,
      email: state.email || user.email,
      phone: state.phone || user.phone || ''
    }));
    if (user.addresses.length > 0) {
      const defaultAddress = user.addresses.find(item => item.isDefault) ?? user.addresses[0];
      setSelectedAddressId(defaultAddress.id);
    }
  }, [user]);

  useEffect(() => {
    if (!user || selectedAddressId === 'new') return;
    const target = user.addresses.find(item => item.id === selectedAddressId);
    if (target) {
      setAddressForm({
        recipient: target.recipient,
        street: target.street,
        complement: target.complement ?? '',
        city: target.city,
        region: target.region,
        postalCode: target.postalCode,
        country: target.country,
        phone: target.phone ?? ''
      });
    }
  }, [selectedAddressId, user]);

  const subtotal = summary.subtotal;
  const discount = appliedCouponPercent > 0
    ? Math.round(subtotal * appliedCouponPercent / 100)
    : appliedCouponFixed > 0
      ? Math.min(subtotal, appliedCouponFixed)
      : 0;
  const shippingPrice = shippingPrices[shipping];
  const total = Math.max(0, subtotal + shippingPrice - discount);

  const summaryItems = useMemo(
    () => items.map(item => ({ item, product: getProductById(item.productId) })).filter(entry => entry.product),
    [items]
  );

  async function applyCoupon() {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/coupon/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json() as { valid: boolean; discountPercent?: number; discountFixed?: number; code?: string };
      if (data.valid && (data.discountPercent || data.discountFixed)) {
        setAppliedCoupon(data.code ?? code);
        setAppliedCouponPercent(data.discountPercent ?? 0);
        setAppliedCouponFixed(data.discountFixed ?? 0);
        const msg = data.discountPercent
          ? `Cupom aplicado: ${data.discountPercent}% de desconto.`
          : `Cupom aplicado: R$ ${(data.discountFixed ?? 0).toFixed(2)} de desconto.`;
        notify(msg, 'success');
      } else {
        setAppliedCoupon('');
        setAppliedCouponPercent(0);
        setAppliedCouponFixed(0);
        notify('Cupom inválido ou expirado.', 'error');
      }
    } catch {
      notify('Não foi possível validar o cupom. Tente novamente.', 'error');
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon('');
    setAppliedCouponPercent(0);
    setAppliedCouponFixed(0);
    setCoupon('');
    notify('Cupom removido.', 'info');
  }

  async function lookupCep(raw: string) {
    const cep = raw.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!res.ok) return;
      const data = await res.json() as { erro?: boolean; logradouro?: string; localidade?: string; uf?: string };
      if (data.erro) return;
      setAddressForm(state => ({
        ...state,
        street: data.logradouro ?? state.street,
        city: data.localidade ?? state.city,
        region: data.uf ?? state.region,
        country: 'Brasil'
      }));
    } catch {
      // ViaCEP unavailable — user fills manually
    } finally {
      setCepLoading(false);
    }
  }

  function buildAddress(): Address {
    const baseAddress = user?.addresses.find(item => item.id === selectedAddressId);
    return {
      id: baseAddress?.id ?? `tmp_${Date.now()}`,
      label: baseAddress?.label ?? 'Endereço de entrega',
      recipient: addressForm.recipient.trim() || contact.name,
      street: addressForm.street.trim(),
      complement: addressForm.complement.trim() || undefined,
      city: addressForm.city.trim(),
      region: addressForm.region.trim(),
      postalCode: addressForm.postalCode.trim(),
      country: addressForm.country.trim() || 'Brasil',
      phone: (addressForm.phone || contact.phone || '').trim() || undefined,
      isDefault: baseAddress?.isDefault ?? false
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orderCode) {
      notify('Aguarde o checkout finalizar a preparação do pedido.', 'error');
      return;
    }
    if (!items.length) {
      notify('Sua sacola está vazia.', 'error');
      return;
    }

    if (!isValidEmail(contact.email)) {
      notify('Informe um email válido para receber o pedido.', 'error');
      return;
    }

    if (!addressForm.street || !addressForm.city || !addressForm.postalCode) {
      notify('Preencha o endereço de entrega.', 'error');
      return;
    }

    setPending(true);

    try {
      const address = buildAddress();

      if (user && saveAddress && selectedAddressId === 'new') {
        const updated = upsertAddress({
          ...address,
          isDefault: user.addresses.length === 0
        });
        const savedAddress = updated.addresses.find(item => item.street === address.street && item.postalCode === address.postalCode);
        if (savedAddress) address.id = savedAddress.id;
      }

      const fallbackOrder: Order = {
        id: orderCode,
        userId: user?.id,
        items,
        status: 'pending',
        subtotal,
        shippingCost: shippingPrice,
        tax: 0,
        discount,
        coupon: appliedCoupon || undefined,
        total,
        payment,
        shipping,
        contact: { name: contact.name, email: contact.email, phone: contact.phone || undefined },
        address,
        createdAt: new Date().toISOString()
      };

      let order = fallbackOrder;
      let savedRemotely = false;
      try {
        order = await createRemoteOrder({
          items,
          contact: { name: contact.name, email: contact.email, phone: contact.phone || undefined },
          address,
          coupon: appliedCoupon || undefined,
          payment,
          shipping
        });
        savedRemotely = true;
      } catch {
        addOrder(fallbackOrder);
      }

      if (savedRemotely) addOrder(order);
      trackEvent('Purchase', { value: order.total, currency: 'BRL', order_id: order.id });
      clearCart();

      if (savedRemotely && payment === 'mercado-pago') {
        try {
          const preference = await createPaymentPreference(order.id);
          notify('Redirecionando para o Mercado Pago.', 'success');
          window.location.href = preference.initPoint;
          return;
        } catch (err) {
          notify(err instanceof Error ? err.message : 'Nao foi possivel iniciar Mercado Pago.', 'error');
        }
      }

      const message = savedRemotely
        ? `Pedido criado com sucesso. Aguardando pagamento.`
        : `Pedido ${order.id} salvo localmente. Sincronize quando o servidor estiver disponível.`;
      notify(message, 'success');

      router.push(user ? '/account?tab=orders' : '/');
    } catch (error) {
      notify((error as Error).message, 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="checkout">
      <div className="container">
        <div className="crumbs" style={{ marginBottom: 24 }}>
          <Link href="/">Início</Link>
          <span className="sep">/</span>
          <Link href="/shop">Loja</Link>
          <span className="sep">/</span>
          <span>Checkout</span>
        </div>

        <h1>Última <span className="red">Etapa.</span></h1>
        <div className="checkout-sub">PEDIDO #{orderCode || 'GERANDO'}{user ? ` · LOGADO COMO ${user.email.toUpperCase()}` : ''}</div>

        <div className="checkout-grid">
          <form className="checkout-form" onSubmit={handleSubmit}>
            <div className="form-block">
              <h3><span className="num">01</span> Contato</h3>
              <div className="sub">Para atualizações de envio e recibos</div>
              <div className="field-row cols-2">
                <div className="field">
                  <label htmlFor="checkout-name">Nome</label>
                  <input id="checkout-name" type="text" required value={contact.name} onChange={event => setContact(state => ({ ...state, name: event.target.value }))} autoComplete="name" />
                </div>
                <div className="field">
                  <label htmlFor="checkout-email">Email</label>
                  <input id="checkout-email" type="email" required value={contact.email} onChange={event => setContact(state => ({ ...state, email: event.target.value }))} placeholder="voce@email.com" autoComplete="email" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="checkout-phone">Telefone</label>
                  <input id="checkout-phone" type="tel" value={contact.phone} onChange={event => setContact(state => ({ ...state, phone: event.target.value }))} placeholder="+55 ..." autoComplete="tel" />
                </div>
              </div>
            </div>

            <div className="form-block">
              <h3><span className="num">02</span> Endereço de Entrega</h3>
              <div className="sub">Onde a entrega será feita</div>

              {user && user.addresses.length > 0 ? (
                <div className="saved-addresses">
                  {user.addresses.map(address => (
                    <label key={address.id} className={`saved-address${selectedAddressId === address.id ? ' active' : ''}`}>
                      <input
                        type="radio"
                        name="savedAddress"
                        value={address.id}
                        checked={selectedAddressId === address.id}
                        onChange={() => setSelectedAddressId(address.id)}
                      />
                      <div>
                        <strong>{address.label}{address.isDefault ? ' · Padrão' : ''}</strong>
                        <span>{address.street}, {address.city}/{address.region}</span>
                      </div>
                    </label>
                  ))}
                  <label className={`saved-address${selectedAddressId === 'new' ? ' active' : ''}`}>
                    <input
                      type="radio"
                      name="savedAddress"
                      value="new"
                      checked={selectedAddressId === 'new'}
                      onChange={() => { setSelectedAddressId('new'); setAddressForm(emptyAddress); }}
                    />
                    <div>
                      <strong>+ Novo endereço</strong>
                      <span>Cadastrar um endereço diferente para esta entrega</span>
                    </div>
                  </label>
                </div>
              ) : null}

              <div className="field-row cols-2">
                <div className="field">
                  <label htmlFor="recipient">Quem recebe</label>
                  <input id="recipient" type="text" required value={addressForm.recipient} onChange={event => setAddressForm(state => ({ ...state, recipient: event.target.value }))} autoComplete="name" />
                </div>
                <div className="field">
                  <label htmlFor="postal-code">CEP{cepLoading ? ' — buscando...' : ''}</label>
                  <input
                    id="postal-code"
                    type="text"
                    required
                    value={addressForm.postalCode}
                    onChange={event => setAddressForm(state => ({ ...state, postalCode: event.target.value }))}
                    onBlur={event => lookupCep(event.target.value)}
                    autoComplete="postal-code"
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="address-line-1">Endereço</label>
                  <input id="address-line-1" type="text" required value={addressForm.street} onChange={event => setAddressForm(state => ({ ...state, street: event.target.value }))} autoComplete="address-line1" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="address-line-2">Complemento</label>
                  <input id="address-line-2" type="text" value={addressForm.complement} onChange={event => setAddressForm(state => ({ ...state, complement: event.target.value }))} autoComplete="address-line2" />
                </div>
              </div>
              <div className="field-row cols-3">
                <div className="field">
                  <label htmlFor="city">Cidade</label>
                  <input id="city" type="text" required value={addressForm.city} onChange={event => setAddressForm(state => ({ ...state, city: event.target.value }))} autoComplete="address-level2" />
                </div>
                <div className="field">
                  <label htmlFor="region">Estado</label>
                  <input id="region" type="text" required value={addressForm.region} onChange={event => setAddressForm(state => ({ ...state, region: event.target.value }))} autoComplete="address-level1" />
                </div>
                <div className="field">
                  <label htmlFor="country">País</label>
                  <select id="country" value={addressForm.country} onChange={event => setAddressForm(state => ({ ...state, country: event.target.value }))}>
                    <option>Brasil</option>
                    <option>Estados Unidos</option>
                    <option>Alemanha</option>
                    <option>Reino Unido</option>
                    <option>Japão</option>
                    <option>França</option>
                    <option>Itália</option>
                    <option>Coreia do Sul</option>
                  </select>
                </div>
              </div>

              {user && selectedAddressId === 'new' ? (
                <label className="checkbox-row">
                  <input type="checkbox" checked={saveAddress} onChange={event => setSaveAddress(event.target.checked)} />
                  <span>Salvar este endereço na minha conta</span>
                </label>
              ) : null}
            </div>

            <div className="form-block">
              <h3><span className="num">03</span> Método de Entrega</h3>
              <div className="sub">Todos os envios incluem documentação do acervo</div>
              <div className="payments" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {([
                  ['standard', 'Padrão', '4-6 dias úteis', 'GRÁTIS'],
                  ['express', 'Expresso', '1-2 dias úteis', formatPrice(shippingPrices.express)]
                ] as const).map(([value, label, time, price]) => (
                  <label className={`pay-method${shipping === value ? ' active' : ''}`} style={{ cursor: 'pointer' }} key={value}>
                    <input
                      type="radio"
                      name="ship"
                      value={value}
                      checked={shipping === value}
                      onChange={() => setShipping(value)}
                      hidden
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <div style={{ textAlign: 'left' }}>
                        <b style={{ fontFamily: 'var(--font-head)', fontSize: 13, display: 'block' }}>{label}</b>
                        <span>{time}</span>
                      </div>
                      <b className="mono" style={{ color: value === 'standard' ? 'var(--red)' : undefined, fontSize: 14 }}>{price}</b>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-block">
              <h3><span className="num">04</span> Pagamento</h3>
              <div className="sub">Transações protegidas. Mercado Pago preparado para integração no backend.</div>

              <div className="payments">
                {([
                  ['card', 'Cartão', <CardIcon key="card" />],
                  ['mercado-pago', 'Mercado Pago', <WalletIcon key="mp" />],
                  ['pix', 'Pix', <PixIcon key="pix" />],
                  ['boleto', 'Boleto', <BoletoIcon key="boleto" />]
                ] as const).map(([value, label, icon]) => (
                  <button
                    type="button"
                    className={`pay-method${payment === value ? ' active' : ''}`}
                    key={value}
                    onClick={() => setPayment(value)}
                    aria-pressed={payment === value}
                  >
                    {icon}
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {payment === 'card' ? (
                <div style={{ marginTop: 24 }}>
                  <div className="field-row">
                    <div className="field"><label htmlFor="card-number">Número do Cartão</label><input id="card-number" type="text" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" /></div>
                  </div>
                  <div className="field-row cols-3">
                    <div className="field"><label htmlFor="card-name">Titular</label><input id="card-name" type="text" autoComplete="cc-name" /></div>
                    <div className="field"><label htmlFor="card-expiry">Validade</label><input id="card-expiry" type="text" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" /></div>
                    <div className="field"><label htmlFor="card-cvc">CVC</label><input id="card-cvc" type="text" inputMode="numeric" autoComplete="cc-csc" placeholder="000" /></div>
                  </div>
                </div>
              ) : (
                <div className="info-block" style={{ marginTop: 24 }}>
                  <h2>{paymentLabel(payment)}</h2>
                  <p>Após finalizar, você receberá as instruções de pagamento por email. O pedido é confirmado assim que o pagamento for identificado.</p>
                </div>
              )}
            </div>

            <button type="submit" className="place-order-btn" disabled={pending}>
              {pending ? 'Processando...' : 'Finalizar Pedido →'}
            </button>
          </form>

          <aside className="summary" aria-live="polite">
            <h3>Resumo do Pedido</h3>
            <div className="summary-items">
              {summaryItems.length ? (
                summaryItems.map(({ item, product }) => product ? (
                  <div className="summary-item" key={`${item.productId}-${item.size}-${item.color}`}>
                    <Image src={product.image} alt="" width={64} height={72} sizes="64px" />
                    <div>
                      <h5>{product.name}</h5>
                      <div className="meta">Tamanho {item.size} · QTD {item.quantity}</div>
                    </div>
                    <div className="price">{formatPrice(product.price * item.quantity)}</div>
                  </div>
                ) : null)
              ) : (
                <div className="cart-empty">
                  <p>Sua sacola está vazia</p>
                  <Link href="/shop" className="btn btn-ghost" style={{ marginTop: 14 }}>Começar compra</Link>
                </div>
              )}
            </div>

            <div className="coupon-row">
              <input type="text" value={coupon} onChange={event => setCoupon(event.target.value)} placeholder="INSERIR CUPOM" disabled={couponLoading} />
              {appliedCoupon ? (
                <button type="button" onClick={removeCoupon} disabled={couponLoading}>Remover</button>
              ) : (
                <button type="button" onClick={applyCoupon} disabled={couponLoading}>{couponLoading ? '...' : 'Aplicar'}</button>
              )}
            </div>

            <div className="summary-totals">
              <div className="row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="row"><span>Frete</span><span style={{ color: shippingPrice ? 'var(--text)' : 'var(--red)' }}>{shippingPrice ? formatPrice(shippingPrice) : 'GRÁTIS'}</span></div>
              {discount > 0 ? <div className="row discount"><span>Desconto ({appliedCoupon})</span><span>−{formatPrice(discount)}</span></div> : null}
              <div className="row total"><span>Total</span><span>{formatPrice(total)}</span></div>
            </div>

            <div className="eyebrow" style={{ textAlign: 'center', marginTop: 16 }}>
              SSL 256-BIT CRIPTOGRAFADO
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
