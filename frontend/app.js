/* ===========================================
   VELKOR — Front-end App
   =========================================== */

// ===== PRODUCT CATALOG =====
const PRODUCTS = [
  {
    id: 'v01', name: 'Estrato V03 — Carbono', cat: 'sneakers', brand: 'Velkor Pro',
    price: 285, oldPrice: 320, rating: 4.9, reviews: 1247,
    badge: 'NEW', discount: 11,
    colors: ['#0a0a0a', '#ff1a3d', '#f5f1ea'],
    img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=900&q=80',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=900&q=80',
      'https://images.unsplash.com/photo-1539185441755-769473a23570?w=900&q=80'
    ],
    sizes: ['39','40','41','42','43','44','45'],
    tag: 'trending'
  },
  {
    id: 'v02', name: 'Moletom pesado Phantom', cat: 'apparel', brand: 'Velkor Core',
    price: 185, oldPrice: null, rating: 4.8, reviews: 532,
    badge: 'TRENDING',
    colors: ['#0a0a0a', '#6a6a6a', '#f5f1ea'],
    img: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80',
    sizes: ['XS','S','M','L','XL','XXL'],
    tag: 'best'
  },
  {
    id: 'v03', name: 'Calça Cargo Signal — Ônix', cat: 'apparel', brand: 'Velkor Lab',
    price: 220, oldPrice: 260, rating: 4.7, reviews: 318,
    discount: 15,
    colors: ['#0a0a0a', '#2a2a2a'],
    img: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80',
    sizes: ['28','30','32','34','36'],
    tag: 'trending'
  },
  {
    id: 'v04', name: 'Tênis Volt Runner — Cinza', cat: 'sneakers', brand: 'Velkor Pro',
    price: 245, oldPrice: null, rating: 4.9, reviews: 891,
    badge: 'NEW',
    colors: ['#6a6a6a', '#0a0a0a'],
    img: 'https://images.unsplash.com/photo-1605348532760-6753d2c43329?w=800&q=80',
    sizes: ['39','40','41','42','43','44'],
    tag: 'new'
  },
  {
    id: 'v05', name: 'Bolsa transversal Atlas', cat: 'accessories', brand: 'Velkor Gear',
    price: 145, oldPrice: 175, rating: 4.6, reviews: 412,
    discount: 17,
    colors: ['#0a0a0a', '#ff1a3d'],
    img: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&q=80',
    sizes: ['ONE'],
    tag: 'best'
  },
  {
    id: 'v06', name: 'Camiseta Eclipse — Osso', cat: 'apparel', brand: 'Velkor Core',
    price: 75, oldPrice: null, rating: 4.5, reviews: 1582,
    colors: ['#f5f1ea', '#0a0a0a'],
    img: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
    sizes: ['XS','S','M','L','XL'],
    tag: 'best'
  },
  {
    id: 'v07', name: 'Jaqueta Helix Down', cat: 'apparel', brand: 'Velkor Lab',
    price: 480, oldPrice: 580, rating: 5.0, reviews: 89,
    badge: 'NEW', discount: 17,
    colors: ['#0a0a0a'],
    img: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&q=80',
    sizes: ['S','M','L','XL'],
    tag: 'new'
  },
  {
    id: 'v08', name: 'Óculos Velkor — Spectre', cat: 'accessories', brand: 'Velkor Gear',
    price: 195, oldPrice: null, rating: 4.7, reviews: 245,
    colors: ['#0a0a0a'],
    img: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80',
    sizes: ['ONE'],
    tag: 'new'
  },
  {
    id: 'v09', name: 'Velkor Orbit Low', cat: 'sneakers', brand: 'Velkor Pro',
    price: 215, oldPrice: 250, rating: 4.8, reviews: 663,
    discount: 14,
    colors: ['#f5f1ea', '#0a0a0a'],
    img: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&q=80',
    sizes: ['39','40','41','42','43','44','45'],
    tag: 'trending'
  },
  {
    id: 'v10', name: 'Gorro Monolith', cat: 'accessories', brand: 'Velkor Core',
    price: 55, oldPrice: null, rating: 4.6, reviews: 921,
    colors: ['#0a0a0a','#ff1a3d','#f5f1ea','#6a6a6a'],
    img: 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=800&q=80',
    sizes: ['ONE'],
    tag: 'best'
  },
  {
    id: 'v11', name: 'Calça ampla Drift', cat: 'apparel', brand: 'Velkor Lab',
    price: 245, oldPrice: null, rating: 4.7, reviews: 184,
    badge: 'NEW',
    colors: ['#0a0a0a','#6a6a6a'],
    img: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80',
    sizes: ['28','30','32','34','36'],
    tag: 'new'
  },
  {
    id: 'v12', name: 'Cinto Velkor Strap', cat: 'accessories', brand: 'Velkor Gear',
    price: 95, oldPrice: 120, rating: 4.4, reviews: 308,
    discount: 21,
    colors: ['#0a0a0a','#f5f1ea'],
    img: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80',
    sizes: ['S','M','L'],
    tag: 'trending'
  }
];

// ===== CART STATE =====
const CART_KEY = 'velkor_cart_v1';
const WISHLIST_KEY = 'velkor_wishlist_v1';
const DEFAULT_CART = [
  { id: 'v01', qty: 1, size: '42', color: '#0a0a0a' },
  { id: 'v02', qty: 2, size: 'L', color: '#0a0a0a' },
  { id: 'v05', qty: 1, size: 'ONE', color: '#ff1a3d' }
];
let CART = loadCart();
let WISHLIST = loadWishlist();

function findProduct(id) { return PRODUCTS.find(p => p.id === id); }

function fmt(n) { return '$' + n.toFixed(0); }

function categoryLabel(cat) {
  return {
    sneakers: 'Tênis',
    apparel: 'Vestuário',
    accessories: 'Acessórios'
  }[cat] || cat;
}

function isValidCartItem(item) {
  const product = findProduct(item.id);
  return product && Number.isFinite(item.qty) && item.qty > 0;
}

function normalizeCart(items) {
  return items
    .filter(isValidCartItem)
    .map(item => {
      const product = findProduct(item.id);
      return {
        id: item.id,
        qty: Math.max(1, Math.floor(item.qty)),
        size: product.sizes.includes(item.size) ? item.size : product.sizes[0],
        color: product.colors.includes(item.color) ? item.color : product.colors[0]
      };
    });
}

function loadCart() {
  try {
    const saved = localStorage.getItem(CART_KEY);
    if (!saved) return DEFAULT_CART.map(item => ({ ...item }));
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? normalizeCart(parsed) : DEFAULT_CART.map(item => ({ ...item }));
  } catch {
    return DEFAULT_CART.map(item => ({ ...item }));
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(CART));
  } catch {
    // Ignore storage failures so cart controls keep working in private or restricted browsing.
  }
}

function loadWishlist() {
  try {
    const saved = localStorage.getItem(WISHLIST_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter(id => findProduct(id)) : [];
  } catch {
    return [];
  }
}

function saveWishlist() {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(WISHLIST));
  } catch {
    // Wishlist still works for this session if storage is blocked.
  }
}

function isWishlisted(id) {
  return WISHLIST.includes(id);
}

function toggleWishlist(id) {
  const product = findProduct(id);
  if (!product) return;
  if (isWishlisted(id)) {
    WISHLIST = WISHLIST.filter(item => item !== id);
    showToast(`${product.name} removido dos favoritos`);
  } else {
    WISHLIST.push(id);
    showToast(`${product.name} salvo nos favoritos`);
  }
  saveWishlist();
  refreshWishlistUI();
  renderWishlistPage();
}

function refreshWishlistUI() {
  document.querySelectorAll('[data-wish]').forEach(button => {
    button.classList.toggle('active', isWishlisted(button.dataset.wish));
  });
}

// ===== CARD TEMPLATE =====
function productCard(p) {
  const oldHtml = p.oldPrice ? `<span class="old">${fmt(p.oldPrice)}</span>` : '';
  const badges = [];
  if (p.badge === 'NEW') badges.push(`<span class="badge new">NOVO</span>`);
  if (p.badge === 'TRENDING') badges.push(`<span class="badge">EM ALTA</span>`);
  if (p.discount) badges.push(`<span class="badge">-${p.discount}%</span>`);

  return `
    <article class="product-card" data-id="${p.id}">
      <div class="product-media">
        <a href="product.html?id=${p.id}"><img src="${p.img}" alt="${p.name}" loading="lazy" /></a>
        <div class="product-badge">${badges.join('')}</div>
        <button class="wishlist-btn ${isWishlisted(p.id) ? 'active' : ''}" data-wish="${p.id}" aria-label="Favoritos">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <button class="quick-add" data-add="${p.id}" aria-label="Adicionar ${p.name} ao carrinho">
          Adicionar
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </button>
      </div>
      <div class="product-info">
        <div class="product-cat">${p.brand} · ${categoryLabel(p.cat)}</div>
        <a href="product.html?id=${p.id}"><h3 class="product-name">${p.name}</h3></a>
        <div class="product-row">
          <div class="product-price">${oldHtml}${fmt(p.price)}</div>
          <div class="product-rating">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7z"/></svg>
            <span>${p.rating}</span>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderGrid(selector, filterFn, limit) {
  const el = document.querySelector(selector);
  if (!el) return;
  const items = PRODUCTS.filter(filterFn).slice(0, limit || 999);
  el.innerHTML = items.map(productCard).join('');
  refreshWishlistUI();
}

function renderWishlistPage() {
  const grid = document.getElementById('wishlistGrid');
  const empty = document.getElementById('wishlistEmpty');
  if (!grid) return;

  const items = WISHLIST.map(findProduct).filter(Boolean);
  grid.innerHTML = items.map(productCard).join('');
  grid.style.display = items.length ? 'grid' : 'none';
  if (empty) empty.style.display = items.length ? 'none' : 'block';
  refreshWishlistUI();
}

// ===== HOME GRIDS =====
renderGrid('#trendingGrid', p => p.tag === 'trending' || p.tag === 'best', 4);
renderGrid('#newGrid', p => p.tag === 'new' || p.badge === 'NEW', 4);
renderGrid('#bestGrid', p => p.tag === 'best', 3);

// ===== ADD TO CART =====
function addToCart(id, opts = {}) {
  const p = findProduct(id);
  if (!p) return;
  const size = opts.size || p.sizes[0];
  const color = opts.color || p.colors[0];
  const qty = opts.qty || 1;
  const existing = CART.find(c => c.id === id && c.size === size && c.color === color);
  if (existing) existing.qty += qty;
  else CART.push({ id, qty, size, color });
  refreshCart();
  showToast(`${p.name} adicionado à sacola`);
}

function removeFromCart(idx) {
  if (!CART[idx]) return;
  CART.splice(idx, 1);
  refreshCart();
}

function updateQty(idx, delta) {
  if (!CART[idx]) return;
  CART[idx].qty = Math.max(1, CART[idx].qty + delta);
  refreshCart();
}

function refreshCart() {
  CART = normalizeCart(CART);
  saveCart();
  const items = document.getElementById('cartItems');
  const count = CART.reduce((s, c) => s + c.qty, 0);
  document.querySelectorAll('#cartCount, #cartItemsCount').forEach(el => el.textContent = count);

  let subtotal = 0;
  if (items) {
    if (CART.length === 0) {
      items.innerHTML = `<div class="cart-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        <p>Sua sacola está vazia</p>
        <a href="shop.html" class="btn btn-ghost" style="margin-top: 14px;">Começar compra</a>
      </div>`;
    } else {
      items.innerHTML = CART.map((c, idx) => {
        const p = findProduct(c.id);
        if (!p) return '';
        const lineTotal = p.price * c.qty;
        subtotal += lineTotal;
        return `
          <div class="cart-item">
            <img src="${p.img}" alt="${p.name}" />
            <div class="cart-item-info">
              <h4>${p.name}</h4>
              <div class="meta">Tamanho ${c.size} · ${p.brand}</div>
              <div class="qty">
                <button data-qm="${idx}" aria-label="Diminuir quantidade de ${p.name}">−</button>
                <span>${c.qty}</span>
                <button data-qp="${idx}" aria-label="Aumentar quantidade de ${p.name}">+</button>
              </div>
            </div>
            <div class="cart-item-right">
              <div class="cart-item-price">${fmt(lineTotal)}</div>
              <button class="cart-item-remove" data-rm="${idx}" aria-label="Remover ${p.name} da sacola">Remover</button>
            </div>
          </div>
        `;
      }).join('');
    }
  } else {
    subtotal = CART.reduce((s, c) => {
      const product = findProduct(c.id);
      return product ? s + product.price * c.qty : s;
    }, 0);
  }

  const sub = document.getElementById('cartSubtotal');
  const tot = document.getElementById('cartTotal');
  if (sub) sub.textContent = fmt(subtotal);
  if (tot) tot.textContent = fmt(subtotal);
  document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart: CART, subtotal } }));
}

// Bind cart events (delegation)
document.addEventListener('click', e => {
  const addBtn = e.target.closest('[data-add]');
  if (addBtn) { e.preventDefault(); addToCart(addBtn.dataset.add); return; }
  const wishBtn = e.target.closest('[data-wish]');
  if (wishBtn) { e.preventDefault(); toggleWishlist(wishBtn.dataset.wish); return; }
  const rm = e.target.closest('[data-rm]');
  if (rm) { removeFromCart(+rm.dataset.rm); return; }
  const qm = e.target.closest('[data-qm]');
  if (qm) { updateQty(+qm.dataset.qm, -1); return; }
  const qp = e.target.closest('[data-qp]');
  if (qp) { updateQty(+qp.dataset.qp, +1); return; }
});

// ===== CART DRAWER =====
const cartBtn = document.getElementById('cartBtn');
const cartDrawer = document.getElementById('cartDrawer');
const cartBackdrop = document.getElementById('cartBackdrop');
const cartClose = document.getElementById('cartClose');

function openCart() {
  if (!cartDrawer) return;
  cartDrawer.classList.add('open');
  cartDrawer.setAttribute('aria-hidden', 'false');
  cartBtn?.setAttribute('aria-expanded', 'true');
  cartBackdrop?.classList.add('show');
  document.body.style.overflow = 'hidden';
  cartClose?.focus();
}
function closeCart() {
  if (!cartDrawer) return;
  cartDrawer.classList.remove('open');
  cartDrawer.setAttribute('aria-hidden', 'true');
  cartBtn?.setAttribute('aria-expanded', 'false');
  cartBackdrop?.classList.remove('show');
  document.body.style.overflow = '';
  cartBtn?.focus();
}
cartBtn?.addEventListener('click', openCart);
cartClose?.addEventListener('click', closeCart);
cartBackdrop?.addEventListener('click', closeCart);

refreshCart();
renderWishlistPage();
refreshWishlistUI();

// ===== TOAST =====
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// ===== MOBILE MENU =====
const menuToggle = document.getElementById('menuToggle');
const mobileMenu = document.getElementById('mobileMenu');
menuToggle?.addEventListener('click', () => {
  const isOpen = mobileMenu?.classList.toggle('open');
  menuToggle?.classList.toggle('open', Boolean(isOpen));
  menuToggle?.setAttribute('aria-expanded', String(Boolean(isOpen)));
  menuToggle?.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
  mobileMenu?.setAttribute('aria-hidden', String(!isOpen));
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (cartDrawer?.classList.contains('open')) closeCart();
  if (mobileMenu?.classList.contains('open')) {
    mobileMenu.classList.remove('open');
    menuToggle?.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Abrir menu');
    mobileMenu.setAttribute('aria-hidden', 'true');
    menuToggle?.focus();
  }
});

// ===== NAV BG SHIFT ON SCROLL =====
const navEl = document.getElementById('nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 30) {
    navEl?.style.setProperty('background', 'rgba(5,5,5,0.85)');
  } else {
    navEl?.style.setProperty('background', 'rgba(5,5,5,0.55)');
  }
}, { passive: true });

// ===== PAGE LOADER =====
window.addEventListener('load', () => {
  const loader = document.getElementById('pageLoader');
  if (loader) setTimeout(() => loader.classList.add('gone'), 350);
});

// ===== REVEAL ON SCROLL =====
const io = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (en.isIntersecting) {
      en.target.classList.add('in');
      io.unobserve(en.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// ===== NEWSLETTER =====
document.getElementById('newsForm')?.addEventListener('submit', (e) => {
  e.preventDefault();
  showToast('Cadastro recebido.');
  e.target.reset();
});
