'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ActionButton, EmptyState, PageHeader, SectionCard, StatCard, StatusBadge } from '@/components/operational';
import { getInfoHref } from '@/services/infoPages';
import { formatPrice, products as fallbackProducts } from '@/services/products';
import { readOrders } from '@/services/orders';
import {
  createAdminProduct,
  createAdminCoupon,
  fetchAdminCoupons,
  fetchAdminUsers,
  importAdminProducts,
  fetchAdminOrders,
  fetchAdminProducts,
  fetchAdminSettings,
  fetchAdminAuditLogs,
  fetchNewsletterSubscribers,
  getAdminMe,
  isAdminApiUnavailable,
  legacyUnlock,
  previewAdminProductImport,
  resendAdminOrderConfirmation,
  resendAdminUserVerification,
  updateAdminCoupon,
  updateAdminOrderShipping,
  updateAdminOrderStatus,
  updateAdminProduct,
  updateAdminUser,
  updateNewsletterSubscriber,
  uploadAdminProductImage,
  type AdminCoupon,
  type AdminRole,
  type AdminSettings,
  type AdminAuditLog,
  type AdminUser,
  type AdminProductImportPreview,
  type NewsletterSubscriber,
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

const emptyCouponForm = {
  code: '',
  discountType: 'PERCENT',
  discountValue: '',
  maxRedemptions: '',
  active: true,
};

type ProductFormState = typeof emptyProductForm;
type CouponFormState = typeof emptyCouponForm;
type UserFormState = Record<string, { name: string; email: string; role: AdminRole; emailVerified: boolean }>;
export type AdminSection = 'overview' | 'orders' | 'customers' | 'products' | 'payments' | 'shipping' | 'coupons' | 'newsletter' | 'settings' | 'logs';

const ADMIN_SECTIONS: Array<{ key: AdminSection; label: string; description: string }> = [
  { key: 'overview', label: 'Visão geral', description: 'Resumo da loja' },
  { key: 'orders', label: 'Pedidos', description: 'Status e envio' },
  { key: 'customers', label: 'Clientes', description: 'Contas e endereços' },
  { key: 'products', label: 'Produtos', description: 'Catálogo e imagens' },
  { key: 'payments', label: 'Pagamentos', description: 'Mercado Pago' },
  { key: 'shipping', label: 'Frete', description: 'Melhor Envio' },
  { key: 'coupons', label: 'Cupons', description: 'Promoções' },
  { key: 'newsletter', label: 'Newsletter', description: 'Inscritos' },
  { key: 'settings', label: 'Configurações', description: 'Integrações' },
  { key: 'logs', label: 'Logs', description: 'Auditoria básica' },
];

const ADMIN_SECTION_HREFS: Record<AdminSection, string> = {
  overview: '/admin/dashboard',
  orders: '/admin/orders',
  customers: '/admin/customers',
  products: '/admin/products',
  payments: '/admin/payments',
  shipping: '/admin/shipping',
  coupons: '/admin/coupons',
  newsletter: '/admin/newsletter',
  settings: '/admin/settings',
  logs: '/admin/logs',
};

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

function importRowToForm(product: AdminProductImportPreview['preview']['rows'][number]['product']): ProductFormState {
  return {
    id: product.id ?? '',
    slug: product.slug ?? product.id ?? '',
    name: product.name ?? '',
    category: product.category ?? 'apparel',
    brand: product.brand ?? 'VOLKERR',
    price: product.price ? String(product.price) : '',
    oldPrice: product.oldPrice ? String(product.oldPrice) : '',
    badge: product.badge ?? '',
    discount: product.discount !== null && product.discount !== undefined ? String(product.discount) : '',
    colors: Array.isArray(product.colors) && product.colors.length ? product.colors.join(', ') : '#0a0a0a',
    image: product.image ?? '',
    images: Array.isArray(product.images) ? product.images.join(', ') : '',
    sizes: Array.isArray(product.sizes) && product.sizes.length ? product.sizes.join(', ') : 'P, M, G',
    tag: product.tag ?? 'imported',
    active: false,
  };
}

function couponToPayload(form: CouponFormState) {
  const discountValue = form.discountType === 'FIXED'
    ? Math.round(Number(form.discountValue) * 100)
    : Number(form.discountValue);
  return {
    code: form.code,
    discountType: form.discountType as AdminCoupon['discountType'],
    discountValue,
    maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
    active: form.active,
  };
}

export function AdminPageClient({ initialSection = 'overview' }: { initialSection?: AdminSection } = {}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>(fallbackProducts.map(fallbackToAdminProduct));
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminCoupons, setAdminCoupons] = useState<AdminCoupon[]>([]);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [adminAuditLogs, setAdminAuditLogs] = useState<AdminAuditLog[]>([]);
  const [userForms, setUserForms] = useState<UserFormState>({});
  const [couponForm, setCouponForm] = useState<CouponFormState>(emptyCouponForm);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productSaving, setProductSaving] = useState(false);
  const [productUploading, setProductUploading] = useState(false);
  const [productError, setProductError] = useState('');
  const [productImportPreview, setProductImportPreview] = useState<AdminProductImportPreview | null>(null);
  const [productImportFile, setProductImportFile] = useState<{ filename: string; csv: string } | null>(null);
  const [productImportLoading, setProductImportLoading] = useState(false);
  const [productImportError, setProductImportError] = useState('');
  const [productImportSummary, setProductImportSummary] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [productPage, setProductPage] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerRoleFilter, setCustomerRoleFilter] = useState<'all' | AdminRole>('all');
  const [customerEmailFilter, setCustomerEmailFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [customerPage, setCustomerPage] = useState(1);
  const [auditLogSearch, setAuditLogSearch] = useState('');
  const [auditLogPage, setAuditLogPage] = useState(1);
  const [couponSearch, setCouponSearch] = useState('');
  const [couponStatusFilter, setCouponStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [newsletterSearch, setNewsletterSearch] = useState('');
  const [newsletterStatusFilter, setNewsletterStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [userSavingId, setUserSavingId] = useState<string | null>(null);
  const [userVerificationSendingId, setUserVerificationSendingId] = useState<string | null>(null);
  const [userError, setUserError] = useState('');
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [newsletterSavingId, setNewsletterSavingId] = useState<string | null>(null);
  const [orderSavingId, setOrderSavingId] = useState<string | null>(null);
  const [orderEmailSendingId, setOrderEmailSendingId] = useState<string | null>(null);
  const [orderShippingSavingId, setOrderShippingSavingId] = useState<string | null>(null);
  const [orderTrackingDrafts, setOrderTrackingDrafts] = useState<Record<string, string>>({});
  const [adminOrderSearch, setAdminOrderSearch] = useState('');
  const [adminOrderStatusFilter, setAdminOrderStatusFilter] = useState<'all' | Order['status']>('all');
  const [adminOrderPage, setAdminOrderPage] = useState(1);
  const [unlocked, setUnlocked] = useState(false);
  const [attempt, setAttempt] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [apiMode, setApiMode] = useState<'real' | 'legacy' | 'demo'>('demo');
  const [activeSection, setActiveSection] = useState<AdminSection>(initialSection);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

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
    const [remoteOrders, remoteProducts, remoteUsers, remoteCoupons, remoteNewsletter, remoteSettings, remoteAuditLogs] = await Promise.all([
      fetchAdminOrders(),
      fetchAdminProducts(),
      fetchAdminUsers(),
      fetchAdminCoupons(),
      fetchNewsletterSubscribers(),
      fetchAdminSettings(),
      fetchAdminAuditLogs(),
    ]);
    setOrders(remoteOrders);
    setAdminProducts(remoteProducts);
    applyAdminUsers(remoteUsers);
    setAdminCoupons(remoteCoupons);
    setNewsletterSubscribers(remoteNewsletter);
    setAdminSettings(remoteSettings);
    setAdminAuditLogs(remoteAuditLogs);
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
        const [remoteOrders, remoteProducts, remoteUsers, remoteCoupons, remoteNewsletter, remoteSettings] = await Promise.all([
          fetchAdminOrders(),
          fetchAdminProducts(),
          fetchAdminUsers(),
          fetchAdminCoupons(),
          fetchNewsletterSubscribers(),
          fetchAdminSettings(),
        ]);
        if (cancelled) return;
        setOrders(remoteOrders);
        setAdminProducts(remoteProducts);
        applyAdminUsers(remoteUsers);
        setAdminCoupons(remoteCoupons);
        setNewsletterSubscribers(remoteNewsletter);
        setAdminSettings(remoteSettings);
        setApiMode('real');
        setUnlocked(true);
      } catch (err) {
        if (cancelled) return;
        if (isAdminApiUnavailable(err)) {
          setOrders(readOrders());
          setAdminProducts(fallbackProducts.map(fallbackToAdminProduct));
          applyAdminUsers([]);
          setAdminCoupons([]);
          setNewsletterSubscribers([]);
          setAdminSettings(null);
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
      setAdminCoupons([]);
      setNewsletterSubscribers([]);
      setAdminSettings(null);
      setAdminAuditLogs([]);
      setApiMode('demo');
      setError('Nao foi possivel atualizar dados reais agora. Exibindo fallback demo.');
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    const revenue = orders.reduce((sum, order) => sum + order.total, 0);
    const pending = orders.filter(order => order.status === 'pending').length;
    const paid = orders.filter(order => order.status === 'paid' || order.paymentStatus === 'approved').length;
    const shipped = orders.filter(order => ['shipped', 'fulfilled', 'delivered'].includes(order.status)).length;
    const units = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
    const averageTicket = orders.length ? revenue / orders.length : 0;

    return { revenue, pending, paid, shipped, units, averageTicket };
  }, [orders]);

  const topProducts = useMemo(() => {
    const counts = new Map<string, { quantity: number; revenue: number }>();
    orders.forEach(order => {
      order.items.forEach(item => {
        const current = counts.get(item.productId) ?? { quantity: 0, revenue: 0 };
        current.quantity += item.quantity;
        current.revenue += (item.unitPrice ?? 0) * item.quantity;
        counts.set(item.productId, current);
      });
    });
    return Array.from(counts.entries())
      .map(([productId, value]) => {
        const product = adminProducts.find(item => item.id === productId || item.slug === productId);
        return {
          productId,
          name: product?.name ?? productId,
          ...value,
        };
      })
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [adminProducts, orders]);

  const adminOrderPageSize = 8;
  const filteredAdminOrders = useMemo(() => {
    const query = adminOrderSearch.trim().toLowerCase();
    return orders.filter(order => {
      const matchesStatus = adminOrderStatusFilter === 'all' || order.status === adminOrderStatusFilter;
      const itemText = order.items.map(item => `${item.productId} ${item.name ?? ''}`).join(' ');
      const matchesQuery = !query || [
        order.id,
        order.status,
        order.paymentStatus,
        order.paymentPreferenceId,
        order.contact?.name,
        order.contact?.email,
        itemText,
      ].some(value => String(value || '').toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [adminOrderSearch, adminOrderStatusFilter, orders]);

  const adminOrderPageCount = Math.max(1, Math.ceil(filteredAdminOrders.length / adminOrderPageSize));
  const visibleAdminOrders = filteredAdminOrders.slice(
    (adminOrderPage - 1) * adminOrderPageSize,
    adminOrderPage * adminOrderPageSize,
  );

  useEffect(() => {
    setAdminOrderPage(1);
  }, [adminOrderSearch, adminOrderStatusFilter, orders.length]);

  const categoryCounts = adminProducts.reduce<Record<string, number>>((counts, product) => {
    counts[product.category] = (counts[product.category] ?? 0) + 1;
    return counts;
  }, {});

  const filteredAdminProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return adminProducts.filter(product => {
      const matchesStatus = productStatusFilter === 'all'
        || (productStatusFilter === 'active' && product.active)
        || (productStatusFilter === 'inactive' && !product.active);
      const matchesQuery = !query || [
        product.id,
        product.slug,
        product.name,
        product.brand,
        product.category,
      ].some(value => String(value || '').toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [adminProducts, productSearch, productStatusFilter]);

  const productPageSize = 12;
  const productPageCount = Math.max(1, Math.ceil(filteredAdminProducts.length / productPageSize));
  const visibleAdminProducts = filteredAdminProducts.slice(
    (productPage - 1) * productPageSize,
    productPage * productPageSize,
  );

  useEffect(() => {
    setProductPage(1);
  }, [productSearch, productStatusFilter, adminProducts.length]);

  const customerPageSize = 6;
  const filteredAdminUsers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    return adminUsers.filter(user => {
      const matchesRole = customerRoleFilter === 'all' || user.role === customerRoleFilter;
      const matchesEmail = customerEmailFilter === 'all'
        || (customerEmailFilter === 'verified' && user.emailVerified)
        || (customerEmailFilter === 'pending' && !user.emailVerified);
      const addressText = user.addresses.map(address => `${address.recipient} ${address.street} ${address.city} ${address.postalCode}`).join(' ');
      const orderText = user.orders.map(order => `${order.id} ${order.status}`).join(' ');
      const matchesQuery = !query || [
        user.name,
        user.email,
        user.role,
        addressText,
        orderText,
      ].some(value => String(value || '').toLowerCase().includes(query));
      return matchesRole && matchesEmail && matchesQuery;
    });
  }, [adminUsers, customerEmailFilter, customerRoleFilter, customerSearch]);

  const customerPageCount = Math.max(1, Math.ceil(filteredAdminUsers.length / customerPageSize));
  const visibleAdminUsers = filteredAdminUsers.slice(
    (customerPage - 1) * customerPageSize,
    customerPage * customerPageSize,
  );

  useEffect(() => {
    setCustomerPage(1);
  }, [adminUsers.length, customerEmailFilter, customerRoleFilter, customerSearch]);

  const auditLogPageSize = 12;
  const filteredAuditLogs = useMemo(() => {
    const query = auditLogSearch.trim().toLowerCase();
    if (!query) return adminAuditLogs;
    return adminAuditLogs.filter(log => [
      log.action,
      log.adminEmail,
      log.adminUserId,
      log.targetType,
      log.targetId,
    ].some(value => String(value || '').toLowerCase().includes(query)));
  }, [adminAuditLogs, auditLogSearch]);
  const auditLogPageCount = Math.max(1, Math.ceil(filteredAuditLogs.length / auditLogPageSize));
  const visibleAuditLogs = filteredAuditLogs.slice(
    (auditLogPage - 1) * auditLogPageSize,
    auditLogPage * auditLogPageSize,
  );

  useEffect(() => {
    setAuditLogPage(1);
  }, [adminAuditLogs.length, auditLogSearch]);

  const filteredAdminCoupons = useMemo(() => {
    const query = couponSearch.trim().toLowerCase();
    return adminCoupons.filter(coupon => {
      const matchesStatus = couponStatusFilter === 'all'
        || (couponStatusFilter === 'active' && coupon.active)
        || (couponStatusFilter === 'inactive' && !coupon.active);
      const matchesQuery = !query || [
        coupon.code,
        coupon.discountType,
        coupon.discountValue,
        coupon.redeemedCount,
      ].some(value => String(value || '').toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [adminCoupons, couponSearch, couponStatusFilter]);

  const filteredNewsletterSubscribers = useMemo(() => {
    const query = newsletterSearch.trim().toLowerCase();
    return newsletterSubscribers.filter(subscriber => {
      const matchesStatus = newsletterStatusFilter === 'all'
        || (newsletterStatusFilter === 'active' && subscriber.isActive)
        || (newsletterStatusFilter === 'inactive' && !subscriber.isActive);
      const matchesQuery = !query || [
        subscriber.email,
        subscriber.source,
      ].some(value => String(value || '').toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [newsletterSearch, newsletterStatusFilter, newsletterSubscribers]);

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

  async function handleProductImageUpload(file: File | null) {
    if (!file) return;
    setProductUploading(true);
    setProductError('');
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Nao foi possivel ler a imagem.'));
        reader.readAsDataURL(file);
      });
      const uploaded = await uploadAdminProductImage({ filename: file.name, dataUrl });
      const imageUrl = uploaded.url.startsWith('http') ? uploaded.url : `${window.location.origin}${uploaded.url}`;
      setProductForm(current => ({
        ...current,
        image: imageUrl,
        images: current.images ? `${current.images}, ${imageUrl}` : imageUrl,
      }));
    } catch (err) {
      setProductError(err instanceof Error ? err.message : 'Nao foi possivel enviar imagem.');
    } finally {
      setProductUploading(false);
    }
  }

  async function handleProductImportPreview(file: File | null) {
    if (!file) return;
    setProductImportLoading(true);
    setProductImportError('');
    setProductImportSummary('');
    setProductImportPreview(null);
    setProductImportFile(null);
    try {
      const csv = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Nao foi possivel ler o CSV.'));
        reader.readAsText(file, 'utf-8');
      });
      const preview = await previewAdminProductImport({ filename: file.name, csv });
      setProductImportFile({ filename: file.name, csv });
      setProductImportPreview(preview);
      const firstValid = preview.preview.rows.find(row => row.status === 'valid');
      if (firstValid) setProductForm(importRowToForm(firstValid.product));
    } catch (err) {
      setProductImportError(err instanceof Error ? err.message : 'Nao foi possivel analisar o CSV.');
    } finally {
      setProductImportLoading(false);
    }
  }

  async function handleProductImportCommit() {
    if (!productImportFile) return;
    setProductImportLoading(true);
    setProductImportError('');
    setProductImportSummary('');
    try {
      const result = await importAdminProducts(productImportFile);
      setProductImportSummary(`${result.createdCount} produto(s) importado(s). ${result.failedCount} linha(s) exigem revisao.`);
      const createdProducts = result.results
        .filter(row => row.status === 'created')
        .map(row => row.product)
        .filter((product): product is AdminProduct => Boolean(product.id && product.name));
      if (createdProducts.length) {
        setAdminProducts(current => {
          const byId = new Map(current.map(product => [product.id, product]));
          createdProducts.forEach(product => byId.set(product.id, product));
          return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
        });
      }
    } catch (err) {
      setProductImportError(err instanceof Error ? err.message : 'Nao foi possivel importar o CSV.');
    } finally {
      setProductImportLoading(false);
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

  async function handleResendOrderConfirmation(order: Order) {
    setOrderEmailSendingId(order.id);
    setError('');
    try {
      const result = await resendAdminOrderConfirmation(order.id);
      setError(result.email?.sent === false
        ? 'Email nao enviado. Confira SMTP e logs.'
        : 'Confirmacao do pedido reenviada para o cliente.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel reenviar a confirmacao.');
    } finally {
      setOrderEmailSendingId(null);
    }
  }

  async function handleOrderShippingUpdate(order: Order) {
    const trackingCode = (orderTrackingDrafts[order.id] ?? order.trackingCode ?? '').trim();
    if (!trackingCode) {
      setError('Informe o codigo de rastreio antes de marcar como enviado.');
      return;
    }
    setOrderShippingSavingId(order.id);
    setError('');
    try {
      const result = await updateAdminOrderShipping(order.id, trackingCode);
      setOrders(current => current.map(item => item.id === result.order.id ? result.order : item));
      setError(result.email?.sent === false
        ? 'Pedido marcado como enviado, mas o email de envio falhou.'
        : 'Pedido marcado como enviado e email de rastreio disparado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel atualizar o envio.');
    } finally {
      setOrderShippingSavingId(null);
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

  async function handleResendUserVerification(user: AdminUser) {
    setUserVerificationSendingId(user.id);
    setUserError('');
    try {
      const result = await resendAdminUserVerification(user.id);
      if (result.email?.reason === 'already_verified') {
        setUserError('Este cliente ja esta com email verificado.');
      } else {
        setUserError(result.email?.sent === false
          ? 'Email de verificacao nao enviado. Confira SMTP e logs.'
          : 'Verificacao reenviada para o cliente.');
      }
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Nao foi possivel reenviar a verificacao.');
    } finally {
      setUserVerificationSendingId(null);
    }
  }

  async function handleCouponSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCouponSaving(true);
    setCouponError('');
    try {
      const saved = await createAdminCoupon(couponToPayload(couponForm));
      setAdminCoupons(current => [saved, ...current.filter(coupon => coupon.id !== saved.id)]);
      setCouponForm(emptyCouponForm);
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'Nao foi possivel salvar cupom.');
    } finally {
      setCouponSaving(false);
    }
  }

  async function toggleCoupon(coupon: AdminCoupon) {
    setCouponSaving(true);
    setCouponError('');
    try {
      const saved = await updateAdminCoupon(coupon.id, { ...coupon, active: !coupon.active });
      setAdminCoupons(current => current.map(item => item.id === saved.id ? saved : item));
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'Nao foi possivel atualizar cupom.');
    } finally {
      setCouponSaving(false);
    }
  }

  async function toggleNewsletter(subscriber: NewsletterSubscriber) {
    setNewsletterSavingId(subscriber.id);
    setError('');
    try {
      const saved = await updateNewsletterSubscriber(subscriber.id, { isActive: !subscriber.isActive });
      setNewsletterSubscribers(current => current.map(item => item.id === saved.id ? saved : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel atualizar newsletter.');
    } finally {
      setNewsletterSavingId(null);
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
        setAdminCoupons([]);
        setNewsletterSubscribers([]);
        setAdminSettings(null);
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

        <PageHeader
          eyebrow="PAINEL ADMIN"
          title={<>Controle <span className="red">Velkor.</span></>}
          description={apiMode === 'real' ? 'Dados administrativos carregados com sessao real protegida.' : 'Fallback administrativo temporario para validacao e rollback controlado.'}
          actions={(
            <>
              <StatusBadge tone={apiMode === 'real' ? 'success' : 'warning'}>{apiMode}</StatusBadge>
              <ActionButton type="button" tone="secondary" onClick={refreshAdminData} loading={loading}>
                Atualizar
              </ActionButton>
              <Link href="/shop" className="btn btn-primary">Ver loja</Link>
            </>
          )}
        />

        <section className="info-hero admin-legacy-hero" hidden>
          <div>
            <div className="section-num">PAINEL ADMIN</div>
            <h1>Controle <span className="red">Velkor.</span></h1>
            <p>{apiMode === 'real' ? 'Dados administrativos carregados com sessao real protegida.' : 'Fallback administrativo temporario para validacao e rollback controlado.'}</p>
          </div>
          <div className="admin-legacy-actions">
            <button type="button" className="btn btn-secondary" onClick={refreshAdminData} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
            <Link href="/shop" className="btn btn-primary">Ver loja</Link>
          </div>
        </section>

        <section className="admin-stat-grid admin-stats-section">
          <StatCard label="Receita" value={formatPrice(totals.revenue)} tone={totals.revenue > 0 ? 'success' : 'default'} />
          <StatCard label="Pedidos" value={orders.length} hint={`${totals.pending} pendentes`} />
          <StatCard label="Produtos" value={adminProducts.length} hint="itens cadastrados" />
          <StatCard label="Clientes" value={adminUsers.length} hint="contas reais" />
          <StatCard label="Unidades vendidas" value={totals.units} hint={apiMode === 'real' ? 'registradas' : 'storage local'} />
        </section>

        {error ? (
          <section className="info-content admin-content-error">
            <p className="admin-error-notice">{error}</p>
          </section>
        ) : null}

        <section className="info-content" hidden>
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
              <h4>Area admin</h4>
              {ADMIN_SECTIONS.map(section => (
                <Link
                  key={section.key}
                  href={ADMIN_SECTION_HREFS[section.key]}
                  className={`admin-nav-button${activeSection === section.key ? ' active' : ''}`}
                  scroll={false}
                  onClick={() => setActiveSection(section.key)}
                >
                  <strong>{section.label}</strong>
                  <span>{section.description}</span>
                </Link>
              ))}
            </div>
            <div>
              <h4>Atalhos</h4>
              <Link href="/shop?cat=sneakers">Tenis ({categoryCounts.sneakers ?? 0})</Link>
              <Link href="/checkout">Checkout</Link>
              <Link href={getInfoHref('track-order')}>Rastreio</Link>
            </div>
          </aside>

          <article className="info-content">
            {activeSection === 'overview' ? (
            <SectionCard
              title="Pulso da operação"
              description="Resumo rápido para abrir o painel e entender o que precisa de atenção."
              className="admin-dashboard-pulse"
            >
              <div className="admin-pulse-grid">
                <div>
                  <span>Backend</span>
                  <StatusBadge tone={apiMode === 'real' ? 'success' : 'warning'}>{apiMode === 'real' ? 'Online' : 'Fallback'}</StatusBadge>
                </div>
                <div>
                  <span>Mercado Pago</span>
                  <StatusBadge tone={adminSettings?.integrations.mercadoPago.configured ? 'success' : 'warning'}>
                    {adminSettings?.integrations.mercadoPago.configured ? 'Configurado' : 'Pendente'}
                  </StatusBadge>
                </div>
                <div>
                  <span>SMTP</span>
                  <StatusBadge tone={adminSettings?.integrations.email.configured ? 'success' : 'warning'}>
                    {adminSettings?.integrations.email.configured ? 'Configurado' : 'Pendente'}
                  </StatusBadge>
                </div>
                <div>
                  <span>Melhor Envio</span>
                  <StatusBadge tone={adminSettings?.integrations.melhorEnvio.configured ? 'success' : 'warning'}>
                    {adminSettings?.integrations.melhorEnvio.configured ? 'Configurado' : 'Pendente'}
                  </StatusBadge>
                </div>
              </div>
              {topProducts.length ? (
                <div className="admin-top-products">
                  <h3>Produtos mais vendidos</h3>
                  {topProducts.map(product => (
                    <div key={product.productId}>
                      <strong>{product.name}</strong>
                      <span>{product.quantity} un. - {formatPrice(product.revenue)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </SectionCard>
            ) : null}

            {['overview', 'orders'].includes(activeSection) ? (
            <SectionCard
              title="Pedidos recentes"
              description="Acompanhe, filtre e atualize o status de todos os pedidos da loja."
              actions={
                <span className="admin-section-count">
                  {orders.length} pedido(s)
                </span>
              }
            >
              {orders.length ? (
                <>
                <div className="account-list-tools" aria-label="Filtros de pedidos do admin">
                  <input
                    value={adminOrderSearch}
                    onChange={event => setAdminOrderSearch(event.target.value)}
                    placeholder="Buscar por pedido, cliente, email ou produto"
                    aria-label="Buscar pedidos"
                  />
                  <select
                    value={adminOrderStatusFilter}
                    onChange={event => setAdminOrderStatusFilter(event.target.value as 'all' | Order['status'])}
                    aria-label="Filtrar status dos pedidos"
                  >
                    <option value="all">Todos os status</option>
                    <option value="pending">Pendentes</option>
                    <option value="paid">Pagos</option>
                    <option value="fulfilled">Enviados</option>
                    <option value="cancelled">Cancelados</option>
                  </select>
                </div>
                {visibleAdminOrders.length ? (
                <div className="summary-items summary-items-flush">
                  {visibleAdminOrders.map(order => (
                    <div className="summary-item admin-order-item" key={order.id}>
                      <div>
                        <h5>{order.id}</h5>
                        <div className="admin-order-context">
                          <span>{order.contact?.name || 'Cliente sem nome'}</span>
                          <span>{order.contact?.email || 'email não informado'}</span>
                          <span>{order.items.length} item(ns)</span>
                          <span>{order.shipping || 'frete não informado'} - {formatPrice(order.shippingCost)}</span>
                        </div>
                        <div className="admin-order-context">
                          <span>{order.address?.city || 'cidade n/a'}{order.address?.region ? `/${order.address.region}` : ''}</span>
                          <span>Subtotal {formatPrice(order.subtotal)}</span>
                          {order.discount > 0 ? <span>Desconto {formatPrice(order.discount)}</span> : null}
                          {order.trackingCode ? <span>Rastreio {order.trackingCode}</span> : null}
                        </div>
                        <div className="meta">{order.status.toUpperCase()} · {new Date(order.createdAt).toLocaleDateString('pt-BR')}</div>
                      </div>
                      <div className="admin-order-actions">
                        <StatusBadge tone={order.paymentStatus === 'approved' ? 'success' : order.paymentStatus === 'rejected' ? 'danger' : 'warning'}>
                          Pagamento {order.paymentStatus || 'pending'}
                        </StatusBadge>
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
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleResendOrderConfirmation(order)}
                          disabled={orderEmailSendingId === order.id || apiMode !== 'real'}
                        >
                          {orderEmailSendingId === order.id ? 'Enviando...' : 'Reenviar email'}
                        </button>
                        <input
                          value={orderTrackingDrafts[order.id] ?? order.trackingCode ?? ''}
                          onChange={event => setOrderTrackingDrafts(current => ({ ...current, [order.id]: event.target.value }))}
                          placeholder="Código de rastreio"
                          aria-label={`Código de rastreio do pedido ${order.id}`}
                          className="admin-tracking-input"
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleOrderShippingUpdate(order)}
                          disabled={orderShippingSavingId === order.id || apiMode !== 'real'}
                        >
                          {orderShippingSavingId === order.id ? 'Salvando...' : 'Marcar enviado'}
                        </button>
                        <div className="price">{formatPrice(order.total)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                ) : (
                  <EmptyState
                    title="Nenhum pedido encontrado"
                    description="Ajuste a busca ou limpe o filtro de status para ver mais pedidos."
                  />
                )}
                {adminOrderPageCount > 1 ? (
                  <div className="account-pagination" aria-label="Paginacao de pedidos do admin">
                    <ActionButton
                      type="button"
                      tone="secondary"
                      disabled={adminOrderPage <= 1}
                      onClick={() => setAdminOrderPage(page => Math.max(1, page - 1))}
                    >
                      Anterior
                    </ActionButton>
                    <span>Página {adminOrderPage} de {adminOrderPageCount}</span>
                    <ActionButton
                      type="button"
                      tone="secondary"
                      disabled={adminOrderPage >= adminOrderPageCount}
                      onClick={() => setAdminOrderPage(page => Math.min(adminOrderPageCount, page + 1))}
                    >
                      Próxima
                    </ActionButton>
                  </div>
                ) : null}
                </>
              ) : (
                <p>Nenhum pedido criado ainda. Finalize um checkout para alimentar este painel.</p>
              )}
            </SectionCard>
            ) : null}

            {activeSection === 'customers' ? (
            <SectionCard
              title="Clientes"
              description="Gerencie contas, roles, verificação de email e endereços."
            >
              {userError ? <p className="admin-error-notice">{userError}</p> : null}
              {adminUsers.length ? (
                <>
                <div className="account-list-tools" aria-label="Filtros de clientes do admin">
                  <input
                    value={customerSearch}
                    onChange={event => setCustomerSearch(event.target.value)}
                    placeholder="Buscar por nome, email, endereço ou pedido"
                    aria-label="Buscar clientes"
                  />
                  <select
                    value={customerRoleFilter}
                    onChange={event => setCustomerRoleFilter(event.target.value as 'all' | AdminRole)}
                    aria-label="Filtrar role dos clientes"
                  >
                    <option value="all">Todos os perfis</option>
                    <option value="CUSTOMER">Clientes</option>
                    <option value="ADMIN">Admins</option>
                  </select>
                  <select
                    value={customerEmailFilter}
                    onChange={event => setCustomerEmailFilter(event.target.value as 'all' | 'verified' | 'pending')}
                    aria-label="Filtrar verificacao de email"
                  >
                    <option value="all">Todos emails</option>
                    <option value="verified">Verificados</option>
                    <option value="pending">Pendentes</option>
                  </select>
                </div>
                {visibleAdminUsers.length ? (
                <div className="summary-items summary-items-flush">
                  {visibleAdminUsers.map(user => {
                    const form = userForms[user.id] ?? { name: user.name ?? '', email: user.email, role: user.role, emailVerified: user.emailVerified };
                    return (
                      <form className="summary-item admin-user-form" key={user.id} onSubmit={event => handleUserSubmit(event, user)}>
                        <div>
                          <h5>{user.email}</h5>
                          <div className="meta">
                            {user.name || 'Cliente sem nome'} - {user.orders.length} pedidos - {user.addresses.length} endereços
                          </div>
                          <div className="admin-user-badges">
                            <StatusBadge tone={user.role === 'ADMIN' ? 'warning' : 'neutral'}>{user.role}</StatusBadge>
                            <StatusBadge tone={user.emailVerified ? 'success' : 'warning'}>
                              {user.emailVerified ? 'Email verificado' : 'Email pendente'}
                            </StatusBadge>
                          </div>
                        </div>
                        <div className="admin-user-fields">
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
                        <label className="admin-user-checkbox-label">
                          <input
                            type="checkbox"
                            checked={form.emailVerified}
                            onChange={event => setUserForms(current => ({ ...current, [user.id]: { ...form, emailVerified: event.target.checked } }))}
                          />
                          Email verificado
                        </label>
                        {user.addresses.length ? (
                          <div>
                            <div className="meta admin-user-section-label">Endereços</div>
                            {user.addresses.slice(0, 3).map(address => (
                              <p key={address.id} className="admin-user-detail-row">{address.recipient} - {address.street} - {address.city}/{address.region} - {address.postalCode}</p>
                            ))}
                          </div>
                        ) : null}
                        {user.orders.length ? (
                          <div>
                            <div className="meta admin-user-section-label">Pedidos do cliente</div>
                            {user.orders.slice(0, 4).map(order => (
                              <p key={order.id} className="admin-user-detail-row">{order.id} - {order.status.toUpperCase()} - {formatPrice(order.total)}</p>
                            ))}
                          </div>
                        ) : null}
                        <div>
                          <button type="submit" className="btn btn-primary" disabled={userSavingId === user.id || apiMode !== 'real'}>
                            {userSavingId === user.id ? 'Salvando...' : 'Salvar cliente'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary admin-btn-gap"
                            onClick={() => handleResendUserVerification(user)}
                            disabled={userVerificationSendingId === user.id || user.emailVerified || apiMode !== 'real'}
                          >
                            {userVerificationSendingId === user.id ? 'Enviando...' : 'Reenviar verificação'}
                          </button>
                        </div>
                      </form>
                    );
                  })}
                </div>
                ) : (
                  <EmptyState
                    title="Nenhum cliente encontrado"
                    description="Ajuste a busca, o perfil ou o status de email para encontrar outros clientes."
                  />
                )}
                {customerPageCount > 1 ? (
                  <div className="account-pagination" aria-label="Paginacao de clientes do admin">
                    <ActionButton
                      type="button"
                      tone="secondary"
                      disabled={customerPage <= 1}
                      onClick={() => setCustomerPage(page => Math.max(1, page - 1))}
                    >
                      Anterior
                    </ActionButton>
                    <span>Página {customerPage} de {customerPageCount}</span>
                    <ActionButton
                      type="button"
                      tone="secondary"
                      disabled={customerPage >= customerPageCount}
                      onClick={() => setCustomerPage(page => Math.min(customerPageCount, page + 1))}
                    >
                      Próxima
                    </ActionButton>
                  </div>
                ) : null}
                </>
              ) : (
                <p>{apiMode === 'real' ? 'Nenhum cliente cadastrado ainda.' : 'Clientes reais aparecem aqui quando o admin estiver conectado ao PostgreSQL.'}</p>
              )}
            </SectionCard>
            ) : null}

            <section className="info-block" hidden={activeSection !== 'products'}>
              <h2>Catálogo admin</h2>
              <div className="form-block account-form" style={{ marginBottom: 28 }}>
                <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'end' }}>
                  <div>
                    <div className="section-num" style={{ marginBottom: 10 }}>IMPORTAR NUVEMSHOP</div>
                    <p style={{ marginBottom: 14 }}>Envie o CSV exportado da Nuvemshop para validar nomes, precos, imagens e categorias antes de cadastrar.</p>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      disabled={productImportLoading || apiMode !== 'real'}
                      onChange={event => handleProductImportPreview(event.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div className="meta" style={{ textAlign: 'right' }}>
                    {productImportLoading ? 'Lendo CSV...' : productImportPreview ? `${productImportPreview.preview.validCount} validos / ${productImportPreview.preview.errorCount} revisar` : 'Preview seguro'}
                  </div>
                </div>
                {productImportError ? <p style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 11, marginTop: 12 }}>{productImportError}</p> : null}
                {productImportSummary ? <p style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11, marginTop: 12 }}>{productImportSummary}</p> : null}
                {productImportPreview ? (
                  <div className="summary-items" style={{ marginTop: 18, marginBottom: 0, paddingBottom: 0, borderBottom: 0 }}>
                    {productImportPreview.preview.validCount > 0 ? (
                      <div className="summary-item" style={{ gridTemplateColumns: '1fr auto' }}>
                        <div>
                          <h5>Importar produtos validos</h5>
                          <div className="meta">Cria ate 50 produtos por envio. Produtos entram inativos para revisao antes de publicar.</div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={productImportLoading || apiMode !== 'real'}
                          onClick={handleProductImportCommit}
                        >
                          {productImportLoading ? 'Importando...' : `Importar ${productImportPreview.preview.validCount} validos`}
                        </button>
                      </div>
                    ) : null}
                    {productImportPreview.preview.rows.slice(0, 6).map(row => (
                      <div className="summary-item" style={{ gridTemplateColumns: '1fr auto' }} key={`${row.rowNumber}-${row.product.id ?? row.product.name}`}>
                        <div>
                          <h5>Linha {row.rowNumber}: {row.product.name || 'Produto sem nome'}</h5>
                          <div className="meta">
                            {row.status === 'valid'
                              ? `${row.product.category} - ${row.product.price ? formatPrice(row.product.price) : 'sem preco'} - ${row.product.importNotes?.stock ?? 'estoque n/a'} un.`
                              : row.errors.join(' ')}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={row.status !== 'valid'}
                          onClick={() => {
                            setProductForm(importRowToForm(row.product));
                            setEditingProductId(null);
                            setProductError('');
                          }}
                        >
                          Usar no formulario
                        </button>
                      </div>
                    ))}
                    {productImportPreview.preview.truncated ? <p className="meta">Preview limitado para manter o painel rapido. Importe por lotes menores se necessario.</p> : null}
                  </div>
                ) : null}
              </div>
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
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={productUploading || apiMode !== 'real'}
                      onChange={event => handleProductImageUpload(event.target.files?.[0] ?? null)}
                      style={{ marginTop: 8 }}
                    />
                    {productUploading ? <span className="meta">Enviando imagem...</span> : null}
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
              <div className="form-block account-form" style={{ marginBottom: 18 }}>
                <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr) minmax(160px, 220px)' }}>
                  <div className="field">
                    <label htmlFor="admin-product-search">Buscar produto</label>
                    <input
                      id="admin-product-search"
                      value={productSearch}
                      onChange={event => setProductSearch(event.target.value)}
                      placeholder="nome, ID, slug, marca ou categoria"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="admin-product-status">Status</label>
                    <select
                      id="admin-product-status"
                      value={productStatusFilter}
                      onChange={event => setProductStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
                    >
                      <option value="all">Todos</option>
                      <option value="active">Ativos</option>
                      <option value="inactive">Inativos</option>
                    </select>
                  </div>
                </div>
                <p className="meta">{filteredAdminProducts.length} produto(s) filtrado(s) de {adminProducts.length} cadastrados.</p>
              </div>
              <div className="summary-items" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 0 }}>
                {visibleAdminProducts.map(product => (
                  <div className="summary-item" style={{ gridTemplateColumns: '1fr auto' }} key={product.id}>
                    <div className="admin-product-row">
                      <span
                        className="admin-product-thumb"
                        style={{ backgroundImage: `url(${product.image})` }}
                        aria-hidden="true"
                      />
                      <div>
                      <h5>{product.name}</h5>
                      <div className="meta">{product.brand} · {product.category}</div>
                      </div>
                    </div>
                    <div className="admin-order-actions">
                      <StatusBadge tone={product.active ? 'success' : 'neutral'}>
                        {product.active ? 'Ativo' : 'Inativo'}
                      </StatusBadge>
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
                {filteredAdminProducts.length === 0 ? (
                  <EmptyState
                    title="Nenhum produto encontrado"
                    description="Ajuste busca ou filtro para localizar outro item."
                  />
                ) : null}
              </div>
              {productPageCount > 1 ? (
                <div className="account-pagination" aria-label="Paginacao de produtos do admin">
                  <ActionButton
                    type="button"
                    tone="secondary"
                    disabled={productPage <= 1}
                    onClick={() => setProductPage(page => Math.max(1, page - 1))}
                  >
                    Anterior
                  </ActionButton>
                  <span>Pagina {productPage} de {productPageCount}</span>
                  <ActionButton
                    type="button"
                    tone="secondary"
                    disabled={productPage >= productPageCount}
                    onClick={() => setProductPage(page => Math.min(productPageCount, page + 1))}
                  >
                    Proxima
                  </ActionButton>
                </div>
              ) : null}
            </section>

            <section className="info-block" hidden={!['overview', 'settings'].includes(activeSection)}>
              <h2>Operacao da loja</h2>
              {adminSettings ? (
                <div className="summary-items" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 0 }}>
                  <div className="summary-item" style={{ gridTemplateColumns: '1fr' }}>
                    <h5>Marca</h5>
                    <div className="meta">{adminSettings.store.appName} - {adminSettings.store.publicUrl}</div>
                  </div>
                  <div className="summary-item" style={{ gridTemplateColumns: '1fr' }}>
                    <h5>Contato</h5>
                    <div className="meta">{adminSettings.store.supportEmail} - {adminSettings.store.whatsapp || 'WhatsApp nao configurado'}</div>
                  </div>
                  <div className="summary-item" style={{ gridTemplateColumns: '1fr' }}>
                    <h5>Mercado Pago</h5>
                    <div className="meta">{adminSettings.integrations.mercadoPago.configured ? 'configurado' : 'pendente'} - {adminSettings.integrations.mercadoPago.devMode ? 'sandbox/dev ativo' : 'producao'} - webhook {adminSettings.integrations.mercadoPago.webhookConfigured ? 'ok' : 'pendente'}</div>
                  </div>
                  <div className="summary-item" style={{ gridTemplateColumns: '1fr' }}>
                    <h5>Email</h5>
                    <div className="meta">{adminSettings.integrations.email.configured ? 'configurado' : 'pendente'} - {adminSettings.integrations.email.devMode ? 'modo dev' : 'envio real'} {adminSettings.integrations.email.user ? `- ${adminSettings.integrations.email.user}` : ''}</div>
                  </div>
                  <div className="summary-item" style={{ gridTemplateColumns: '1fr' }}>
                    <h5>Melhor Envio</h5>
                    <div className="meta">{adminSettings.integrations.melhorEnvio.configured ? 'configurado' : 'pendente'} - {adminSettings.integrations.melhorEnvio.env} - CEP origem {adminSettings.integrations.melhorEnvio.originCepConfigured ? 'ok' : 'pendente'}</div>
                  </div>
                </div>
              ) : (
                <p>Configuracoes reais aparecem aqui quando o admin estiver conectado ao backend.</p>
              )}
            </section>

            <section className="info-block" hidden={activeSection !== 'payments'}>
              <h2>Pagamentos</h2>
              {adminSettings ? (
                <div className="summary-items" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 0 }}>
                  <div className="summary-item" style={{ gridTemplateColumns: '1fr auto' }}>
                    <div>
                      <h5>Mercado Pago</h5>
                      <div className="meta">{adminSettings.integrations.mercadoPago.configured ? 'credenciais configuradas' : 'credenciais pendentes'} - {adminSettings.integrations.mercadoPago.devMode ? 'sandbox/dev ativo' : 'producao real'} - webhook {adminSettings.integrations.mercadoPago.webhookConfigured ? 'ok' : 'pendente'}</div>
                    </div>
                    <span className={`order-status ${adminSettings.integrations.mercadoPago.configured ? 'status-paid' : 'status-pending'}`}>
                      {adminSettings.integrations.mercadoPago.configured ? 'OK' : 'PENDENTE'}
                    </span>
                  </div>
                  <div className="summary-item" style={{ gridTemplateColumns: '1fr auto' }}>
                    <div>
                      <h5>Pedidos pagos</h5>
                      <div className="meta">{totals.paid} aprovados - {totals.pending} aguardando pagamento</div>
                    </div>
                    <div className="price">{formatPrice(totals.revenue)}</div>
                  </div>
                  <div className="summary-item" style={{ gridTemplateColumns: '1fr auto' }}>
                    <div>
                      <h5>Ticket medio</h5>
                      <div className="meta">Media simples dos pedidos carregados no painel</div>
                    </div>
                    <div className="price">{formatPrice(totals.averageTicket)}</div>
                  </div>
                </div>
              ) : (
                <p>Conecte o admin real para ver o estado do Mercado Pago.</p>
              )}
            </section>

            <section className="info-block" hidden={activeSection !== 'shipping'}>
              <h2>Frete</h2>
              {adminSettings ? (
                <div className="summary-items" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 0 }}>
                  <div className="summary-item" style={{ gridTemplateColumns: '1fr auto' }}>
                    <div>
                      <h5>Melhor Envio</h5>
                      <div className="meta">{adminSettings.integrations.melhorEnvio.configured ? 'credenciais configuradas' : 'credenciais pendentes'} - ambiente {adminSettings.integrations.melhorEnvio.env} - CEP origem {adminSettings.integrations.melhorEnvio.originCepConfigured ? 'ok' : 'pendente'}</div>
                    </div>
                    <span className={`order-status ${adminSettings.integrations.melhorEnvio.configured ? 'status-paid' : 'status-pending'}`}>
                      {adminSettings.integrations.melhorEnvio.configured ? 'OK' : 'PENDENTE'}
                    </span>
                  </div>
                  <div className="summary-item" style={{ gridTemplateColumns: '1fr auto' }}>
                    <div>
                      <h5>Pedidos enviados</h5>
                      <div className="meta">Separacao, envio e entrega registrados no status do pedido</div>
                    </div>
                    <div className="price">{totals.shipped}</div>
                  </div>
                  <div className="summary-item" style={{ gridTemplateColumns: '1fr' }}>
                    <h5>Politica atual</h5>
                    <div className="meta">Cotacao real no checkout, servicos filtrados e markup configuravel no backend.</div>
                  </div>
                </div>
              ) : (
                <p>Conecte o admin real para ver o estado do Melhor Envio.</p>
              )}
            </section>

            <section className="info-block" hidden={activeSection !== 'logs'}>
              <h2>Logs e auditoria</h2>
              {adminAuditLogs.length ? (
                <>
                <div className="account-list-tools" aria-label="Filtros de auditoria do admin">
                  <input
                    value={auditLogSearch}
                    onChange={event => setAuditLogSearch(event.target.value)}
                    placeholder="Buscar por acao, admin, alvo ou ID"
                    aria-label="Buscar logs de auditoria"
                  />
                </div>
                {visibleAuditLogs.length ? (
                <div className="summary-items" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 0 }}>
                  {visibleAuditLogs.map(log => (
                    <div className="summary-item" style={{ gridTemplateColumns: '1fr auto' }} key={log.id}>
                      <div>
                        <h5>{log.action}</h5>
                        <div className="meta">
                          {log.targetType || 'registro'} {log.targetId ? `- ${log.targetId}` : ''} - {log.adminEmail || log.adminUserId || 'admin'} - {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <span className="order-status status-delivered">AUDIT</span>
                    </div>
                  ))}
                </div>
                ) : (
                  <EmptyState
                    title="Nenhum log encontrado"
                    description="Ajuste a busca para revisar outros eventos administrativos."
                  />
                )}
                {auditLogPageCount > 1 ? (
                  <div className="account-pagination" aria-label="Paginacao de logs do admin">
                    <ActionButton
                      type="button"
                      tone="secondary"
                      disabled={auditLogPage <= 1}
                      onClick={() => setAuditLogPage(page => Math.max(1, page - 1))}
                    >
                      Anterior
                    </ActionButton>
                    <span>Pagina {auditLogPage} de {auditLogPageCount}</span>
                    <ActionButton
                      type="button"
                      tone="secondary"
                      disabled={auditLogPage >= auditLogPageCount}
                      onClick={() => setAuditLogPage(page => Math.min(auditLogPageCount, page + 1))}
                    >
                      Proxima
                    </ActionButton>
                  </div>
                ) : null}
                </>
              ) : (
                <div className="summary-items" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 0 }}>
                  <div className="summary-item" style={{ gridTemplateColumns: '1fr' }}>
                    <h5>Nenhum log carregado</h5>
                    <div className="meta">Quando voce alterar pedido, produto, cupom, usuario ou newsletter, o registro aparece aqui.</div>
                  </div>
                  <div className="summary-item" style={{ gridTemplateColumns: '1fr' }}>
                    <h5>Seguranca</h5>
                    <div className="meta">RequireAdmin, rate limit administrativo e sessoes HttpOnly permanecem ativos.</div>
                  </div>
                </div>
              )}
            </section>

            <section className="info-block" hidden={activeSection !== 'coupons'}>
              <h2>Cupons</h2>
              <form className="form-block account-form" onSubmit={handleCouponSubmit} style={{ marginBottom: 24 }}>
                <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                  <div className="field">
                    <label htmlFor="admin-coupon-code">Codigo</label>
                    <input id="admin-coupon-code" value={couponForm.code} onChange={event => setCouponForm(current => ({ ...current, code: event.target.value }))} required />
                  </div>
                  <div className="field">
                    <label htmlFor="admin-coupon-type">Tipo</label>
                    <select id="admin-coupon-type" value={couponForm.discountType} onChange={event => setCouponForm(current => ({ ...current, discountType: event.target.value }))}>
                      <option value="PERCENT">Percentual</option>
                      <option value="FIXED">Valor fixo</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="admin-coupon-value">Desconto</label>
                    <input id="admin-coupon-value" type="number" min="1" value={couponForm.discountValue} onChange={event => setCouponForm(current => ({ ...current, discountValue: event.target.value }))} required />
                  </div>
                  <div className="field">
                    <label htmlFor="admin-coupon-limit">Limite de uso</label>
                    <input id="admin-coupon-limit" type="number" min="1" value={couponForm.maxRedemptions} onChange={event => setCouponForm(current => ({ ...current, maxRedemptions: event.target.value }))} />
                  </div>
                </div>
                <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase' }}>
                  <input type="checkbox" checked={couponForm.active} onChange={event => setCouponForm(current => ({ ...current, active: event.target.checked }))} />
                  Cupom ativo
                </label>
                {couponError ? <p style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 11, marginTop: 12 }}>{couponError}</p> : null}
                <button type="submit" className="btn btn-primary" style={{ marginTop: 18 }} disabled={couponSaving || apiMode !== 'real'}>
                  {couponSaving ? 'Salvando...' : 'Criar cupom'}
                </button>
              </form>
              <div className="account-list-tools" aria-label="Filtros de cupons">
                <input
                  value={couponSearch}
                  onChange={event => setCouponSearch(event.target.value)}
                  placeholder="Buscar cupom por codigo ou tipo"
                  aria-label="Buscar cupons"
                />
                <select
                  value={couponStatusFilter}
                  onChange={event => setCouponStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
                  aria-label="Filtrar cupons por status"
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
              </div>
              <div className="summary-items" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 0 }}>
                {filteredAdminCoupons.slice(0, 12).map(coupon => (
                  <div className="summary-item" style={{ gridTemplateColumns: '1fr auto' }} key={coupon.id}>
                    <div>
                      <h5>{coupon.code}</h5>
                      <div className="meta">{coupon.discountType === 'PERCENT' ? `${coupon.discountValue}%` : formatPrice(coupon.discountValue / 100)} - {coupon.redeemedCount} usos</div>
                    </div>
                    <div className="admin-order-actions">
                      <StatusBadge tone={coupon.active ? 'success' : 'neutral'}>{coupon.active ? 'Ativo' : 'Inativo'}</StatusBadge>
                      <button type="button" className="btn btn-secondary" onClick={() => toggleCoupon(coupon)} disabled={couponSaving || apiMode !== 'real'}>
                        {coupon.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </div>
                ))}
                {filteredAdminCoupons.length === 0 ? (
                  <EmptyState
                    title="Nenhum cupom encontrado"
                    description="Ajuste a busca ou o status para revisar outros cupons."
                  />
                ) : null}
              </div>
            </section>

            <section className="info-block" hidden={activeSection !== 'newsletter'}>
              <h2>Newsletter</h2>
              {newsletterSubscribers.length ? (
                <>
                <div className="account-list-tools" aria-label="Filtros de newsletter">
                  <input
                    value={newsletterSearch}
                    onChange={event => setNewsletterSearch(event.target.value)}
                    placeholder="Buscar inscrito por email ou origem"
                    aria-label="Buscar inscritos da newsletter"
                  />
                  <select
                    value={newsletterStatusFilter}
                    onChange={event => setNewsletterStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
                    aria-label="Filtrar inscritos por status"
                  >
                    <option value="all">Todos</option>
                    <option value="active">Ativos</option>
                    <option value="inactive">Inativos</option>
                  </select>
                </div>
                <div className="summary-items" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 0 }}>
                  {filteredNewsletterSubscribers.slice(0, 12).map(subscriber => (
                    <div className="summary-item" style={{ gridTemplateColumns: '1fr auto' }} key={subscriber.id}>
                      <div>
                        <h5>{subscriber.email}</h5>
                        <div className="meta">{subscriber.source} - {new Date(subscriber.subscribedAt).toLocaleDateString('pt-BR')}</div>
                      </div>
                      <div className="admin-order-actions">
                        <StatusBadge tone={subscriber.isActive ? 'success' : 'neutral'}>{subscriber.isActive ? 'Ativo' : 'Inativo'}</StatusBadge>
                        <button type="button" className="btn btn-secondary" onClick={() => toggleNewsletter(subscriber)} disabled={newsletterSavingId === subscriber.id || apiMode !== 'real'}>
                          {subscriber.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredNewsletterSubscribers.length === 0 ? (
                    <EmptyState
                      title="Nenhum inscrito encontrado"
                      description="Ajuste a busca ou o status para revisar outros inscritos."
                    />
                  ) : null}
                </div>
                </>
              ) : (
                <p>Nenhum inscrito na newsletter ainda.</p>
              )}
            </section>
          </article>
        </section>
      </div>
    </main>
  );
}
