import type { CartItem } from './cart';
import type { Address } from './user';

export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'fulfilled' | 'delivered' | 'cancelled';

export type OrderPayment = 'mercado-pago';

export type OrderShipping = string;

export interface OrderContact {
  name: string;
  email: string;
  phone?: string;
}

export interface Order {
  id: string;
  userId?: string;
  items: CartItem[];
  status: OrderStatus;
  paymentStatus?: 'pending' | 'approved' | 'rejected' | 'refunded';
  paymentProvider?: string;
  paymentPreferenceId?: string;
  paidAt?: string;
  trackingCode?: string;
  shippedAt?: string;
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  coupon?: string;
  total: number;
  payment: OrderPayment;
  shipping: OrderShipping;
  contact: OrderContact;
  address: Address;
  createdAt: string;
}
