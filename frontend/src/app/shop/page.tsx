import { Suspense } from 'react';
import { ShopPageClient } from './ShopPageClient';

export const metadata = {
  title: 'Loja'
};

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <section className="shop-hero">
          <div className="container">
            <div className="crumbs">
              <span>Início</span>
              <span className="sep">/</span>
              <span>Loja</span>
            </div>
            <h1>Todos os <span className="red">Produtos.</span></h1>
          </div>
        </section>
      }
    >
      <ShopPageClient />
    </Suspense>
  );
}
