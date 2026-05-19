import { Suspense } from 'react';
import { AccountPageClient } from '../AccountPageClient';

export const metadata = {
  title: 'Enderecos - Conta VELKOR'
};

export default function AccountAddressesPage() {
  return <Suspense fallback={null}><AccountPageClient initialTab="addresses" /></Suspense>;
}
