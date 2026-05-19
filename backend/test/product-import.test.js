const assert = require('node:assert/strict');
const test = require('node:test');
const { Readable } = require('node:stream');

function makeReq({ method = 'POST', url = '/api/admin/products/import/preview', body, headers = {} } = {}) {
  const req = Readable.from(body ? [JSON.stringify(body)] : []);
  req.method = method;
  req.url = url;
  req.headers = { host: 'localhost:3001', cookie: 'velkor_sid=admin-token', ...headers };
  req.socket = { remoteAddress: '127.0.0.1' };
  return req;
}

function makeRes() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body = '') {
      this.body = body;
    },
  };
}

test('nuvemshop import parser previews quoted CSV product rows', () => {
  const { parseNuvemshopProductCsv } = require('../src/services/nuvemshop-import');
  const csv = [
    'Nome,Preco,Categoria,SKU,Estoque,Descricao,Imagem,Tamanhos,Cores',
    '"Camiseta VOLKERR, Premium","R$ 89,90","Vestuário","CAM-001","12","Malha algodao","https://cdn.test/camisa.jpg","P, M, G","#000,#fff"',
  ].join('\n');

  const preview = parseNuvemshopProductCsv(csv);

  assert.equal(preview.validCount, 1);
  assert.equal(preview.errorCount, 0);
  assert.equal(preview.rows[0].status, 'valid');
  assert.equal(preview.rows[0].product.id, 'cam-001');
  assert.equal(preview.rows[0].product.slug, 'camiseta-volkerr-premium');
  assert.equal(preview.rows[0].product.name, 'Camiseta VOLKERR, Premium');
  assert.equal(preview.rows[0].product.category, 'apparel');
  assert.equal(preview.rows[0].product.price, 89.9);
  assert.equal(preview.rows[0].product.image, 'https://cdn.test/camisa.jpg');
  assert.deepEqual(preview.rows[0].product.sizes, ['P', 'M', 'G']);
  assert.deepEqual(preview.rows[0].product.colors, ['#000', '#fff']);
});

test('nuvemshop import parser reports invalid rows without throwing', () => {
  const { parseNuvemshopProductCsv } = require('../src/services/nuvemshop-import');
  const csv = 'Nome,Preco,Imagem\nProduto sem preco,,https://cdn.test/a.jpg\n,10,https://cdn.test/b.jpg';

  const preview = parseNuvemshopProductCsv(csv);

  assert.equal(preview.validCount, 0);
  assert.equal(preview.errorCount, 2);
  assert.match(preview.rows[0].errors.join(' '), /Preco/);
  assert.match(preview.rows[1].errors.join(' '), /Nome/);
});

test('admin product import preview route is admin protected and returns preview', async () => {
  const { createAdminHandler } = require('../src/routes/admin');
  const handler = createAdminHandler({
    authRepo: { findSessionUser: async () => ({ user: { id: 'adm_import', role: 'ADMIN' } }) },
    appConfig: {},
    repo: {},
  });
  const res = makeRes();

  assert.equal(await handler(makeReq({ body: { filename: 'tiendanube.csv', csv: 'Nome,Preco,Imagem\nProduto CSV,19.90,https://cdn.test/produto.jpg' } }), res, null), true);

  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.preview.validCount, 1);
  assert.equal(data.preview.rows[0].product.name, 'Produto CSV');
  assert.equal(data.filename, 'tiendanube.csv');
});

test('admin product import route creates valid CSV products and reports invalid rows', async () => {
  const { createAdminHandler } = require('../src/routes/admin');
  const created = [];
  const handler = createAdminHandler({
    authRepo: { findSessionUser: async () => ({ user: { id: 'adm_import', role: 'ADMIN' } }) },
    appConfig: {},
    repo: {
      createProduct: async (payload, adminUserId) => {
        created.push({ payload, adminUserId });
        return { product: { ...payload, active: false }, storage: 'database' };
      },
    },
  });
  const res = makeRes();
  const csv = [
    'Nome,Preco,Imagem,SKU',
    'Produto Importado,79.90,https://cdn.test/produto.jpg,SKU-1',
    'Sem preco,,https://cdn.test/sem-preco.jpg,SKU-2',
  ].join('\n');

  assert.equal(await handler(makeReq({ url: '/api/admin/products/import', body: { filename: 'tiendanube.csv', csv } }), res, null), true);

  assert.equal(res.statusCode, 201);
  const data = JSON.parse(res.body);
  assert.equal(data.createdCount, 1);
  assert.equal(data.failedCount, 1);
  assert.equal(created[0].adminUserId, 'adm_import');
  assert.equal(created[0].payload.id, 'sku-1');
  assert.equal(created[0].payload.name, 'Produto Importado');
});
