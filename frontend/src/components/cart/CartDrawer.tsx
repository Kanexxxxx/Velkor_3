import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, X } from 'lucide-react';
import { useCart } from '@/components/cart/CartProvider';
import { formatPrice, getProductById } from '@/services/products';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, summary, updateQuantity, removeItem } = useCart();

  return (
    <>
      <div className={`cart-backdrop ${isOpen ? 'show' : ''}`.trim()} id="cartBackdrop" onClick={onClose} />
      <aside
        className={`cart-drawer ${isOpen ? 'open' : ''}`.trim()}
        id="cartDrawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cartTitle"
        aria-hidden={!isOpen}
      >
        <div className="cart-header">
          <h3 id="cartTitle">
            Sua Sacola <span className="mono" style={{ color: 'var(--muted)', fontSize: 13 }}>({summary.itemsCount})</span>
          </h3>
          <button className="close" type="button" aria-label="Fechar sacola" onClick={onClose}>
            <X width={16} height={16} aria-hidden="true" />
          </button>
        </div>

        <div className="cart-items">
          {items.length === 0 ? (
            <div className="cart-empty">
              <ShoppingBag strokeWidth={1.5} aria-hidden="true" />
              <p>Sua sacola está vazia</p>
            </div>
          ) : (
            items.map(item => {
              const product = getProductById(item.productId);
              if (!product) return null;

              return (
                <article className="cart-item" key={`${item.productId}-${item.size}-${item.color}`}>
                  <Image src={product.image} alt={product.name} width={80} height={90} sizes="80px" />
                  <div className="cart-item-info">
                    <h4>{product.name}</h4>
                    <div className="meta">Tam. {item.size} · Cor {item.color}</div>
                    <div className="qty">
                      <button type="button" aria-label={`Diminuir ${product.name}`} onClick={() => updateQuantity(item, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button type="button" aria-label={`Aumentar ${product.name}`} onClick={() => updateQuantity(item, item.quantity + 1)}>+</button>
                    </div>
                  </div>
                  <div className="cart-item-right">
                    <div className="cart-item-price">{formatPrice(product.price * item.quantity)}</div>
                    <button className="cart-item-remove" type="button" onClick={() => removeItem(item)}>
                      Remover
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-totals">
            <div className="cart-row"><span>Subtotal</span><span>{formatPrice(summary.subtotal)}</span></div>
            <div className="cart-row"><span>Frete</span><span style={{ color: 'var(--red)' }}>GRÁTIS</span></div>
            <div className="cart-row total"><span>Total</span><span>{formatPrice(summary.total)}</span></div>
          </div>
          <Link href="/checkout" className="cart-cta" onClick={onClose}>Ir para o checkout</Link>
        </div>
      </aside>
    </>
  );
}
