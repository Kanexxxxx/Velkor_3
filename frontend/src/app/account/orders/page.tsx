import { Suspense } from 'react';
import { AccountPageClient } from '../AccountPageClient';

export const metadata = {
  title: 'Pedidos - Conta VELKOR'
};

export default function AccountOrdersPage() {
  return <Suspense fallback={null}><AccountPageClient initialTab="orders" /></Suspense>;
}
