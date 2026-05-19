import { AdminPageClient } from '../AdminPageClient';

export const metadata = { title: 'Admin Pagamentos', robots: { index: false, follow: false } };

export default function AdminPaymentsPage() {
  return <AdminPageClient initialSection="payments" />;
}
