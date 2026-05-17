function boolEnv(value) {
  return String(value).toLowerCase() === 'true';
}

function createMercadoPagoClient(env = process.env) {
  const accessToken = env.MERCADO_PAGO_ACCESS_TOKEN || '';
  const devMode = boolEnv(env.MERCADO_PAGO_DEV_MODE ?? 'true') || !accessToken;

  async function createPreference({ order }) {
    if (devMode) {
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
        items: [{
          title: `Pedido VELKOR ${order.id}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(order.totalCents || 0) / 100,
        }],
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Mercado Pago preference failed: ${response.status}`);
    return {
      provider: 'mercado_pago',
      preferenceId: data.id,
      initPoint: data.sandbox_init_point || data.init_point,
      sandbox: Boolean(data.sandbox_init_point),
    };
  }

  async function getPayment(paymentId) {
    if (devMode) return null;
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
