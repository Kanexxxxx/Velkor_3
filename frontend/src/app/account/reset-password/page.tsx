import { Suspense } from 'react';
import { ResetPasswordPageClient } from './ResetPasswordPageClient';

export const metadata = {
  title: 'Redefinir senha'
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageClient />
    </Suspense>
  );
}
