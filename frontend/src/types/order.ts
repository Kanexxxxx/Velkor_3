import type { CartItem } from './cart';
import type { Address } from './user';

export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type OrderPayment = 'card' | 'mercado-pago' | 'pix' | 'boleto';

export type OrderShipping = 'standard' | 'express';

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
