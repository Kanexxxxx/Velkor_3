import { AdminPageClient } from '../AdminPageClient';

export const metadata = { title: 'Admin Clientes', robots: { index: false, follow: false } };

export default function AdminCustomersPage() {
  return <AdminPageClient initialSection="customers" />;
}
