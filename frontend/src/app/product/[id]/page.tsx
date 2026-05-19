import { ProductDetailClient } from './ProductDetailClient';
import { getProductById, products } from '@/services/products';
import { fetchProduct } from '@/services/productApi';
import type { Product } from '@/types/product';

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

function createPendingProduct(id: string): Product {
  return {
    id,
    name: 'Carregando produto',
    category: 'apparel',
    brand: 'VELKOR',
    price: 0,
    rating: 0,
    reviews: 0,
    colors: ['#0a0a0a'],
    image: '/favicon.svg',
    images: ['/favicon.svg'],
    sizes: ['ONE'],
    tag: 'new',
  };
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

  return <ProductDetailClient product={product ?? createPendingProduct(id)} />;
}
