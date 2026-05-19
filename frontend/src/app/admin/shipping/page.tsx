import { AdminPageClient } from '../AdminPageClient';

export const metadata = { title: 'Admin Frete', robots: { index: false, follow: false } };

export default function AdminShippingPage() {
  return <AdminPageClient initialSection="shipping" />;
}
