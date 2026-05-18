import { notFound } from 'next/navigation';
import { ProductDetailClient } from './ProductDetailClient';
import { getProductById, products } from '@/services/products';
import { fetchProduct } from '@/services/productApi';

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const dynamicParams = true;
export const revalidate = 0;

export function generateStaticParams() {
  return products.map(product => ({ id: product.id }));
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await fetchProduct(id).catch(() => getProductById(id));

  return {
    title: product ? product.name : 'Produto'
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await fetchProduct(id).catch(() => getProductById(id));

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}
