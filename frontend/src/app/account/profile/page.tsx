import { Suspense } from 'react';
import { AccountPageClient } from '../AccountPageClient';

export const metadata = {
  title: 'Perfil - Conta VELKOR'
};

export default function AccountProfilePage() {
  return <Suspense fallback={null}><AccountPageClient initialTab="profile" /></Suspense>;
}
