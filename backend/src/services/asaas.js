// Integração de pagamentos Asaas (PIX, cartão e boleto via checkout hospedado).
// O checkout do Asaas coleta os dados do cliente (inclusive CPF/CNPJ) na própria
// página, então o fluxo da VELKOR continua sendo apenas "cria e redireciona".

function boolEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

function isoDatePlusDays(days) {
  return new Date(Date.now() + Number(days || 0) * 86_400_000).toISOString().slice(0, 10);
}

function asaasErrorMessage(body) {
  return (
    body?.errors?.[0]?.description ||
    body?.message ||
    body?.error ||
    'Erro ao comunicar com o Asaas.'
  );
}

const PAID_STATUSES = new Set(['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH']);
const REFUNDED_STATUSES = new Set(['REFUNDED', 'REFUND_REQUESTED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE']);
const FAILED_STATUSES = new Set(['OVERDUE', 'DELETED', 'CANCELED', 'CANCELLED']);

function mapAsaasStatus(status) {
  const value = String(status || '').toUpperCase();
  if (PAID_STATUSES.has(value)) return { paymentStatus: 'APPROVED', orderStatus: 'PAID' };
  if (REFUNDED_STATUSES.has(value)) return { paymentStatus: 'REFUNDED', orderStatus: null };
  if (FAILED_STATUSES.has(value)) return { paymentStatus: 'REJECTED', orderStatus: null };
  return { paymentStatus: 'PENDING', orderStatus: null };
}

function isAsaasPaidStatus(status) {
  return PAID_STATUSES.has(String(status || '').toUpperCase());
}

function createAsaasClient(env = process.env) {
  const apiKey = env.ASAAS_API_KEY || '';
  const baseUrl = (env.ASAAS_API_URL || 'https://api.asaas.com/v3').replace(/\/$/, '');
  const devMode = boolEnv(env.ASAAS_DEV_MODE, !apiKey);
  const publicUrl = (env.VELKOR_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
  const dueDays = Number(env.ASAAS_PAYMENT_DUE_DAYS || 3);
  const minutesToExpire = Number(env.ASAAS_CHECKOUT_EXPIRES_MIN || 60);
  const billingTypes = String(env.ASAAS_BILLING_TYPES || 'PIX,CREDIT_CARD,BOLETO')
    .split(',')
    .map(part => part.trim().toUpperCase())
    .filter(Boolean);

  async function asaasRequest(pathname, init = {}) {
    const headers = {
      access_token: apiKey,
      'User-Agent': 'velkor-backend/1.0',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    };
    const response = await fetch(`${baseUrl}${pathname}`, { ...init, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(asaasErrorMessage(data));
      error.statusCode = 502;
      throw error;
    }
    return data;
  }

  function buildItems(order) {
    const items = Array.isArray(order.items) ? order.items : [];
    if (!items.length) {
      return [{
        name: `Pedido VELKOR ${order.id}`,
        description: `Pedido VELKOR ${order.id}`,
        quantity: 1,
        value: Number(order.totalCents || 0) / 100,
      }];
    }
    const lines = items.map(item => ({
      name: item.name || `Item ${item.productId || order.id}`,
      description: item.name || `Item ${item.productId || order.id}`,
      quantity: Number(item.quantity || 1),
      value: Number(item.unitPriceCents || 0) / 100,
    }));
    const shippingCents = Number(order.shippingCents || 0);
    if (shippingCents > 0) {
      lines.push({ name: 'Frete', description: 'Frete', quantity: 1, value: shippingCents / 100 });
    }
    const discountCents = Number(order.discountCents || 0);
    if (discountCents > 0) {
      lines.push({ name: 'Desconto', description: 'Desconto', quantity: 1, value: -(discountCents / 100) });
    }
    return lines;
  }

  function buildCustomerData(order) {
    const data = {
      ...(order.contactName ? { name: order.contactName } : {}),
      ...(order.email ? { email: order.email } : {}),
      ...(order.contactPhone ? { phone: onlyDigits(order.contactPhone) } : {}),
    };
    const address = order.shippingAddress;
    if (address?.postalCode) {
      data.postalCode = onlyDigits(address.postalCode);
      if (address.number) data.addressNumber = String(address.number);
    }
    return Object.keys(data).length ? data : undefined;
  }

  async function createCheckout({ order }) {
    if (!apiKey) {
      return {
        provider: 'asaas',
        checkoutId: `dev_${order.id}`,
        redirectUrl: `${publicUrl}/account?tab=orders&mock_payment=${encodeURIComponent(order.id)}`,
        sandbox: true,
      };
    }

    const body = {
      billingTypes,
      chargeTypes: ['DETACHED'],
      minutesToExpire,
      externalReference: order.id,
      callback: {
        successUrl: `${publicUrl}/account?tab=orders`,
        cancelUrl: `${publicUrl}/checkout`,
        autoRedirect: true,
      },
      items: buildItems(order),
      dueDate: isoDatePlusDays(dueDays),
    };
    const customerData = buildCustomerData(order);
    if (customerData) body.customerData = customerData;

    const checkout = await asaasRequest('/checkouts', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const redirectUrl = checkout.link || checkout.url || checkout.checkoutUrl;
    if (!redirectUrl) {
      const error = new Error('Asaas não retornou o link do checkout.');
      error.statusCode = 502;
      throw error;
    }
    return {
      provider: 'asaas',
      checkoutId: checkout.id,
      redirectUrl,
      sandbox: devMode,
    };
  }

  async function getPayment(paymentId) {
    if (!apiKey || !paymentId) return null;
    return asaasRequest(`/payments/${encodeURIComponent(paymentId)}`);
  }

  return { id: 'asaas', createCheckout, getPayment };
}

module.exports = {
  createAsaasClient,
  mapAsaasStatus,
  isAsaasPaidStatus,
  onlyDigits,
};
