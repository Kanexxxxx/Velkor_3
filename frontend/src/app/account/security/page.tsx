import { Suspense } from 'react';
import { AccountPageClient } from '../AccountPageClient';

export const metadata = {
  title: 'Seguranca - Conta VELKOR'
};

export default function AccountSecurityPage() {
  return <Suspense fallback={null}><AccountPageClient initialTab="security" /></Suspense>;
}
