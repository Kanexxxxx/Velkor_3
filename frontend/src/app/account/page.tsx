import { Suspense } from 'react';
import { AccountPageClient } from './AccountPageClient';

export const metadata = {
  title: 'Conta'
};

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountPageClient />
    </Suspense>
  );
}
