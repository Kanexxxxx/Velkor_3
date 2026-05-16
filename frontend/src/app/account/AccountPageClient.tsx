'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { useWishlist } from '@/components/wishlist/WishlistProvider';
import { isStrongPassword, isValidEmail } from '@/services/auth';
import { getInfoHref } from '@/services/infoPages';
import { ordersForUser, orderStatusLabels } from '@/services/orders';
import { formatPrice, getProductById } from '@/services/products';
import type { Address } from '@/types/user';
import type { Order } from '@/types/order';

type TabKey = 'profile' | 'orders' | 'addresses' | 'security';

const TABS: Array<{ key: TabKey; label: string; description: string }> = [
  { key: 'profile', label: 'Visão geral', description: 'Dados da conta, contato e preferências.' },
  { key: 'orders', label: 'Meus pedidos', description: 'Histórico de compras e status do envio.' },
  { key: 'addresses', label: 'Endereços', description: 'Endereços salvos para checkout rápido.' },
  { key: 'security', label: 'Senha & segurança', description: 'Atualize sua senha e proteja sua conta.' }
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
  } catch {
    return value;
  }
}

export function AccountPageClient() {
  const { user, isAuthenticated, isReady, login, register, requestPasswordReset, logout } = useAuth();
  const { notify } = useNotifications();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get('tab') ?? 'profile') as TabKey;
  const tab = TABS.some(item => item.key === tabParam) ? tabParam : 'profile';

  if (!isReady) {
    return <main className="info-page"><div className="container"><p className="eyebrow">Carregando...</p></div></main>;
  }

  if (!isAuthenticated || !user) {
    return (
      <AuthLandingView
        onLogin={async ({ email, password }) => {
          const next = await login({ email, password });
          notify(`Bem-vindo de volta, ${next.name.split(' ')[0]}.`, 'success');
          router.push('/account?tab=profile');
        }}
        onRegister={async ({ name, email, password }) => {
          const next = await register({ name, email, password });
          notify(`Conta criada. Bem-vindo, ${next.name.split(' ')[0]}.`, 'success');
          router.push('/account?tab=profile');
        }}
        onForgot={email => {
          try {
            const result = requestPasswordReset(email);
            const link = `${window.location.origin}/account/reset-password?token=${result.token}`;
            notify('Email de recuperação enviado. Em produção o link chega no seu inbox.', 'success');
            if (process.env.NODE_ENV === 'development') {
              console.info('VELKOR · Link de recuperação (modo demo):', link);
            }
            return link;
          } catch (error) {
            notify((error as Error).message, 'error');
            return null;
          }
        }}
      />
    );
  }

  return (
    <AccountDashboard
      tab={tab}
      onLogout={() => {
        logout();
        notify('Sessão encerrada.', 'info');
        router.push('/account');
      }}
    />
  );
}

interface AuthLandingProps {
  onLogin: (input: { email: string; password: string }) => Promise<void>;
  onRegister: (input: { name: string; email: string; password: string }) => Promise<void>;
  onForgot: (email: string) => string | null;
}

function AuthLandingView({ onLogin, onRegister, onForgot }: AuthLandingProps) {
  const [loginError, setLoginError] = useState('');
  const [signupError, setSignupError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLink, setForgotLink] = useState<string | null>(null);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [isSubmittingSignup, setIsSubmittingSignup] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError('');
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get('email') ?? '');
    const password = String(data.get('password') ?? '');

    if (!isValidEmail(email)) { setLoginError('Informe um email válido.'); return; }
    if (!isStrongPassword(password)) { setLoginError('A senha precisa ter pelo menos 6 caracteres.'); return; }

    try {
      setIsSubmittingLogin(true);
      await onLogin({ email, password });
    } catch (error) {
      setLoginError((error as Error).message);
    } finally {
      setIsSubmittingLogin(false);
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignupError('');
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') ?? '');
    const email = String(data.get('email') ?? '');
    const password = String(data.get('password') ?? '');

    if (name.trim().length < 2) { setSignupError('Informe seu nome completo.'); return; }
    if (!isValidEmail(email)) { setSignupError('Informe um email válido.'); return; }
    if (!isStrongPassword(password)) { setSignupError('A senha precisa ter pelo menos 6 caracteres.'); return; }

    try {
      setIsSubmittingSignup(true);
      await onRegister({ name, email, password });
    } catch (error) {
      setSignupError((error as Error).message);
    } finally {
      setIsSubmittingSignup(false);
    }
  }

  return (
    <main className="info-page">
      <div className="container">
        <div className="crumbs">
          <Link href="/">Início</Link>
          <span className="sep">/</span>
          <span>Conta</span>
        </div>

        <div className="info-hero">
          <div>
            <div className="section-num">ACESSO DE MEMBRO</div>
            <h1>Minha <span className="red">Conta.</span></h1>
            <p>Entre com sua conta Velkor ou crie uma nova em segundos. Após confirmar, você é levado direto para o painel da conta.</p>
          </div>
          <Link href="/shop" className="btn btn-ghost">Continuar comprando</Link>
        </div>

        {forgotMode ? (
          <section className="auth-grid auth-grid-single" key="forgot-password">
            <form
              className="form-block"
              onSubmit={event => {
                event.preventDefault();
                const link = onForgot(forgotEmail);
                if (link) setForgotLink(link);
              }}
            >
              <h3><span className="num">RESET</span> Recuperar senha</h3>
              <div className="sub">Vamos enviar um link de redefinição para seu email cadastrado.</div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="forgot-email">Email</label>
                  <input id="forgot-email" type="email" autoComplete="email" required value={forgotEmail} onChange={event => setForgotEmail(event.target.value)} />
                </div>
              </div>
              <button className="place-order-btn" type="submit">Enviar link de recuperação</button>
              {forgotLink ? (
                <div className="auth-callout">
                  <strong>Modo demonstração:</strong>
                  <p>O envio real depende do gateway de email (ver docs). Use o link abaixo para continuar:</p>
                  <Link className="auth-link" href={forgotLink.replace(window.location.origin, '')}>
                    Abrir link de redefinição →
                  </Link>
                </div>
              ) : null}
              <button type="button" className="auth-secondary" onClick={() => { setForgotMode(false); setForgotLink(null); }}>
                ← Voltar para login
              </button>
            </form>
          </section>
        ) : (
          <section className="auth-grid" key="login-register">
            <form className="form-block" onSubmit={handleLogin} noValidate>
              <h3><span className="num">01</span> Entrar</h3>
              <div className="sub">Acesse sua conta Velkor</div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="login-email">Email</label>
                  <input id="login-email" name="email" type="email" required autoComplete="email" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="login-password">Senha</label>
                  <input id="login-password" name="password" type="password" required minLength={6} autoComplete="current-password" />
                </div>
              </div>
              <button className="place-order-btn" type="submit" disabled={isSubmittingLogin}>
                {isSubmittingLogin ? 'Entrando...' : 'Entrar'}
              </button>
              <button type="button" className="auth-secondary" onClick={() => setForgotMode(true)}>
                Esqueci minha senha
              </button>
              {loginError ? <p className="auth-error" role="alert">{loginError}</p> : null}
            </form>

            <form className="form-block" onSubmit={handleSignup} noValidate>
              <h3><span className="num">02</span> Criar Conta</h3>
              <div className="sub">Cadastre-se e ganhe acesso a drops antecipados</div>
              <div className="field-row cols-2">
                <div className="field">
                  <label htmlFor="signup-name">Nome</label>
                  <input id="signup-name" name="name" type="text" required autoComplete="name" />
                </div>
                <div className="field">
                  <label htmlFor="signup-email">Email</label>
                  <input id="signup-email" name="email" type="email" required autoComplete="email" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="signup-password">Senha</label>
                  <input id="signup-password" name="password" type="password" required minLength={6} autoComplete="new-password" />
                </div>
              </div>
              <button className="place-order-btn" type="submit" disabled={isSubmittingSignup}>
                {isSubmittingSignup ? 'Criando...' : 'Criar conta'}
              </button>
              <p className="auth-helper">Ao criar a conta você concorda com os <Link href={getInfoHref('terms')}>Termos</Link> e a <Link href={getInfoHref('privacy')}>Política de Privacidade</Link>.</p>
              {signupError ? <p className="auth-error" role="alert">{signupError}</p> : null}
            </form>
          </section>
        )}
      </div>
    </main>
  );
}

interface AccountDashboardProps {
  tab: TabKey;
  onLogout: () => void;
}

function AccountDashboard({ tab, onLogout }: AccountDashboardProps) {
  const { user } = useAuth();
  const { productIds } = useWishlist();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user) return;
    setOrders(ordersForUser(user.id));
  }, [user, tab]);

  if (!user) return null;

  const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);

  return (
    <main className="info-page account-dashboard">
      <div className="container">
        <div className="crumbs">
          <Link href="/">Início</Link>
          <span className="sep">/</span>
          <Link href="/account">Conta</Link>
          <span className="sep">/</span>
          <span>{TABS.find(item => item.key === tab)?.label}</span>
        </div>

        <header className="account-header">
          <div className="account-identity">
            <div className="account-avatar">{getInitials(user.name)}</div>
            <div>
              <div className="section-num">PAINEL DA CONTA</div>
              <h1>Olá, <span className="red">{user.name.split(' ')[0]}.</span></h1>
              <p className="account-meta">{user.email} · membro desde {formatDate(user.createdAt)}</p>
            </div>
          </div>
          <button type="button" className="btn btn-ghost account-logout" onClick={onLogout}>Sair da conta</button>
        </header>

        <section className="account-stats">
          <div className="stat-card">
            <span className="stat-num">{orders.length}</span>
            <span className="stat-label">Pedidos realizados</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{user.addresses.length}</span>
            <span className="stat-label">Endereços salvos</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{productIds.length}</span>
            <span className="stat-label">Favoritos</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{formatPrice(totalSpent)}</span>
            <span className="stat-label">Total comprado</span>
          </div>
        </section>

        <section className="account-shell">
          <nav className="account-nav" aria-label="Seções da conta">
            {TABS.map(item => (
              <Link
                key={item.key}
                href={`/account?tab=${item.key}`}
                className={item.key === tab ? 'active' : undefined}
              >
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </Link>
            ))}
            <Link href="/wishlist" className="account-nav-secondary">
              <strong>Favoritos</strong>
              <span>{productIds.length} produto(s) salvos</span>
            </Link>
          </nav>

          <div className="account-content">
            {tab === 'profile' ? <ProfilePanel /> : null}
            {tab === 'orders' ? <OrdersPanel orders={orders} /> : null}
            {tab === 'addresses' ? <AddressesPanel /> : null}
            {tab === 'security' ? <SecurityPanel /> : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function ProfilePanel() {
  const { user, updateProfile } = useAuth();
  const { notify } = useNotifications();
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    if (user) setForm({ name: user.name, email: user.email, phone: user.phone ?? '' });
  }, [user]);

  if (!user) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      updateProfile(form);
      notify('Perfil atualizado com sucesso.', 'success');
    } catch (error) {
      notify((error as Error).message, 'error');
    }
  }

  return (
    <article className="account-panel">
      <header>
        <h2>Dados do perfil</h2>
        <p>Atualize seu nome, email principal e telefone de contato.</p>
      </header>
      <form className="form-block account-form" onSubmit={handleSubmit}>
        <div className="field-row cols-2">
          <div className="field">
            <label htmlFor="profile-name">Nome completo</label>
            <input id="profile-name" type="text" value={form.name} required onChange={event => setForm(state => ({ ...state, name: event.target.value }))} />
          </div>
          <div className="field">
            <label htmlFor="profile-email">Email</label>
            <input id="profile-email" type="email" value={form.email} required onChange={event => setForm(state => ({ ...state, email: event.target.value }))} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="profile-phone">Telefone</label>
            <input id="profile-phone" type="tel" value={form.phone} onChange={event => setForm(state => ({ ...state, phone: event.target.value }))} placeholder="+55 11 99999-9999" />
          </div>
        </div>
        <button type="submit" className="place-order-btn">Salvar alterações</button>
      </form>
    </article>
  );
}

function OrdersPanel({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <article className="account-panel">
        <header>
          <h2>Meus pedidos</h2>
          <p>Você ainda não fez nenhum pedido. Quando comprar, o histórico completo aparece aqui.</p>
        </header>
        <div className="empty-state">
          <h2>Nada por aqui ainda.</h2>
          <p>Explore o acervo e descubra os drops desta temporada.</p>
          <Link href="/shop" className="btn btn-primary">Ver loja</Link>
        </div>
      </article>
    );
  }

  return (
    <article className="account-panel">
      <header>
        <h2>Meus pedidos</h2>
        <p>Histórico completo, status atual e detalhes de cada compra.</p>
      </header>
      <div className="orders-list">
        {orders.map(order => {
          const status = orderStatusLabels[order.status] ?? orderStatusLabels.pending;
          const shippingCost = typeof order.shippingCost === 'number' ? order.shippingCost : 0;
          const tax = typeof order.tax === 'number' ? order.tax : 0;
          const discount = typeof order.discount === 'number' ? order.discount : 0;
          const payment = order.payment ?? 'card';
          const shipping = order.shipping ?? 'standard';
          const address = order.address;
          return (
            <details className="order-card" key={order.id} open={order === orders[0]}>
              <summary>
                <div>
                  <span className="order-code">#{order.id}</span>
                  <span className="order-date">{formatDate(order.createdAt)}</span>
                </div>
                <span className={`order-status status-${status.tone}`}>{status.label}</span>
                <span className="order-total">{formatPrice(order.total)}</span>
              </summary>
              <div className="order-body">
                <div className="order-products">
                  {order.items.map(item => {
                    const product = getProductById(item.productId);
                    return (
                      <div className="order-product" key={`${item.productId}-${item.size}-${item.color}`}>
                        <strong>{product?.name ?? item.productId}</strong>
                        <span>Tamanho {item.size} · QTD {item.quantity}</span>
                      </div>
                    );
                  })}
                </div>
                <dl className="order-grid">
                  <div><dt>Pagamento</dt><dd>{paymentLabel(payment)}</dd></div>
                  <div><dt>Entrega</dt><dd>{shipping === 'express' ? 'Expressa' : 'Padrão'}</dd></div>
                  <div><dt>Frete</dt><dd>{shippingCost ? formatPrice(shippingCost) : 'Grátis'}</dd></div>
                  <div><dt>Imposto estimado</dt><dd>{formatPrice(tax)}</dd></div>
                  {discount > 0 ? <div><dt>Desconto</dt><dd>-{formatPrice(discount)}</dd></div> : null}
                  {address ? <div><dt>Endereço</dt><dd>{address.street}, {address.city}/{address.region}</dd></div> : null}
                </dl>
              </div>
            </details>
          );
        })}
      </div>
    </article>
  );
}

function paymentLabel(payment: Order['payment']) {
  switch (payment) {
    case 'card': return 'Cartão';
    case 'mercado-pago': return 'Mercado Pago';
    case 'pix': return 'Pix';
    case 'boleto': return 'Boleto';
    default: return payment;
  }
}

function AddressesPanel() {
  const { user, upsertAddress, removeAddress, makeAddressDefault } = useAuth();
  const { notify } = useNotifications();
  const [editing, setEditing] = useState<Address | null>(null);
  const [open, setOpen] = useState(false);

  if (!user) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload: Omit<Address, 'id'> & { id?: string } = {
      id: editing?.id,
      label: String(data.get('label') ?? 'Endereço'),
      recipient: String(data.get('recipient') ?? ''),
      street: String(data.get('street') ?? ''),
      complement: String(data.get('complement') ?? ''),
      city: String(data.get('city') ?? ''),
      region: String(data.get('region') ?? ''),
      postalCode: String(data.get('postalCode') ?? ''),
      country: String(data.get('country') ?? 'Brasil'),
      phone: String(data.get('phone') ?? ''),
      isDefault: data.get('isDefault') === 'on'
    };

    try {
      upsertAddress(payload);
      notify(editing ? 'Endereço atualizado.' : 'Endereço salvo.', 'success');
      setEditing(null);
      setOpen(false);
    } catch (error) {
      notify((error as Error).message, 'error');
    }
  }

  return (
    <article className="account-panel">
      <header className="account-panel-header">
        <div>
          <h2>Endereços salvos</h2>
          <p>Endereços ficam disponíveis para preenchimento rápido no checkout.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => { setEditing(null); setOpen(true); }}
        >
          Novo endereço
        </button>
      </header>

      {user.addresses.length === 0 && !open ? (
        <div className="empty-state">
          <h2>Nenhum endereço cadastrado.</h2>
          <p>Cadastre um endereço para acelerar o checkout.</p>
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>Adicionar endereço</button>
        </div>
      ) : null}

      {user.addresses.length > 0 ? (
        <div className="addresses-list">
          {user.addresses.map(address => (
            <div className={`address-card${address.isDefault ? ' is-default' : ''}`} key={address.id}>
              <div className="address-card-head">
                <strong>{address.label}</strong>
                {address.isDefault ? <span className="badge new">Padrão</span> : null}
              </div>
              <p>{address.recipient}</p>
              <p>{address.street}{address.complement ? `, ${address.complement}` : ''}</p>
              <p>{address.city} / {address.region} · {address.postalCode}</p>
              <p>{address.country}{address.phone ? ` · ${address.phone}` : ''}</p>
              <div className="address-card-actions">
                <button type="button" onClick={() => { setEditing(address); setOpen(true); }}>Editar</button>
                {!address.isDefault ? (
                  <button type="button" onClick={() => { makeAddressDefault(address.id); notify('Endereço padrão atualizado.', 'success'); }}>
                    Tornar padrão
                  </button>
                ) : null}
                <button type="button" className="danger" onClick={() => { removeAddress(address.id); notify('Endereço removido.', 'info'); }}>
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {open ? (
        <form className="form-block account-form" onSubmit={handleSubmit}>
          <h3>{editing ? 'Editar endereço' : 'Novo endereço'}</h3>
          <div className="field-row cols-2">
            <div className="field"><label htmlFor="addr-label">Apelido</label><input id="addr-label" name="label" type="text" defaultValue={editing?.label ?? 'Casa'} required /></div>
            <div className="field"><label htmlFor="addr-recipient">Quem recebe</label><input id="addr-recipient" name="recipient" type="text" defaultValue={editing?.recipient ?? user.name} required /></div>
          </div>
          <div className="field-row">
            <div className="field"><label htmlFor="addr-street">Rua e número</label><input id="addr-street" name="street" type="text" defaultValue={editing?.street ?? ''} required /></div>
          </div>
          <div className="field-row">
            <div className="field"><label htmlFor="addr-complement">Complemento</label><input id="addr-complement" name="complement" type="text" defaultValue={editing?.complement ?? ''} /></div>
          </div>
          <div className="field-row cols-3">
            <div className="field"><label htmlFor="addr-city">Cidade</label><input id="addr-city" name="city" type="text" defaultValue={editing?.city ?? ''} required /></div>
            <div className="field"><label htmlFor="addr-region">Estado</label><input id="addr-region" name="region" type="text" defaultValue={editing?.region ?? ''} required /></div>
            <div className="field"><label htmlFor="addr-postal">CEP</label><input id="addr-postal" name="postalCode" type="text" defaultValue={editing?.postalCode ?? ''} required /></div>
          </div>
          <div className="field-row cols-2">
            <div className="field"><label htmlFor="addr-country">País</label><input id="addr-country" name="country" type="text" defaultValue={editing?.country ?? 'Brasil'} required /></div>
            <div className="field"><label htmlFor="addr-phone">Telefone</label><input id="addr-phone" name="phone" type="tel" defaultValue={editing?.phone ?? user.phone ?? ''} /></div>
          </div>
          <label className="checkbox-row">
            <input type="checkbox" name="isDefault" defaultChecked={editing?.isDefault ?? user.addresses.length === 0} />
            <span>Definir como endereço padrão</span>
          </label>
          <div className="account-form-actions">
            <button type="submit" className="place-order-btn">{editing ? 'Atualizar endereço' : 'Salvar endereço'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setOpen(false); }}>Cancelar</button>
          </div>
        </form>
      ) : null}
    </article>
  );
}

function SecurityPanel() {
  const { changePassword } = useAuth();
  const { notify } = useNotifications();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const current = String(data.get('current') ?? '');
    const next = String(data.get('next') ?? '');
    const confirmation = String(data.get('confirmation') ?? '');

    if (next !== confirmation) {
      notify('A confirmação não bate com a nova senha.', 'error');
      return;
    }

    try {
      setPending(true);
      await changePassword({ currentPassword: current, nextPassword: next });
      notify('Senha atualizada com sucesso.', 'success');
      form.reset();
    } catch (error) {
      notify((error as Error).message, 'error');
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="account-panel">
      <header>
        <h2>Senha & segurança</h2>
        <p>Atualize sua senha periodicamente. Recomendamos pelo menos 10 caracteres com letras, números e símbolos.</p>
      </header>
      <form className="form-block account-form" onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field"><label htmlFor="security-current">Senha atual</label><input id="security-current" name="current" type="password" required minLength={6} autoComplete="current-password" /></div>
        </div>
        <div className="field-row cols-2">
          <div className="field"><label htmlFor="security-next">Nova senha</label><input id="security-next" name="next" type="password" required minLength={6} autoComplete="new-password" /></div>
          <div className="field"><label htmlFor="security-confirmation">Confirmar nova senha</label><input id="security-confirmation" name="confirmation" type="password" required minLength={6} autoComplete="new-password" /></div>
        </div>
        <button type="submit" className="place-order-btn" disabled={pending}>{pending ? 'Atualizando...' : 'Atualizar senha'}</button>
      </form>
      <div className="info-block">
        <h2>Sessões e dispositivos</h2>
        <p>Em produção, esta área lista os dispositivos que acessaram a conta. Por ora, sua sessão fica protegida no seu navegador atual.</p>
      </div>
    </article>
  );
}
