import { AdminPageClient } from '../AdminPageClient';

export const metadata = { title: 'Admin Pedidos', robots: { index: false, follow: false } };

export default function AdminOrdersPage() {
  return <AdminPageClient initialSection="orders" />;
}
