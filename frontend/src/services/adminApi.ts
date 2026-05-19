import { API_BASE_URL } from '@/services/api';
import type { Order } from '@/types/order';

export type AdminRole = 'CUSTOMER' | 'ADMIN';

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  emailVerified: boolean;
  demoUser: boolean;
  addresses: AdminAddress[];
  orders: AdminOrderSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminAddress {
  id: string;
  recipient: string;
  street: string;
  complement: string;
  neighborhood: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderSummary {
  id: string;
  status: Order['status'];
  total: number;
  createdAt: string;
}

export interface AdminCoupon {
  id: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  active: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  source: string;
  isActive: boolean;
  subscribedAt: string;
  updatedAt: string;
}

export interface AdminSettings {
  store: {
    appName: string;
    publicUrl: string;
    supportEmail: string;
    whatsapp: string;
    instagram: string;
    allowedOrigins: string[];
    legacyAdminUnlockEnabled: boolean;
  };
  integrations: {
    mercadoPago: { configured: boolean; devMode: boolean; webhookConfigured: boolean };
    email: { configured: boolean; devMode: boolean; user: string };
    melhorEnvio: { configured: boolean; env: string; originCepConfigured: boolean };
  };
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  category: 'sneakers' | 'apparel' | 'accessories' | string;
  categoryId?: string;
  brand: string;
  price: number;
  oldPrice: number | null;
  rating: number;
  reviews: number;
  badge: string | null;
  discount: number | null;
  colors: string[];
  image: string;
  images: string[];
  sizes: string[];
  tag: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductImportRow {
  rowNumber: number;
  status: 'valid' | 'invalid';
  errors: string[];
  product: Partial<AdminProduct> & {
    importNotes?: {
      sku: string | null;
      stock: number | null;
      description: string | null;
    };
  };
}

export interface AdminProductImportPreview {
  filename: string;
  preview: {
    rows: AdminProductImportRow[];
    validCount: number;
    errorCount: number;
    totalRows: number;
    truncated?: boolean;
  };
  storage: 'preview';
}

export class AdminApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      credentials: 'include',
      cache: 'no-store',
    });
  } catch (error) {
    throw new AdminApiError(error instanceof Error ? error.message : 'Admin API indisponivel.', 0);
  }

  const data = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new AdminApiError(data.error ?? `Erro admin: ${response.status}`, response.status);
  return data as T;
}

export function isAdminApiUnavailable(error: unknown) {
  return error instanceof AdminApiError && (error.status === 0 || error.status === 503);
}

export async function getAdminMe() {
  const data = await request<{ user: AdminUser }>('/api/admin/me');
  return data.user;
}

export async function fetchAdminOrders() {
  const data = await request<{ orders: Order[]; storage?: string }>('/api/admin/orders');
  return data.orders ?? [];
}

export async function fetchAdminProducts() {
  const data = await request<{ products: AdminProduct[]; storage?: string }>('/api/admin/products');
  return data.products ?? [];
}

export async function fetchAdminSettings() {
  const data = await request<{ settings: AdminSettings }>('/api/admin/settings');
  return data.settings;
}

export async function createAdminProduct(payload: Partial<AdminProduct>) {
  const data = await request<{ product: AdminProduct }>('/api/admin/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.product;
}

export async function updateAdminProduct(id: string, payload: Partial<AdminProduct>) {
  const data = await request<{ product: AdminProduct }>(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data.product;
}

export async function uploadAdminProductImage(input: { filename: string; dataUrl: string }) {
  return request<{ url: string; filename: string; mimeType: string; size: number }>('/api/admin/uploads/product-image', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function previewAdminProductImport(input: { filename: string; csv: string }) {
  return request<AdminProductImportPreview>('/api/admin/products/import/preview', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateAdminOrderStatus(id: string, status: Order['status']) {
  const data = await request<{ order: Order }>(`/api/admin/orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return data.order;
}

export async function fetchAdminUsers() {
  const data = await request<{ users: AdminUser[] }>('/api/admin/users');
  return data.users ?? [];
}

export async function updateAdminUser(id: string, patch: Partial<Pick<AdminUser, 'name' | 'email' | 'role' | 'emailVerified'>>) {
  const data = await request<{ user: AdminUser }>(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return data.user;
}

export async function fetchAdminCoupons() {
  const data = await request<{ coupons: AdminCoupon[] }>('/api/admin/coupons');
  return data.coupons ?? [];
}

export async function createAdminCoupon(payload: Partial<AdminCoupon>) {
  const data = await request<{ coupon: AdminCoupon }>('/api/admin/coupons', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.coupon;
}

export async function updateAdminCoupon(id: string, payload: Partial<AdminCoupon>) {
  const data = await request<{ coupon: AdminCoupon }>(`/api/admin/coupons/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return data.coupon;
}

export async function fetchNewsletterSubscribers() {
  const data = await request<{ subscribers: NewsletterSubscriber[] }>('/api/admin/newsletter');
  return data.subscribers ?? [];
}

export async function updateNewsletterSubscriber(id: string, patch: Partial<Pick<NewsletterSubscriber, 'isActive'>>) {
  const data = await request<{ subscriber: NewsletterSubscriber }>(`/api/admin/newsletter/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return data.subscriber;
}

export async function legacyUnlock(password: string) {
  return request<{ ok: boolean; deprecated?: boolean }>('/api/admin/unlock', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}
