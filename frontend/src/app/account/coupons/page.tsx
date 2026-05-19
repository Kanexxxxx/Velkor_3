import { Suspense } from 'react';
import { AccountPageClient } from '../AccountPageClient';

export const metadata = {
  title: 'Cupons - Conta VELKOR'
};

export default function AccountCouponsPage() {
  return <Suspense fallback={null}><AccountPageClient initialTab="profile" /></Suspense>;
}
