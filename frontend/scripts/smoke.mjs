const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:3000';

const checks = [
  { path: '/', text: 'VELKOR' },
  { path: '/shop', text: 'Todos os' },
  { path: '/shop?cat=sneakers', text: 'Tênis' },
  { path: '/shop?cat=apparel', text: 'Vestuário' },
  { path: '/shop?cat=accessories', text: 'Acessórios' },
  { path: '/shop?sort=new', text: 'Todos os' },
  { path: '/product/v01', text: 'Estrato' },
  { path: '/wishlist', text: 'Favoritos' },
  { path: '/account', text: 'Conta' },
  { path: '/checkout', text: 'Última' },
  { path: '/admin', text: 'Acesso' },
  { path: '/envio-e-devolucoes', text: 'Envio e Devoluções' },
  { path: '/guia-de-tamanhos', text: 'Guia de Tamanhos' },
  { path: '/rastrear-pedido', text: 'Rastrear Pedido' },
  { path: '/contato', text: 'Contato' },
  { path: '/faq', text: 'FAQ' },
  { path: '/nossa-historia', text: 'Nossa História' },
  { path: '/lojas-parceiras', text: 'Lojas Parceiras' },
  { path: '/carreiras', text: 'Carreiras' },
  { path: '/imprensa', text: 'Imprensa' },
  { path: '/sustentabilidade', text: 'Sustentabilidade' },
  { path: '/privacidade', text: 'Privacidade' },
  { path: '/termos', text: 'Termos' },
  { path: '/reembolso', text: 'Reembolso' },
  { path: '/cookies', text: 'Cookies' },
  { path: '/robots.txt', text: 'Disallow: /admin' },
  { path: '/sitemap.xml', text: '/shop' },
  { path: '/info?page=privacy', text: 'Privacidade' },
  { path: '/legacy/index.html', status: 404 }
];

let failures = 0;

for (const check of checks) {
  const url = new URL(check.path, baseUrl);
  const response = await fetch(url);
  const expectedStatus = check.status ?? 200;

  if (response.status !== expectedStatus) {
    failures += 1;
    console.error(`FAIL ${check.path}: status ${response.status}, esperado ${expectedStatus}`);
    continue;
  }

  if (check.text) {
    const body = await response.text();
    if (!body.includes(check.text)) {
      failures += 1;
      console.error(`FAIL ${check.path}: texto esperado não encontrado: ${check.text}`);
      continue;
    }
  }

  console.log(`OK ${check.path}`);
}

if (failures > 0) {
  process.exit(1);
}
