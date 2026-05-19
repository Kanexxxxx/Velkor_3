const CATEGORY_ALIASES = [
  { match: ['tenis', 'sneaker', 'calcado', 'sapato'], category: 'sneakers' },
  { match: ['vestuario', 'roupa', 'camiseta', 'calca', 'moletom', 'apparel'], category: 'apparel' },
  { match: ['acessorio', 'bone', 'bolsa', 'meia', 'accessor'], category: 'accessories' },
];

function normalizeHeader(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeText(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

function slugify(value) {
  return normalizeText(value, 120)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function parseCsvRows(csvText) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const next = csvText[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

function buildHeaderIndex(headers) {
  const index = new Map();
  headers.forEach((header, position) => {
    const normalized = normalizeHeader(header);
    if (normalized) index.set(normalized, position);
  });
  return index;
}

function getField(row, headerIndex, aliases) {
  for (const alias of aliases) {
    const position = headerIndex.get(normalizeHeader(alias));
    if (position !== undefined) return normalizeText(row[position]);
  }
  return '';
}

function parsePrice(value) {
  const cleaned = normalizeText(value)
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const price = Number(cleaned);
  return Number.isFinite(price) ? price : 0;
}

function parseList(value) {
  return normalizeText(value)
    .split(/[;,|]/)
    .map(item => normalizeText(item, 80))
    .filter(Boolean);
}

function mapCategory(value) {
  const normalized = normalizeHeader(value);
  if (!normalized) return 'apparel';
  for (const entry of CATEGORY_ALIASES) {
    if (entry.match.some(alias => normalized.includes(normalizeHeader(alias)))) return entry.category;
  }
  return normalized.includes('access') ? 'accessories' : 'apparel';
}

function buildProduct(row, headerIndex, rowNumber) {
  const name = getField(row, headerIndex, ['Nome', 'Nombre', 'Name', 'Produto', 'Producto']);
  const price = parsePrice(getField(row, headerIndex, ['Preco', 'Precio', 'Price', 'Preco promocional', 'Preço', 'Preço promocional']));
  const sku = getField(row, headerIndex, ['SKU', 'Codigo SKU', 'Código SKU', 'Codigo', 'Código']);
  const category = mapCategory(getField(row, headerIndex, ['Categoria', 'Categoría', 'Category', 'Categories']));
  const brand = getField(row, headerIndex, ['Marca', 'Brand']) || 'VOLKERR';
  const description = getField(row, headerIndex, ['Descricao', 'Descripción', 'Description', 'Descricao curta']);
  const image = getField(row, headerIndex, ['Imagem', 'Imagen', 'Image', 'URL da imagem', 'URL de imagem', 'Foto']);
  const images = parseList(getField(row, headerIndex, ['Imagens', 'Imagenes', 'Images', 'Galeria'])).filter(Boolean);
  const sizes = parseList(getField(row, headerIndex, ['Tamanhos', 'Talles', 'Sizes', 'Variacao 1 valor', 'Variação 1 valor']));
  const colors = parseList(getField(row, headerIndex, ['Cores', 'Colores', 'Colors', 'Variacao 2 valor', 'Variação 2 valor']));
  const stock = Number(getField(row, headerIndex, ['Estoque', 'Stock', 'Quantidade']));
  const slug = slugify(getField(row, headerIndex, ['Slug', 'URL', 'Handle']) || name);
  const id = slugify(sku || slug || `${name}-${rowNumber}`).slice(0, 80);
  const errors = [];

  if (!name) errors.push('Nome obrigatorio.');
  if (!price || price <= 0) errors.push('Preco obrigatorio.');
  if (!image && !images.length) errors.push('Imagem obrigatoria.');
  if (!slug) errors.push('Slug invalido.');
  if (!id || id.length < 2) errors.push('ID invalido.');

  return {
    rowNumber,
    status: errors.length ? 'invalid' : 'valid',
    errors,
    product: {
      id,
      slug,
      name,
      category,
      brand,
      price,
      oldPrice: null,
      badge: null,
      discount: null,
      colors: colors.length ? colors : ['#0a0a0a'],
      image: image || images[0] || '',
      images: image ? [image, ...images.filter(item => item !== image)] : images,
      sizes: sizes.length ? sizes : ['P', 'M', 'G'],
      tag: 'imported',
      active: false,
      importNotes: {
        sku: sku || null,
        stock: Number.isFinite(stock) ? stock : null,
        description: description || null,
      },
    },
  };
}

function parseNuvemshopProductCsv(csvText, { maxRows = 200 } = {}) {
  const rows = parseCsvRows(String(csvText || ''));
  if (rows.length < 2) {
    return { rows: [], validCount: 0, errorCount: 0, totalRows: 0 };
  }

  const headerIndex = buildHeaderIndex(rows[0]);
  const previewRows = rows.slice(1, maxRows + 1).map((row, index) => buildProduct(row, headerIndex, index + 2));
  const validCount = previewRows.filter(row => row.status === 'valid').length;
  const errorCount = previewRows.length - validCount;
  return {
    rows: previewRows,
    validCount,
    errorCount,
    totalRows: rows.length - 1,
    truncated: rows.length - 1 > maxRows,
  };
}

module.exports = { parseNuvemshopProductCsv };
