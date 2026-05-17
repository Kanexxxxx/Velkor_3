import { expect, test } from '@playwright/test';

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.com`;
}

test.describe('VOLKERR core flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/**', route => route.abort());
  });

  test('registers a user and opens the account dashboard', async ({ page }) => {
    await page.goto('/account');

    await page.getByLabel('Nome').fill('Cliente E2E');
    await page.getByLabel('Email').last().fill(uniqueEmail());
    await page.getByLabel('Senha').last().fill('senha123');
    await page.getByRole('button', { name: /^Criar conta$/ }).click();

    await expect(page.getByRole('heading', { name: /Dados do perfil/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sair da conta/i })).toBeVisible();
  });

  test('adds a product to cart and reaches checkout', async ({ page }) => {
    await page.goto('/product/v01');

    await page.getByRole('button', { name: /Adicionar .* sacola/i }).click();
    await expect(page.getByRole('link', { name: /Ir para o checkout/i })).toBeVisible();

    await page.getByRole('link', { name: /Ir para o checkout/i }).click();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByRole('heading', { name: /Etapa/i })).toBeVisible();
    await expect(page.getByLabel('Nome')).toBeVisible();
    await expect(page.getByRole('button', { name: /Finalizar Pedido/i })).toBeVisible();
  });

  test('submits checkout with local fallback when the API is unavailable', async ({ page }) => {
    await page.goto('/product/v01');
    await page.getByRole('button', { name: /Adicionar .* sacola/i }).click();
    await page.getByRole('link', { name: /Ir para o checkout/i }).click();

    await page.getByLabel('Nome').fill('Cliente Checkout');
    await page.getByLabel('Email').fill(uniqueEmail());
    await page.getByLabel('Telefone').fill('+55 16 99999-9999');
    await page.getByLabel('Quem recebe').fill('Cliente Checkout');
    await page.getByLabel(/CEP/i).fill('14000-000');
    await page.getByLabel(/Endereco|Endereço/i).fill('Rua Teste, 123');
    await page.getByLabel('Cidade').fill('Ribeirao Preto');
    await page.getByLabel('Estado').fill('SP');

    await page.getByRole('button', { name: /Finalizar Pedido/i }).click();

    await expect(page.getByText(/Pedido .* salvo localmente|Pedido criado com sucesso/i)).toBeVisible();
  });

  test('renders navbar, footer, SEO support pages, and mobile menu', async ({ page, isMobile }) => {
    await page.goto('/');

    await expect(page.getByRole('link', { name: /VELKOR/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Loja/i }).first()).toBeVisible();
    await expect(page.getByRole('contentinfo')).toContainText('VELKOR');

    const robots = await page.request.get('/robots.txt');
    expect(robots.ok()).toBeTruthy();
    expect(await robots.text()).toContain('Disallow: /admin');

    const sitemap = await page.request.get('/sitemap.xml');
    expect(sitemap.ok()).toBeTruthy();
    expect(await sitemap.text()).toContain('/shop');

    if (isMobile) {
      await page.getByRole('button', { name: /Abrir menu/i }).click();
      await expect(page.getByRole('link', { name: /Entrar \/ Criar conta/i })).toBeVisible();
    }
  });
});
