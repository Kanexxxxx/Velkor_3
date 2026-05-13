export type ProductCategory = 'sneakers' | 'apparel' | 'accessories';

export type ProductBadge = 'NEW' | 'TRENDING';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  brand: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  badge?: ProductBadge;
  discount?: number;
  colors: string[];
  image: string;
  images?: string[];
  sizes: string[];
  tag: 'trending' | 'best' | 'new';
}
