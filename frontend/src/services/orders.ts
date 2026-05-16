import type { Order } from '@/types/order';
import { fetchRemoteOrders } from '@/services/orderApi';

export const ORDERS_STORAGE_KEY = 'velkor_orders_v1';

export function readOrders(): Order[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Order[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeOrders(orders: Order[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

export function addOrder(order: Order) {
  const orders = readOrders();
  writeOrders([order, ...orders]);
}

export function ordersForUser(userId: string | null | undefined): Order[] {
  if (!userId) return [];
  return readOrders().filter(order => order.userId === userId);
}

export async function loadOrdersForUser(userId: string | null | undefined): Promise<Order[]> {
  const localOrders = ordersForUser(userId);
  try {
    const remoteOrders = await fetchRemoteOrders();
    if (!userId) return remoteOrders.length ? remoteOrders : localOrders;
    const merged = [...remoteOrders.filter(order => order.userId === userId || !order.userId), ...localOrders];
    return Array.from(new Map(merged.map(order => [order.id, order])).values());
  } catch {
    return localOrders;
  }
}

export const orderStatusLabels: Record<Order['status'], { label: string; tone: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' }> = {
  pending: { label: 'Aguardando pagamento', tone: 'pending' },
  paid: { label: 'Pagamento aprovado', tone: 'paid' },
  processing: { label: 'Em separação', tone: 'paid' },
  shipped: { label: 'Enviado', tone: 'shipped' },
  delivered: { label: 'Entregue', tone: 'delivered' },
  cancelled: { label: 'Cancelado', tone: 'cancelled' }
};
