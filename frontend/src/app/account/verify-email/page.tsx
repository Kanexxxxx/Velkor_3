import { Suspense } from 'react';
import { VerifyEmailPageClient } from './VerifyEmailPageClient';

export const metadata = {
  title: 'Confirmar email'
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageClient />
    </Suspense>
  );
}
