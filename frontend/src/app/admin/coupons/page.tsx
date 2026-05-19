import { AdminPageClient } from '../AdminPageClient';

export const metadata = { title: 'Admin Cupons', robots: { index: false, follow: false } };

export default function AdminCouponsPage() {
  return <AdminPageClient initialSection="coupons" />;
}
