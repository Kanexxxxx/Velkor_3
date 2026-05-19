function boolEnv(value) {
  return String(value).toLowerCase() === 'true';
}

const categoryMap = {
  accessories: 'fashion',
  apparel: 'fashion',
  sneakers: 'fashion',
};

function splitName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || undefined,
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : undefined,
  };
}

function parseBrazilPhone(value = '') {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 10) return null;
  const local = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;
  return {
    area_code: local.slice(0, 2),
    number: local.slice(2),
  };
}

function buildPayer(order) {
  const { firstName, lastName } = splitName(order.contactName);
  const phone = parseBrazilPhone(order.contactPhone);
  const address = order.shippingAddress;
  return {
    ...(firstName ? { first_name: firstName, name: firstName } : {}),
    ...(lastName ? { last_name: lastName, surname: lastName } : {}),
    ...(order.email ? { email: order.email } : {}),
    ...(phone ? { phone } : {}),
    ...(address ? {
      address: {
        ...(address.street ? { street_name: address.street } : {}),
        ...(address.number ? { street_number: Number(String(address.number).replace(/\D/g, '')) || undefined } : {}),
        ...(address.postalCode ? { zip_code: String(address.postalCode).replace(/\D/g, '') } : {}),
      },
    } : {}),
  };
}

function createMercadoPagoClient(env = process.env) {
  const accessToken = env.MERCADO_PAGO_ACCESS_TOKEN || '';
  const devMode = boolEnv(env.MERCADO_PAGO_DEV_MODE ?? 'true');
  const publicUrl = (env.VELKOR_PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');

  async function createPreference({ order }) {
    if (!accessToken) {
      return {
        provider: 'mercado_pago',
        preferenceId: `dev_${order.id}`,
        initPoint: `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=dev_${order.id}`,
        sandbox: true,
      };
    }

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        external_reference: order.id,
        items: (order.items?.length ? order.items : [{ productId: order.id, name: `Pedido VELKOR ${order.id}`, quantity: 1, unitPriceCents: Number(order.totalCents || 0) }]).map(item => ({
          id: item.productId || item.id || order.id,
          title: item.name || `Pedido VELKOR ${order.id}`,
          description: item.name || `Pedido VELKOR ${order.id}`,
          category_id: categoryMap[item.category] || 'fashion',
          picture_url: item.image || undefined,
          quantity: Number(item.quantity || 1),
          currency_id: 'BRL',
          unit_price: Number(item.unitPriceCents || order.totalCents || 0) / 100,
        })),
        payer: buildPayer(order),
        back_urls: {
          success: `${publicUrl}/account?tab=orders`,
          pending: `${publicUrl}/account?tab=orders`,
          failure: `${publicUrl}/checkout`,
        },
        notification_url: env.MERCADO_PAGO_WEBHOOK_URL || `${publicUrl}/api/payments/webhook`,
        auto_return: 'approved',
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Mercado Pago preference failed: ${response.status}`);
    return {
      provider: 'mercado_pago',
      preferenceId: data.id,
      initPoint: devMode && data.sandbox_init_point ? data.sandbox_init_point : data.init_point || data.sandbox_init_point,
      sandbox: devMode || Boolean(data.sandbox_init_point),
    };
  }

  async function getPayment(paymentId) {
    if (!accessToken) return null;
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Mercado Pago payment failed: ${response.status}`);
    return data;
  }

  return { createPreference, getPayment };
}

module.exports = { createMercadoPagoClient };
