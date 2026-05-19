import { OrderDetailPageClient } from './OrderDetailPageClient';

interface AccountOrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata = {
  title: 'Detalhe do pedido - Conta VELKOR'
};

export default async function AccountOrderDetailPage({ params }: AccountOrderDetailPageProps) {
  const { id } = await params;
  return <OrderDetailPageClient orderId={id} />;
}
