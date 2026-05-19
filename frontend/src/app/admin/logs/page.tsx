import { AdminPageClient } from '../AdminPageClient';

export const metadata = { title: 'Admin Logs', robots: { index: false, follow: false } };

export default function AdminLogsPage() {
  return <AdminPageClient initialSection="settings" />;
}
