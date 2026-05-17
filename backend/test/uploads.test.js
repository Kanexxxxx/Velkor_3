const assert = require('node:assert/strict');
const test = require('node:test');

test('product image upload validation accepts safe data urls', () => {
  const { parseProductImageUpload } = require('../src/services/uploads');

  const parsed = parseProductImageUpload({
    filename: 'Produto Teste.PNG',
    dataUrl: 'data:image/png;base64,aGVsbG8=',
  });

  assert.equal(parsed.error, undefined);
  assert.equal(parsed.value.extension, '.png');
  assert.equal(parsed.value.buffer.toString('utf8'), 'hello');
});

test('product image upload validation rejects unsupported files', () => {
  const { parseProductImageUpload } = require('../src/services/uploads');

  assert.equal(parseProductImageUpload({ filename: 'bad.svg', dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' }).error, 'Formato de imagem invalido.');
  assert.equal(parseProductImageUpload({ filename: 'bad.jpg', dataUrl: 'not-a-data-url' }).error, 'Imagem invalida.');
});
