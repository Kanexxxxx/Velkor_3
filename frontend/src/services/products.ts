import type { Product, ProductCategory } from '@/types/product';

export const categoryLabels: Record<ProductCategory, string> = {
  sneakers: 'Tênis',
  apparel: 'Vestuário',
  accessories: 'Acessórios'
};

export const products: Product[] = [
  {
    id: 'v01',
    name: 'Estrato V03 — Carbono',
    category: 'sneakers',
    brand: 'Velkor Pro',
    price: 1290,
    oldPrice: 1490,
    rating: 4.9,
    reviews: 87,
    badge: 'NEW',
    discount: 13,
    colors: ['#0a0a0a', '#ff1a3d', '#f5f1ea'],
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=900&q=80',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=900&q=80',
      'https://images.unsplash.com/photo-1539185441755-769473a23570?w=900&q=80'
    ],
    sizes: ['39', '40', '41', '42', '43', '44', '45'],
    tag: 'trending'
  },
  {
    id: 'v02',
    name: 'Moletom pesado Phantom',
    category: 'apparel',
    brand: 'Velkor Core',
    price: 790,
    rating: 4.8,
    reviews: 43,
    badge: 'TRENDING',
    colors: ['#0a0a0a', '#6a6a6a', '#f5f1ea'],
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    tag: 'best'
  },
  {
    id: 'v03',
    name: 'Calça Cargo Signal — Ônix',
    category: 'apparel',
    brand: 'Velkor Lab',
    price: 890,
    oldPrice: 1090,
    rating: 4.7,
    reviews: 29,
    discount: 18,
    colors: ['#0a0a0a', '#2a2a2a'],
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80',
    sizes: ['28', '30', '32', '34', '36'],
    tag: 'trending'
  },
  {
    id: 'v04',
    name: 'Tênis Volt Runner — Cinza',
    category: 'sneakers',
    brand: 'Velkor Pro',
    price: 990,
    rating: 4.9,
    reviews: 61,
    badge: 'NEW',
    colors: ['#6a6a6a', '#0a0a0a'],
    image: 'https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=800&q=80',
    sizes: ['39', '40', '41', '42', '43', '44'],
    tag: 'new'
  },
  {
    id: 'v05',
    name: 'Bolsa transversal Atlas',
    category: 'accessories',
    brand: 'Velkor Gear',
    price: 590,
    oldPrice: 790,
    rating: 4.6,
    reviews: 34,
    discount: 25,
    colors: ['#0a0a0a', '#ff1a3d'],
    image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&q=80',
    sizes: ['ONE'],
    tag: 'best'
  },
  {
    id: 'v06',
    name: 'Camiseta Eclipse — Osso',
    category: 'apparel',
    brand: 'Velkor Core',
    price: 290,
    rating: 4.5,
    reviews: 112,
    colors: ['#f5f1ea', '#0a0a0a'],
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    tag: 'best'
  },
  {
    id: 'v07',
    name: 'Jaqueta Helix Down',
    category: 'apparel',
    brand: 'Velkor Lab',
    price: 1890,
    oldPrice: 2290,
    rating: 5,
    reviews: 12,
    badge: 'NEW',
    discount: 17,
    colors: ['#0a0a0a'],
    image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&q=80',
    sizes: ['S', 'M', 'L', 'XL'],
    tag: 'new'
  },
  {
    id: 'v08',
    name: 'Óculos Velkor — Spectre',
    category: 'accessories',
    brand: 'Velkor Gear',
    price: 790,
    rating: 4.7,
    reviews: 21,
    colors: ['#0a0a0a'],
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80',
    sizes: ['ONE'],
    tag: 'new'
  },
  {
    id: 'v09',
    name: 'Velkor Orbit Low',
    category: 'sneakers',
    brand: 'Velkor Pro',
    price: 890,
    oldPrice: 1090,
    rating: 4.8,
    reviews: 54,
    discount: 18,
    colors: ['#f5f1ea', '#0a0a0a'],
    image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80',
    sizes: ['39', '40', '41', '42', '43', '44', '45'],
    tag: 'trending'
  },
  {
    id: 'v10',
    name: 'Gorro Monolith',
    category: 'accessories',
    brand: 'Velkor Core',
    price: 219,
    rating: 4.6,
    reviews: 78,
    colors: ['#0a0a0a', '#ff1a3d', '#f5f1ea', '#6a6a6a'],
    image: 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=800&q=80',
    sizes: ['ONE'],
    tag: 'best'
  },
  {
    id: 'v11',
    name: 'Calça ampla Drift',
    category: 'apparel',
    brand: 'Velkor Lab',
    price: 990,
    rating: 4.7,
    reviews: 18,
    badge: 'NEW',
    colors: ['#0a0a0a', '#6a6a6a'],
    image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80',
    sizes: ['28', '30', '32', '34', '36'],
    tag: 'new'
  },
  {
    id: 'v12',
    name: 'Cinto Velkor Strap',
    category: 'accessories',
    brand: 'Velkor Gear',
    price: 390,
    oldPrice: 490,
    rating: 4.4,
    reviews: 26,
    discount: 20,
    colors: ['#0a0a0a', '#f5f1ea'],
    image: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80',
    sizes: ['S', 'M', 'L'],
    tag: 'trending'
  }
];

export function getProductById(id: string): Product | undefined {
  return products.find(product => product.id === id);
}

export function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
