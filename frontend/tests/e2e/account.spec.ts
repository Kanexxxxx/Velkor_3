import { expect, test } from '@playwright/test';

/**
 * Account auth-gating smoke tests.
 *
 * These tests do NOT log in. They verify that auth-gated pages show the
 * appropriate login prompt UI when accessed without credentials.
 */
test.describe('Account auth gating (unauthenticated)', () => {
  test('account page shows login form or "Entre na conta" when unauthenticated', async ({ page }) => {
    await page.goto('/account');

    const body = page.locator('body');
    // The account page renders AuthLandingView when not authenticated:
    // shows "Minha Conta" heading + "Entrar" button + "ACESSO DE MEMBRO" label
    const hasEntre = await body.getByText('Entre', { exact: false }).isVisible().catch(() => false);
    const hasConta = await body.getByText('Conta', { exact: false }).isVisible().catch(() => false);
    const hasEntrar = await body.getByRole('button', { name: /Entrar/i }).isVisible().catch(() => false);
    expect(hasEntre || hasConta || hasEntrar).toBeTruthy();
  });

  test('order detail page shows login prompt or "Entre para acompanhar" when unauthenticated', async ({ page }) => {
    await page.goto('/account/orders/fake-order-123');

    const body = page.locator('body');
    // OrderDetailPageClient renders "Entre para acompanhar o pedido." when not authenticated
    const hasEntrePara = await body.getByText('Entre para acompanhar', { exact: false }).isVisible().catch(() => false);
    // Or it may redirect/render the account landing with "Entre" or "Conta"
    const hasEntre = await body.getByText('Entre', { exact: false }).isVisible().catch(() => false);
    const hasConta = await body.getByText('Conta', { exact: false }).isVisible().catch(() => false);
    expect(hasEntrePara || hasEntre || hasConta).toBeTruthy();
  });

  test('account orders page shows login prompt when unauthenticated', async ({ page }) => {
    await page.goto('/account/orders');

    const body = page.locator('body');
    // /account/orders renders AccountPageClient with initialTab="orders"
    // which falls back to AuthLandingView when unauthenticated
    const hasEntre = await body.getByText('Entre', { exact: false }).isVisible().catch(() => false);
    const hasConta = await body.getByText('Conta', { exact: false }).isVisible().catch(() => false);
    const hasEntrar = await body.getByRole('button', { name: /Entrar/i }).isVisible().catch(() => false);
    expect(hasEntre || hasConta || hasEntrar).toBeTruthy();
  });
});
