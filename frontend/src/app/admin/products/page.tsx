import { AdminPageClient } from '../AdminPageClient';

export const metadata = { title: 'Admin Produtos', robots: { index: false, follow: false } };

export default function AdminProductsPage() {
  return <AdminPageClient initialSection="products" />;
}
