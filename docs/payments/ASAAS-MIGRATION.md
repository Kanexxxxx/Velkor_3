# Migração de pagamentos: Mercado Pago → Asaas

Esta branch adiciona o **Asaas** como provedor de pagamento da VELKOR, mantendo o
Mercado Pago no código como rollback. O fluxo do checkout **não muda**: continua
criando a cobrança no backend e redirecionando o cliente para uma página hospedada
pelo provedor. No Asaas essa página é o *checkout* (PIX, cartão e boleto na mesma
tela), que também coleta CPF/CNPJ do cliente — por isso a VELKOR não precisa pedir
documento no formulário.

## O que muda

| Antes (Mercado Pago) | Agora (Asaas) |
| --- | --- |
| `POST /checkout/preferences` → `init_point` | `POST /v3/checkouts` → `link` |
| Webhook assinado (`x-signature` HMAC) | Webhook com token no header `asaas-access-token` |
| `MERCADO_PAGO_*` no `.env` | `ASAAS_*` no `.env` + `PAYMENT_PROVIDER=asaas` |

O endpoint interno segue o mesmo: `POST /api/payments/create-preference` responde
`{ provider, preferenceId, initPoint, sandbox }` e o webhook segue em
`POST /api/payments/webhook` (detecta automaticamente se o payload é Asaas ou MP).

## Arquivos principais

- `backend/src/services/asaas.js` — cliente Asaas (`createCheckout`, `getPayment`, mapeamento de status).
- `backend/src/services/payment-provider.js` — seletor por `PAYMENT_PROVIDER`.
- `backend/src/routes/payments.js` — rota agnóstica + verificação de webhook dos dois provedores.
- `backend/src/db/payments.js` — persistência com `provider` dinâmico.
- `backend/.env.example` — novas variáveis.

## Passo a passo

### 1. Criar a conta e a API key
1. Crie a conta em https://www.asaas.com e conclua a verificação (KYC) da empresa.
2. Sandbox primeiro: https://sandbox.asaas.com → **Configurações → Integrações → API Key**.
3. Copie a key de sandbox (`$aact_hmlg_...`).

### 2. Configurar o backend (sandbox)
Em `backend/.env`:

```env
PAYMENT_PROVIDER=asaas
ASAAS_API_KEY=$aact_hmlg_xxxxxxxx
ASAAS_API_URL=https://api-sandbox.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=<gere-um-token-aleatorio-forte>
ASAAS_DEV_MODE=true
```

Gere o token: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`

### 3. Configurar o webhook no painel do Asaas
**Configurações → Integrações → Notificações via webhook → Adicionar**:

- URL: `https://volkerr.com.br/api/payments/webhook`
- Token de autenticação: o mesmo valor de `ASAAS_WEBHOOK_TOKEN`
- Versão da API: `v3`
- Eventos: no mínimo `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`,
  `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`.

O Asaas envia o token no header `asaas-access-token`; o backend compara em tempo
constante e responde `401` se não bater.

### 4. Validar em sandbox
1. Suba backend + frontend apontando para o backend.
2. Faça um pedido de teste e vá até o pagamento.
3. Você é redirecionado para o checkout do Asaas (sandbox). Pague com o
   simulador de PIX / cartão de teste do Asaas.
4. Confira:
   - webhook chegou (`paymentWebhookEvent` no banco, `provider = 'asaas'`);
   - `order.paymentStatus = APPROVED` e `order.status = PAID`;
   - e-mail de pagamento aprovado enviado (se SMTP configurado);
   - painel admin → **Pagamentos** mostra "Asaas (ativo)".

### 5. Produção
1. Repita com a key de produção e `ASAAS_API_URL=https://api.asaas.com/v3`.
2. `ASAAS_DEV_MODE=false`.
3. Recrie o webhook apontando para produção com um novo token.
4. Faça uma compra real de valor baixo (ex.: R$ 5 via PIX) e confirme o ciclo completo.

### 6. Rollback
Reverter é só variável de ambiente — sem deploy de código:

```env
PAYMENT_PROVIDER=mercado_pago
```

As credenciais `MERCADO_PAGO_*` continuam válidas. Reinicie o backend (`pm2 reload`).

## Mapeamento de status

| Asaas | VELKOR (`paymentStatus` / `status`) |
| --- | --- |
| `CONFIRMED`, `RECEIVED`, `RECEIVED_IN_CASH` | `APPROVED` / `PAID` |
| `REFUNDED`, `REFUND_REQUESTED`, `CHARGEBACK_REQUESTED` | `REFUNDED` / — |
| `OVERDUE`, `DELETED`, `CANCELED` | `REJECTED` / — |
| outros (`PENDING`, `AWAITING_RISK_ANALYSIS`, …) | `PENDING` / — |

## Pendências conhecidas / decisões

- **`externalReference`**: o `id` do pedido VELKOR é enviado no checkout e o Asaas
  o propaga para a cobrança gerada, então o webhook casa por `payment.externalReference`.
  Se algum evento chegar sem `externalReference`, ele é gravado em
  `paymentWebhookEvent` mas não atualiza pedido (verificar manualmente).
- **Reembolso**: hoje o webhook marca `paymentStatus = REFUNDED` mas não altera
  `order.status`. Ajustar conforme a política de estorno.
- **Split / taxas**: não configurado. O valor cobrado é `order.totalCents`.
- **Boleto**: habilitado por padrão em `ASAAS_BILLING_TYPES`. Remova se não quiser.
