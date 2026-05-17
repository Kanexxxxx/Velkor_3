import { API_BASE_URL } from '@/services/api';
import { getGuestSessionId } from '@/services/guestSession';

export interface PaymentPreference {
  provider: 'mercado_pago';
  preferenceId: string;
  initPoint: string;
  sandbox: boolean;
}

export async function createPaymentPreference(orderId: string): Promise<PaymentPreference> {
  const sessionId = getGuestSessionId();
  if (!sessionId) throw new Error('Sessao indisponivel.');

  const response = await fetch(`${API_BASE_URL}/api/payments/create-preference`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Velkor-Session': sessionId,
    },
    body: JSON.stringify({ orderId }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(data.error ?? 'Nao foi possivel iniciar Mercado Pago.');
  return data as PaymentPreference;
}
