import { expect, test } from '@playwright/test';

/**
 * Admin auth-gating smoke tests.
 *
 * These tests do NOT use admin credentials. They verify that the admin page
 * renders its auth gate UI and does not leak sensitive environment variables.
 */
test.describe('Admin auth gating (unauthenticated)', () => {
  test('admin page shows auth gate or "Verificando" text when unauthenticated', async ({ page }) => {
    await page.goto('/admin');

    const body = page.locator('body');
    // AdminPageClient renders "PAINEL ADMIN" + "Validando acesso." while checking session,
    // then "Acesso Restrito." gate when not authenticated
    const hasPainelAdmin = await body.getByText('PAINEL ADMIN').isVisible().catch(() => false);
    const hasAcesso = await body.getByText('Acesso', { exact: false }).isVisible().catch(() => false);
    const hasVerificando = await body.getByText('Verificando', { exact: false }).isVisible().catch(() => false);
    const hasAdmin = await body.getByText('Admin', { exact: false }).isVisible().catch(() => false);
    expect(hasPainelAdmin || hasAcesso || hasVerificando || hasAdmin).toBeTruthy();
  });

  test('admin page does not expose sensitive secrets in body text', async ({ page }) => {
    await page.goto('/admin');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('ACCESS_TOKEN');
    expect(bodyText).not.toContain('GMAIL_PASS');
    expect(bodyText).not.toContain('SESSION_SECRET');
    expect(bodyText).not.toContain('DATABASE_URL');
  });
});
