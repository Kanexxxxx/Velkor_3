import { AdminPageClient } from '../AdminPageClient';

export const metadata = { title: 'Admin Configuracoes', robots: { index: false, follow: false } };

export default function AdminSettingsPage() {
  return <AdminPageClient initialSection="settings" />;
}
