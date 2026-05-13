import { AdminPageClient } from './AdminPageClient';

export const metadata = {
  title: 'Admin',
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminPage() {
  return <AdminPageClient />;
}
