import { notFound } from 'next/navigation';
import { InfoPageView } from '@/app/info/InfoPageView';
import { getInfoPageKeyBySlug, infoPageSlugs, infoPages } from '@/services/infoPages';

interface SlugPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export function generateStaticParams() {
  return Object.values(infoPageSlugs).map(slug => ({ slug }));
}

export async function generateMetadata({ params }: SlugPageProps) {
  const { slug } = await params;
  const key = getInfoPageKeyBySlug(slug);
  if (!key) return {};

  return {
    title: infoPages[key].title
  };
}

export default async function SlugPage({ params }: SlugPageProps) {
  const { slug } = await params;
  const key = getInfoPageKeyBySlug(slug);

  if (!key) {
    notFound();
  }

  return <InfoPageView pageKey={key} />;
}
