function cleanPostalCode(value) {
  return String(value || '').replace(/\D/g, '');
}

function boolEnv(value) {
  return String(value).toLowerCase() === 'true';
}

function getBaseUrl(env) {
  return String(env.MELHOR_ENVIO_ENV || 'sandbox').toLowerCase() === 'production'
    ? 'https://www.melhorenvio.com.br'
    : 'https://sandbox.melhorenvio.com.br';
}

function makeFallbackQuote() {
  return {
    id: 'standard',
    provider: 'fallback',
    name: 'Frete padrao',
    price: 0,
    priceCents: 0,
    deliveryTime: 6,
  };
}

function parseMarkupCents(value) {
  if (value === undefined || value === null || value === '') return 1500;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed);
}

function centsToMoney(cents) {
  return Number((Number(cents || 0) / 100).toFixed(2));
}

function mapQuote(raw, options = {}) {
  if (!raw || raw.error) return null;
  const price = Number(raw.price);
  if (!Number.isFinite(price) || price < 0) return null;
  const id = raw.id ? `melhor-envio:${raw.id}` : `melhor-envio:${String(raw.name || 'servico').toLowerCase()}`;
  const basePriceCents = Math.round(price * 100);
  const priceCents = basePriceCents + parseMarkupCents(options.markupCents);
  return {
    id,
    provider: 'melhor-envio',
    name: String(raw.name || 'Entrega'),
    price: centsToMoney(priceCents),
    priceCents,
    deliveryTime: Number(raw.delivery_time || raw.deliveryTime || 0),
  };
}

function parseAllowedServices(value) {
  return String(value || '1,2')
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedService(raw, allowedServices) {
  const id = String(raw?.id || '').toLowerCase();
  const name = String(raw?.name || '').toLowerCase();
  return allowedServices.includes(id) || allowedServices.includes(name);
}

function buildProducts(items, subtotalCents) {
  const insuranceValue = Math.max(1, Math.round(Number(subtotalCents || 0) / 100));
  return (items || []).map((item, index) => ({
    id: String(item.productId || `item-${index + 1}`),
    width: 16,
    height: 8,
    length: 24,
    weight: Math.max(0.3, Number(item.quantity || 1) * 0.3),
    insurance_value: insuranceValue,
    quantity: Number(item.quantity || 1),
  }));
}

function createShippingClient(env = process.env, { fetchImpl = fetch } = {}) {
  const accessToken = env.MELHOR_ENVIO_ACCESS_TOKEN || '';
  const originPostalCode = cleanPostalCode(env.MELHOR_ENVIO_ORIGIN_CEP);
  const devFallback = boolEnv(env.MELHOR_ENVIO_DEV_FALLBACK ?? 'false');
  const allowedServices = parseAllowedServices(env.MELHOR_ENVIO_ALLOWED_SERVICES);
  const markupCents = parseMarkupCents(env.MELHOR_ENVIO_PRICE_MARKUP_CENTS);

  async function quoteShipping({ toPostalCode, items, subtotalCents }) {
    const destinationPostalCode = cleanPostalCode(toPostalCode);
    if (destinationPostalCode.length !== 8) {
      const error = new Error('CEP invalido.');
      error.statusCode = 400;
      throw error;
    }

    if (!accessToken || originPostalCode.length !== 8) {
      if (devFallback) return { quotes: [makeFallbackQuote()], storage: 'fallback' };
      const error = new Error('Melhor Envio nao configurado.');
      error.statusCode = 503;
      throw error;
    }

    const response = await fetchImpl(`${getBaseUrl(env)}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'VELKOR checkout (contato@volkerr.com.br)',
      },
      body: JSON.stringify({
        from: { postal_code: originPostalCode },
        to: { postal_code: destinationPostalCode },
        products: buildProducts(items, subtotalCents),
        options: {
          receipt: false,
          own_hand: false,
          collect: false,
        },
      }),
    });

    const data = await response.json().catch(() => []);
    if (!response.ok) {
      const error = new Error('Nao foi possivel calcular o frete.');
      error.statusCode = response.status;
      error.details = data;
      throw error;
    }

    const quotes = (Array.isArray(data) ? data : [])
      .filter(item => isAllowedService(item, allowedServices))
      .map(item => mapQuote(item, { markupCents }))
      .filter(Boolean);
    if (!quotes.length) {
      const error = new Error('Nenhuma opcao de frete disponivel para este CEP.');
      error.statusCode = 422;
      throw error;
    }

    return { quotes, storage: 'melhor-envio' };
  }

  return { quoteShipping };
}

module.exports = { cleanPostalCode, createShippingClient, isAllowedService, mapQuote, parseAllowedServices, parseMarkupCents };
