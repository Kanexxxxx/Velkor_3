function boolEnv(value) {
  return String(value).toLowerCase() === 'true';
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
        items: (order.items?.length ? order.items : [{ name: `Pedido VELKOR ${order.id}`, quantity: 1, unitPriceCents: Number(order.totalCents || 0) }]).map(item => ({
          title: `Pedido VELKOR ${order.id}`,
          description: item.name || `Pedido VELKOR ${order.id}`,
          quantity: Number(item.quantity || 1),
          currency_id: 'BRL',
          unit_price: Number(item.unitPriceCents || order.totalCents || 0) / 100,
        })),
        payer: {
          name: order.contactName || undefined,
          email: order.email || undefined,
        },
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
