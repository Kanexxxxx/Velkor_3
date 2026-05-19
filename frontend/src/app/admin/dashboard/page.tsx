import { AdminPageClient } from '../AdminPageClient';

export const metadata = { title: 'Admin Dashboard', robots: { index: false, follow: false } };

export default function AdminDashboardPage() {
  return <AdminPageClient initialSection="overview" />;
}
