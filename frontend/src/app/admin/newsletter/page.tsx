import { AdminPageClient } from '../AdminPageClient';

export const metadata = { title: 'Admin Newsletter', robots: { index: false, follow: false } };

export default function AdminNewsletterPage() {
  return <AdminPageClient initialSection="newsletter" />;
}
