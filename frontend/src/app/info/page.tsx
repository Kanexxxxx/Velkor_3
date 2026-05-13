import { InfoPageView } from './InfoPageView';
import { getInfoPageKey, infoPages } from '@/services/infoPages';

interface InfoPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

export async function generateMetadata({ searchParams }: InfoPageProps) {
  const params = await searchParams;
  const key = getInfoPageKey(params.page);
  return {
    title: infoPages[key].title
  };
}

export default async function InfoPage({ searchParams }: InfoPageProps) {
  const params = await searchParams;
  const key = getInfoPageKey(params.page);

  return <InfoPageView pageKey={key} />;
}
