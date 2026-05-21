const CATEGORY_ALIASES = [
  { match: ['tenis', 'sneaker', 'calcado', 'sapato', 'chuteira', 'sandalia', 'chinelo', 'bota'], category: 'sneakers' },
  { match: ['vestuario', 'roupa', 'camiseta', 'calca', 'moletom', 'apparel', 'camisa', 'shorts', 'bermuda'], category: 'apparel' },
  { match: ['acessorio', 'bone', 'bolsa', 'meia', 'accessor', 'oculos', 'relogio', 'carteira'], category: 'accessories' },
];

const VARIATION_PAIRS = [
  ['nomedavariacao1', 'valordavariacao1'],
  ['nomedavariacao2', 'valordavariacao2'],
  ['nomedavariacao3', 'valordavariacao3'],
  // without "da" fallback for other CSV dialects
  ['nomevariacao1', 'valorvariacao1'],
  ['nomevariacao2', 'valorvariacao2'],
  ['nomevariacao3', 'valorvariacao3'],
];

function normalizeHeader(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeText(value, max = 500) {
  return String(value || '').trim().slice(0, max);
}

function slugify(value) {
  return normalizeText(value, 120)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

function detectDelimiter(firstLine) {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons >= commas ? ';' : ',';
}

function parseCsvRows(csvText) {
  const firstNewline = csvText.indexOf('\n');
  const firstLine = firstNewline === -1 ? csvText : csvText.slice(0, firstNewline);
  const delimiter = detectDelimiter(firstLine);

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

    if (char === delimiter && !quoted) {
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

function buildProductFromGroup(rows, headerIndex, groupNumber) {
  const firstRow = rows[0];

  const name = getField(firstRow, headerIndex, ['Nome', 'Nombre', 'Name', 'Produto', 'Producto']);
  const priceRaw = getField(firstRow, headerIndex, ['Preco', 'Precio', 'Price', 'Preço', 'Preco promocional', 'Preço promocional']);
  const price = parsePrice(priceRaw);
  const sku = getField(firstRow, headerIndex, ['SKU', 'Codigo SKU', 'Código SKU', 'Codigo', 'Código']);
  const categoryRaw = getField(firstRow, headerIndex, ['Categoria', 'Categoría', 'Category', 'Categories', 'Categorias']);
  // Fall back to product name for category inference when field is empty
  const category = mapCategory(categoryRaw || name);
  const brand = getField(firstRow, headerIndex, ['Marca', 'Brand']) || 'VOLKERR';
  const description = getField(firstRow, headerIndex, ['Descricao', 'Descripción', 'Description', 'Descricao curta', 'Descrição']);
  const image = getField(firstRow, headerIndex, ['Imagem', 'Imagen', 'Image', 'URL da imagem', 'URL de imagem', 'Foto']);
  const imagesRaw = parseList(getField(firstRow, headerIndex, ['Imagens', 'Imagenes', 'Images', 'Galeria'])).filter(Boolean);

  const urlId = getField(firstRow, headerIndex, ['Identificador URL', 'IdentificadorURL', 'Handle', 'Slug', 'URL']);
  const slug = slugify(urlId || name);
  const id = slugify(sku || slug || `${name}-${groupNumber}`).slice(0, 80);

  // Aggregate sizes and colors across all variant rows
  const sizesSet = new Set();
  const colorsSet = new Set();

  for (const row of rows) {
    for (const [nameKey, valueKey] of VARIATION_PAIRS) {
      const nameCol = headerIndex.get(nameKey);
      const valueCol = headerIndex.get(valueKey);
      if (nameCol === undefined || valueCol === undefined) continue;
      const varName = normalizeHeader(row[nameCol] || '');
      const varValue = normalizeText(row[valueCol] || '', 80);
      if (!varValue) continue;
      if (varName === 'tamanho') sizesSet.add(varValue);
      if (varName === 'cor') colorsSet.add(varValue);
    }
  }

  const sizes = sizesSet.size > 0
    ? Array.from(sizesSet)
    : parseList(getField(firstRow, headerIndex, ['Tamanhos', 'Talles', 'Sizes']));

  const colors = colorsSet.size > 0
    ? Array.from(colorsSet)
    : parseList(getField(firstRow, headerIndex, ['Cores', 'Colores', 'Colors']));

  const stock = rows.reduce((total, row) => {
    const s = Number(getField(row, headerIndex, ['Estoque', 'Stock', 'Quantidade']));
    return total + (Number.isFinite(s) && s > 0 ? s : 0);
  }, 0);

  const errors = [];
  if (!name) errors.push('Nome obrigatorio.');
  if (!price || price <= 0) errors.push('Preco obrigatorio.');
  if (!slug) errors.push('Slug invalido.');
  if (!id || id.length < 2) errors.push('ID invalido.');

  return {
    rowNumber: groupNumber,
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
      image: image || imagesRaw[0] || '',
      images: image ? [image, ...imagesRaw.filter(item => item !== image)] : imagesRaw,
      sizes: sizes.length ? sizes : [],
      tag: 'imported',
      active: false,
      importNotes: {
        sku: sku || null,
        stock,
        description: description || null,
        imageWarning: !image && !imagesRaw.length,
      },
    },
  };
}

async function fetchOgImage(pageUrl, timeoutMs = 3000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(pageUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VelkorAdmin/1.0)' },
      });
      if (!response.ok) return '';
      const html = await response.text();
      const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      return match ? match[1].trim() : '';
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return '';
  }
}

async function enrichWithStoreImages(parsedResult, storeBaseUrl) {
  if (!storeBaseUrl || !parsedResult.rows.length) return parsedResult;

  const baseUrl = storeBaseUrl.replace(/\/+$/, '');
  const toEnrich = parsedResult.rows.filter(row => row.status !== 'invalid' && !row.product.image && row.product.slug);

  for (let i = 0; i < toEnrich.length; i += 5) {
    const batch = toEnrich.slice(i, i + 5);
    await Promise.all(batch.map(async (row) => {
      const pageUrl = `${baseUrl}/produtos/${row.product.slug}/`;
      const image = await fetchOgImage(pageUrl);
      if (image) {
        row.product.image = image;
        if (!row.product.images || !row.product.images.length) row.product.images = [image];
        if (row.product.importNotes) row.product.importNotes.imageWarning = false;
      }
    }));
  }

  return parsedResult;
}

function parseNuvemshopProductCsv(csvText, { maxRows = 200 } = {}) {
  const rows = parseCsvRows(String(csvText || ''));
  if (rows.length < 2) {
    return { rows: [], validCount: 0, errorCount: 0, totalRows: 0 };
  }

  const headerIndex = buildHeaderIndex(rows[0]);
  const dataRows = rows.slice(1);

  const hasUrlIdentifier = headerIndex.has('identificadorurl');

  let productRows;
  let totalProducts;

  if (hasUrlIdentifier) {
    const slugCol = headerIndex.get('identificadorurl');
    const groups = new Map();
    const groupOrder = [];

    for (const row of dataRows) {
      const slug = normalizeText(row[slugCol] || '');
      if (!slug) continue;
      if (!groups.has(slug)) {
        groups.set(slug, []);
        groupOrder.push(slug);
      }
      groups.get(slug).push(row);
    }

    totalProducts = groupOrder.length;
    productRows = groupOrder.slice(0, maxRows).map((slug, index) =>
      buildProductFromGroup(groups.get(slug), headerIndex, index + 2)
    );
  } else {
    totalProducts = dataRows.length;
    productRows = dataRows.slice(0, maxRows).map((row, index) =>
      buildProductFromGroup([row], headerIndex, index + 2)
    );
  }

  const validCount = productRows.filter(row => row.status === 'valid').length;
  const errorCount = productRows.length - validCount;

  return {
    rows: productRows,
    validCount,
    errorCount,
    totalRows: totalProducts,
    truncated: totalProducts > maxRows,
  };
}

module.exports = { parseNuvemshopProductCsv, enrichWithStoreImages };
