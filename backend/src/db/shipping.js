const { getPrisma } = require('./client');

function makeError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeText(value, max = 120) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function validateShippingInput(input) {
  if (!input || typeof input !== 'object') return { error: 'Payload invalido.' };
  if (!Array.isArray(input.items) || input.items.length === 0) return { error: 'Carrinho vazio.' };
  const postalCode = normalizeText(input.postalCode || input.toPostalCode, 20);
  if (!postalCode) return { error: 'CEP invalido.' };

  for (const item of input.items) {
    const quantity = Number(item?.quantity);
    if (!item || typeof item.productId !== 'string' || !item.productId.trim()) return { error: 'Produto invalido.' };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return { error: 'Quantidade invalida.' };
  }

  return {
    value: {
      postalCode,
      items: input.items.map(item => ({
        productId: normalizeText(item.productId, 80),
        quantity: Number(item.quantity),
      })),
    },
  };
}

async function buildShippingQuoteInput(prisma, input) {
  const productIds = Array.from(new Set(input.items.map(item => item.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, active: true },
  });
  const productById = new Map(products.map(product => [product.id, product]));

  const items = input.items.map(item => {
    const product = productById.get(item.productId);
    if (!product) throw makeError(`Produto nao encontrado: ${item.productId}`, 404);
    return {
      ...item,
      unitPriceCents: product.priceCents,
    };
  });
  const subtotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  return { toPostalCode: input.postalCode, items, subtotalCents };
}

async function quoteCartShipping(rawInput, shippingService) {
  const parsed = validateShippingInput(rawInput);
  if (parsed.error) throw makeError(parsed.error);
  if (!shippingService?.quoteShipping) throw makeError('Frete indisponivel.', 503);

  const prisma = getPrisma();
  const quoteInput = prisma
    ? await buildShippingQuoteInput(prisma, parsed.value)
    : { toPostalCode: parsed.value.postalCode, items: parsed.value.items, subtotalCents: 0 };

  return shippingService.quoteShipping(quoteInput);
}

module.exports = { buildShippingQuoteInput, quoteCartShipping, validateShippingInput };
