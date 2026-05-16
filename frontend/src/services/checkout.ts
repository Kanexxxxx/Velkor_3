export { ORDERS_STORAGE_KEY } from './orders';

export const MERCADO_PAGO_PUBLIC_KEY_PLACEHOLDER = 'NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY';

export function createOrderCode() {
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `VEL26-001-${suffix}`;
}
