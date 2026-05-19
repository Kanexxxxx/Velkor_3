import { Suspense } from 'react';
import { AccountPageClient } from '../../AccountPageClient';

export const metadata = {
  title: 'Detalhe do pedido - Conta VELKOR'
};

export default function AccountOrderDetailPage() {
  return <Suspense fallback={null}><AccountPageClient initialTab="orders" /></Suspense>;
}
