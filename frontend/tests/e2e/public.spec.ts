import { expect, test } from '@playwright/test';

test.describe('Public pages smoke tests', () => {
  test('home page renders VELKOR brand', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText('VELKOR');
  });

  test('shop page renders product listing', async ({ page }) => {
    await page.goto('/shop');
    const body = page.locator('body');
    const hasTodos = await body.getByText('Todos os', { exact: false }).isVisible().catch(() => false);
    const hasGrid = await page.locator('.product-grid').isVisible().catch(() => false);
    const hasVelkor = await body.getByText('VELKOR', { exact: false }).isVisible().catch(() => false);
    expect(hasTodos || hasGrid || hasVelkor).toBeTruthy();
  });

  test('single product page v01 renders product name Estrato', async ({ page }) => {
    await page.goto('/product/v01');
    await expect(page.locator('body')).toContainText('Estrato');
  });

  test('wishlist page renders Favoritos', async ({ page }) => {
    await page.goto('/wishlist');
    await expect(page.locator('body')).toContainText('Favoritos');
  });

  test('checkout page renders Resumo or Última', async ({ page }) => {
    await page.goto('/checkout');
    const body = page.locator('body');
    const hasResumo = await body.getByText('Resumo', { exact: false }).isVisible().catch(() => false);
    const hasUltima = await body.getByText('Última', { exact: false }).isVisible().catch(() => false);
    expect(hasResumo || hasUltima).toBeTruthy();
  });

  test('account page renders auth UI', async ({ page }) => {
    await page.goto('/account');
    const body = page.locator('body');
    const hasCriar = await body.getByText('Criar conta', { exact: false }).isVisible().catch(() => false);
    const hasConta = await body.getByText('Conta', { exact: false }).isVisible().catch(() => false);
    const hasEntre = await body.getByText('Entre', { exact: false }).isVisible().catch(() => false);
    const hasEmail = await body.getByText('Email', { exact: false }).isVisible().catch(() => false);
    expect(hasCriar || hasConta || hasEntre || hasEmail).toBeTruthy();
  });

  test('admin page renders Admin or Acesso', async ({ page }) => {
    await page.goto('/admin');
    const body = page.locator('body');
    const hasAdmin = await body.getByText('Admin', { exact: false }).isVisible().catch(() => false);
    const hasAcesso = await body.getByText('Acesso', { exact: false }).isVisible().catch(() => false);
    expect(hasAdmin || hasAcesso).toBeTruthy();
  });

  test('unknown page returns 404 status', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');
    expect(response?.status()).toBe(404);
  });
});
