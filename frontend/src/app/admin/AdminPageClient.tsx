'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getInfoHref } from '@/services/infoPages';
import { formatPrice, products as fallbackProducts } from '@/services/products';
import { readOrders } from '@/services/orders';
import {
  createAdminProduct,
  fetchAdminUsers,
  fetchAdminOrders,
  fetchAdminProducts,
  getAdminMe,
  isAdminApiUnavailable,
  legacyUnlock,
  updateAdminOrderStatus,
  updateAdminProduct,
  updateAdminUser,
  type AdminRole,
  type AdminUser,
  type AdminProduct
} from '@/services/adminApi';
import type { Order } from '@/types/order';
import type { Product } from '@/types/product';

const emptyProductForm = {
  id: '',
  slug: '',
  name: '',
  category: 'sneakers',
  brand: 'VOLKERR',
  price: '',
  oldPrice: '',
  badge: '',
  discount: '',
  colors: '#0a0a0a',
  image: '',
  images: '',
  sizes: 'P, M, G',
  tag: 'new',
  active: true,
};

type ProductFormState = typeof emptyProductForm;
type UserFormState = Record<string, { name: string; email: string; role: AdminRole; emailVerified: boolean }>;

function fallbackToAdminProduct(product: Product): AdminProduct {
  return {
    id: product.id,
    slug: product.id,
    name: product.name,
    category: product.category,
    brand: product.brand,
    price: product.price,
    oldPrice: product.oldPrice ?? null,
    rating: product.rating,
    reviews: product.reviews,
    badge: product.badge ?? null,
    discount: product.discount ?? null,
    colors: product.colors,
    image: product.image,
    images: product.images ?? [],
    sizes: product.sizes,
    tag: product.tag,
    active: true,
    createdAt: '',
    updatedAt: '',
  };
}

function productToForm(product: AdminProduct): ProductFormState {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category,
    brand: product.brand,
    price: String(product.price),
    oldPrice: product.oldPrice ? String(product.oldPrice) : '',
    badge: product.badge ?? '',
    discount: product.discount !== null && product.discount !== undefined ? String(product.discount) : '',
    colors: product.colors.join(', '),
    image: product.image,
    images: product.images.join(', '),
    sizes: product.sizes.join(', '),
    tag: product.tag,
    active: product.active,
  };
}

function splitFormList(value: string) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function formToPayload(form: ProductFormState) {
  return {
    id: form.id,
    slug: form.slug || form.id,
    name: form.name,
    category: form.category,
    brand: form.brand,
    price: Number(form.price),
    oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
    badge: form.badge || null,
    discount: form.discount ? Number(form.discount) : null,
    colors: splitFormList(form.colors),
    image: form.image,
    images: splitFormList(form.images),
    sizes: splitFormList(form.sizes),
    tag: form.tag,
    active: form.active,
  };
}

export function AdminPageClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>(fallbackProducts.map(fallbackToAdminProduct));
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [userForms, setUserForms] = useState<UserFormState>({});
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productSaving, setProductSaving] = useState(false);
  const [productError, setProductError] = useState('');
  const [userSavingId, setUserSavingId] = useState<string | null>(null);
  const [userError, setUserError] = useState('');
  const [orderSavingId, setOrderSavingId] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [attempt, setAttempt] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [apiMode, setApiMode] = useState<'real' | 'legacy' | 'demo'>('demo');

  function applyAdminUsers(users: AdminUser[]) {
    setAdminUsers(users);
    setUserForms(Object.fromEntries(users.map(user => [user.id, {
      name: user.name ?? '',
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    }])));
  }

  async function loadRealAdminData() {
    const [remoteOrders, remoteProducts, remoteUsers] = await Promise.all([fetchAdminOrders(), fetchAdminProducts(), fetchAdminUsers()]);
    setOrders(remoteOrders);
    setAdminProducts(remoteProducts);
    applyAdminUsers(remoteUsers);
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
        const [remoteOrders, remoteProducts, remoteUsers] = await Promise.all([fetchAdminOrders(), fetchAdminProducts(), fetchAdminUsers()]);
        if (cancelled) return;
        setOrders(remoteOrders);
        setAdminProducts(remoteProducts);
        applyAdminUsers(remoteUsers);
        setApiMode('real');
        setUnlocked(true);
      } catch (err) {
        if (cancelled) return;
        if (isAdminApiUnavailable(err)) {
          setOrders(readOrders());
          setAdminProducts(fallbackProducts.map(fallbackToAdminProduct));
          applyAdminUsers([]);
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
      setAdminProducts(fallbackProducts.map(fallbackToAdminProduct));
      applyAdminUsers([]);
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

  const categoryCounts = adminProducts.reduce<Record<string, number>>((counts, product) => {
    counts[product.category] = (counts[product.category] ?? 0) + 1;
    return counts;
  }, {});

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProductSaving(true);
    setProductError('');
    try {
      const payload = formToPayload(productForm);
      const saved = editingProductId
        ? await updateAdminProduct(editingProductId, payload)
        : await createAdminProduct(payload);
      setAdminProducts(current => {
        const exists = current.some(product => product.id === saved.id);
        const next = exists
          ? current.map(product => product.id === saved.id ? saved : product)
          : [saved, ...current];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      setProductForm(emptyProductForm);
      setEditingProductId(null);
    } catch (err) {
      setProductError(err instanceof Error ? err.message : 'Nao foi possivel salvar produto.');
    } finally {
      setProductSaving(false);
    }
  }

  async function toggleProduct(product: AdminProduct) {
    setProductSaving(true);
    setProductError('');
    try {
      const saved = await updateAdminProduct(product.id, { active: !product.active });
      setAdminProducts(current => current.map(item => item.id === saved.id ? saved : item));
    } catch (err) {
      setProductError(err instanceof Error ? err.message : 'Nao foi possivel atualizar produto.');
    } finally {
      setProductSaving(false);
    }
  }

  async function handleOrderStatusChange(order: Order, status: Order['status']) {
    if (order.status === status) return;
    setOrderSavingId(order.id);
    setError('');
    try {
      const saved = await updateAdminOrderStatus(order.id, status);
      setOrders(current => current.map(item => item.id === saved.id ? saved : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel atualizar pedido.');
    } finally {
      setOrderSavingId(null);
    }
  }

  async function handleUserSubmit(event: FormEvent<HTMLFormElement>, user: AdminUser) {
    event.preventDefault();
    const form = userForms[user.id];
    if (!form) return;
    setUserSavingId(user.id);
    setUserError('');
    try {
      const saved = await updateAdminUser(user.id, {
        name: form.name,
        email: form.email,
        role: form.role,
        emailVerified: form.emailVerified,
      });
      setAdminUsers(current => current.map(item => item.id === saved.id ? saved : item));
      setUserForms(current => ({
        ...current,
        [saved.id]: {
          name: saved.name ?? '',
          email: saved.email,
          role: saved.role,
          emailVerified: saved.emailVerified,
        },
      }));
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Nao foi possivel salvar cliente.');
    } finally {
      setUserSavingId(null);
    }
  }

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
        applyAdminUsers([]);
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
              <p>{adminProducts.length} itens cadastrados</p>
            </div>
            <div className="info-block">
              <h2>Clientes</h2>
              <p>{adminUsers.length} contas reais</p>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <select
                          value={order.status}
                          onChange={event => handleOrderStatusChange(order, event.target.value as Order['status'])}
                          disabled={orderSavingId === order.id || apiMode !== 'real'}
                          aria-label={`Status do pedido ${order.id}`}
                        >
                          <option value="pending">Pendente</option>
                          <option value="paid">Pago</option>
                          <option value="fulfilled">Enviado</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                        <div className="price">{formatPrice(order.total)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Nenhum pedido criado ainda. Finalize um checkout para alimentar este painel.</p>
              )}
            </section>

            <section className="info-block">
              <h2>Clientes</h2>
              {userError ? <p style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 11, marginBottom: 16 }}>{userError}</p> : null}
              {adminUsers.length ? (
                <div className="summary-items" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 0 }}>
                  {adminUsers.slice(0, 8).map(user => {
                    const form = userForms[user.id] ?? { name: user.name ?? '', email: user.email, role: user.role, emailVerified: user.emailVerified };
                    return (
                      <form className="summary-item" style={{ gridTemplateColumns: '1fr', gap: 16 }} key={user.id} onSubmit={event => handleUserSubmit(event, user)}>
                        <div>
                          <h5>{user.email}</h5>
                          <div className="meta">{user.role} - {user.emailVerified ? 'email verificado' : 'email pendente'} - {user.orders.length} pedidos</div>
                        </div>
                        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                          <div className="field">
                            <label htmlFor={`admin-user-name-${user.id}`}>Nome</label>
                            <input
                              id={`admin-user-name-${user.id}`}
                              value={form.name}
                              onChange={event => setUserForms(current => ({ ...current, [user.id]: { ...form, name: event.target.value } }))}
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`admin-user-email-${user.id}`}>Email</label>
                            <input
                              id={`admin-user-email-${user.id}`}
                              type="email"
                              value={form.email}
                              onChange={event => setUserForms(current => ({ ...current, [user.id]: { ...form, email: event.target.value } }))}
                              required
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`admin-user-role-${user.id}`}>Role</label>
                            <select
                              id={`admin-user-role-${user.id}`}
                              value={form.role}
                              onChange={event => setUserForms(current => ({ ...current, [user.id]: { ...form, role: event.target.value as AdminRole } }))}
                            >
                              <option value="CUSTOMER">Cliente</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          </div>
                        </div>
                        <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                          <input
                            type="checkbox"
                            checked={form.emailVerified}
                            onChange={event => setUserForms(current => ({ ...current, [user.id]: { ...form, emailVerified: event.target.checked } }))}
                          />
                          Email verificado
                        </label>
                        {user.addresses.length ? (
                          <div>
                            <div className="meta" style={{ marginBottom: 8 }}>Enderecos</div>
                            {user.addresses.slice(0, 3).map(address => (
                              <p key={address.id} style={{ marginBottom: 6 }}>{address.recipient} - {address.street} - {address.city}/{address.region} - {address.postalCode}</p>
                            ))}
                          </div>
                        ) : null}
                        {user.orders.length ? (
                          <div>
                            <div className="meta" style={{ marginBottom: 8 }}>Pedidos do cliente</div>
                            {user.orders.slice(0, 4).map(order => (
                              <p key={order.id} style={{ marginBottom: 6 }}>{order.id} - {order.status.toUpperCase()} - {formatPrice(order.total)}</p>
                            ))}
                          </div>
                        ) : null}
                        <div>
                          <button type="submit" className="btn btn-primary" disabled={userSavingId === user.id || apiMode !== 'real'}>
                            {userSavingId === user.id ? 'Salvando...' : 'Salvar cliente'}
                          </button>
                        </div>
                      </form>
                    );
                  })}
                </div>
              ) : (
                <p>{apiMode === 'real' ? 'Nenhum cliente cadastrado ainda.' : 'Clientes reais aparecem aqui quando o admin estiver conectado ao PostgreSQL.'}</p>
              )}
            </section>

            <section className="info-block">
              <h2>Catalogo admin</h2>
              <form className="form-block account-form" onSubmit={handleProductSubmit} style={{ marginBottom: 28 }}>
                <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  <div className="field">
                    <label htmlFor="admin-product-id">ID</label>
                    <input
                      id="admin-product-id"
                      value={productForm.id}
                      onChange={event => setProductForm(current => ({ ...current, id: event.target.value }))}
                      disabled={Boolean(editingProductId)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="admin-product-slug">Slug</label>
                    <input
                      id="admin-product-slug"
                      value={productForm.slug}
                      onChange={event => setProductForm(current => ({ ...current, slug: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="admin-product-category">Categoria</label>
                    <select
                      id="admin-product-category"
                      value={productForm.category}
                      onChange={event => setProductForm(current => ({ ...current, category: event.target.value }))}
                    >
                      <option value="sneakers">Tenis</option>
                      <option value="apparel">Vestuario</option>
                      <option value="accessories">Acessorios</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="admin-product-name">Nome</label>
                    <input
                      id="admin-product-name"
                      value={productForm.name}
                      onChange={event => setProductForm(current => ({ ...current, name: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="admin-product-brand">Marca</label>
                    <input
                      id="admin-product-brand"
                      value={productForm.brand}
                      onChange={event => setProductForm(current => ({ ...current, brand: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="admin-product-price">Preco</label>
                    <input
                      id="admin-product-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={productForm.price}
                      onChange={event => setProductForm(current => ({ ...current, price: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="admin-product-old-price">Preco antigo</label>
                    <input
                      id="admin-product-old-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={productForm.oldPrice}
                      onChange={event => setProductForm(current => ({ ...current, oldPrice: event.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="admin-product-discount">Desconto %</label>
                    <input
                      id="admin-product-discount"
                      type="number"
                      min="0"
                      max="100"
                      value={productForm.discount}
                      onChange={event => setProductForm(current => ({ ...current, discount: event.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="admin-product-image">Imagem principal</label>
                    <input
                      id="admin-product-image"
                      value={productForm.image}
                      onChange={event => setProductForm(current => ({ ...current, image: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="admin-product-images">Galeria</label>
                    <input
                      id="admin-product-images"
                      value={productForm.images}
                      onChange={event => setProductForm(current => ({ ...current, images: event.target.value }))}
                      placeholder="URLs separadas por virgula"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="admin-product-colors">Cores</label>
                    <input
                      id="admin-product-colors"
                      value={productForm.colors}
                      onChange={event => setProductForm(current => ({ ...current, colors: event.target.value }))}
                      placeholder="#0a0a0a, #ffffff"
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="admin-product-sizes">Tamanhos</label>
                    <input
                      id="admin-product-sizes"
                      value={productForm.sizes}
                      onChange={event => setProductForm(current => ({ ...current, sizes: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="admin-product-badge">Selo</label>
                    <input
                      id="admin-product-badge"
                      value={productForm.badge}
                      onChange={event => setProductForm(current => ({ ...current, badge: event.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="admin-product-tag">Tag</label>
                    <input
                      id="admin-product-tag"
                      value={productForm.tag}
                      onChange={event => setProductForm(current => ({ ...current, tag: event.target.value }))}
                      required
                    />
                  </div>
                </div>
                <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                  <input
                    type="checkbox"
                    checked={productForm.active}
                    onChange={event => setProductForm(current => ({ ...current, active: event.target.checked }))}
                  />
                  Produto ativo na loja
                </label>
                {productError ? <p style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 11, marginTop: 12 }}>{productError}</p> : null}
                {apiMode !== 'real' ? <p className="meta" style={{ marginTop: 12 }}>Entre como ADMIN real para salvar produtos no PostgreSQL.</p> : null}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
                  <button type="submit" className="btn btn-primary" disabled={productSaving || apiMode !== 'real'}>
                    {productSaving ? 'Salvando...' : editingProductId ? 'Salvar produto' : 'Criar produto'}
                  </button>
                  {editingProductId ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setProductForm(emptyProductForm);
                        setEditingProductId(null);
                        setProductError('');
                      }}
                    >
                      Cancelar edicao
                    </button>
                  ) : null}
                </div>
              </form>
              <div className="summary-items" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 0 }}>
                {adminProducts.slice(0, 12).map(product => (
                  <div className="summary-item" style={{ gridTemplateColumns: '1fr auto' }} key={product.id}>
                    <div>
                      <h5>{product.name}</h5>
                      <div className="meta">{product.brand} · {product.category}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <div className="price">{formatPrice(product.price)}</div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setProductForm(productToForm(product));
                          setEditingProductId(product.id);
                          setProductError('');
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => toggleProduct(product)}
                        disabled={productSaving || apiMode !== 'real'}
                      >
                        {product.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
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
