// Seletor de provedor de pagamento.
//
// PAYMENT_PROVIDER=asaas         -> checkout hospedado do Asaas (PIX, cartão, boleto)
// PAYMENT_PROVIDER=mercado_pago  -> preference do Mercado Pago (padrão legado / rollback)
//
// Ambos expõem a mesma interface:
//   createCheckout({ order }) -> { provider, checkoutId, redirectUrl, sandbox }
//   getPayment(externalId)    -> objeto cru do provedor (ou null em dev)

const { createMercadoPagoClient } = require('./mercado-pago');
const { createAsaasClient } = require('./asaas');

function normalizeProviderId(value) {
  const id = String(value || '').trim().toLowerCase();
  if (id === 'asaas') return 'asaas';
  if (id === 'mercado_pago' || id === 'mercadopago' || id === 'mp') return 'mercado_pago';
  return 'mercado_pago';
}

function wrapMercadoPago(client) {
  return {
    id: 'mercado_pago',
    async createCheckout({ order }) {
      const preference = await client.createPreference({ order });
      return {
        provider: 'mercado_pago',
        checkoutId: preference.preferenceId,
        redirectUrl: preference.initPoint,
        sandbox: Boolean(preference.sandbox),
      };
    },
    getPayment: paymentId => client.getPayment(paymentId),
  };
}

function resolvePaymentProvider(env = process.env) {
  const id = normalizeProviderId(env.PAYMENT_PROVIDER);
  if (id === 'asaas') return createAsaasClient(env);
  return wrapMercadoPago(createMercadoPagoClient(env));
}

module.exports = { resolvePaymentProvider, normalizeProviderId };
