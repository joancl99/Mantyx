import { expect, test, Page } from '@playwright/test';

/**
 * Browser flows against the real stack. Accounts and the company catalog
 * are seeded by support/start-api.cjs before the API boots; the database
 * is wiped on every run, so the flows are deterministic.
 */
const ADMIN = { email: 'admin@web-e2e.test', password: 'Admin-Pass123!' };
const VIEWER = { email: 'viewer@web-e2e.test', password: 'Viewer-Pass123!' };
const SUPERADMIN = {
  email: 'superadmin@web-e2e.test',
  password: 'Super-Pass123!',
};

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

async function openMenu(page: Page) {
  await page.locator('ion-menu-button').first().click();
  await expect(page.locator('ion-menu .menu-nav')).toBeVisible();
}

function menuLabels(page: Page) {
  return page.locator('ion-menu .menu-item-label');
}

test('redirects unauthenticated visitors to the login page', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
  await expect(page.getByText('Precisión para tu almacén')).toBeVisible();
});

test('shows an error banner for wrong credentials', async ({ page }) => {
  // Unknown account so the attempt never feeds the per-account lockout.
  await login(page, 'nobody@web-e2e.test', 'wrong-password');

  await expect(page.locator('.error-banner')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('logs in as ADMIN with a role-scoped menu', async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);

  await expect(page).toHaveURL(/\/app\/dashboard$/);
  await openMenu(page);
  await expect(page.locator('.menu-role-badge')).toContainText('ADMIN');
  await expect(menuLabels(page).filter({ hasText: 'Productos' })).toBeVisible();
  await expect(
    menuLabels(page).filter({ hasText: 'Administración' }),
  ).toBeVisible();
});

test('creates a product end-to-end from the Productos page', async ({
  page,
}) => {
  const productName = 'Producto Playwright';
  const sku = `PW-${Date.now()}`;

  await login(page, ADMIN.email, ADMIN.password);
  await expect(page).toHaveURL(/\/app\/dashboard$/);

  await openMenu(page);
  await page
    .locator('ion-menu .menu-item')
    .filter({ hasText: 'Productos' })
    .click();
  await expect(page).toHaveURL(/\/app\/products$/);

  await page.getByRole('button', { name: 'Nuevo producto' }).click();
  await page.locator('#prod-name').fill(productName);
  await page.locator('#prod-sku').fill(sku);
  await page.locator('#prod-minstock').fill('5');
  await page.locator('#prod-category').selectOption({ label: 'Categoría E2E' });
  await page.getByRole('button', { name: 'Crear producto' }).click();

  // The modal closes and the list reloads with the new product.
  await expect(page.locator('.modal')).toHaveCount(0);
  await expect(page.getByText(productName)).toBeVisible();
  await expect(page.getByText(sku)).toBeVisible();
});

test('VIEWER gets a read-only menu and can log out', async ({ page }) => {
  await login(page, VIEWER.email, VIEWER.password);

  await expect(page).toHaveURL(/\/app\/dashboard$/);
  await openMenu(page);
  await expect(page.locator('.menu-role-badge')).toContainText('VIEWER');
  await expect(menuLabels(page).filter({ hasText: 'Stock' })).toBeVisible();
  await expect(menuLabels(page).filter({ hasText: 'Productos' })).toHaveCount(
    0,
  );
  await expect(
    menuLabels(page).filter({ hasText: 'Administración' }),
  ).toHaveCount(0);

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('SUPERADMIN lands on the companies admin view', async ({ page }) => {
  await login(page, SUPERADMIN.email, SUPERADMIN.password);

  await expect(page).toHaveURL(/\/app\/admin$/);
  await expect(page.getByText('E2E Web Corp')).toBeVisible();
});
