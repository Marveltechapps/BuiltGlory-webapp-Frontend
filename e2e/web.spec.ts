import { expect, test } from '@playwright/test';

test('home shows the live catalog count', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Live listings')).toBeVisible();
});

test('visits and deals ask for a customer session', async ({ page }) => {
  await page.goto('/visits');
  await expect(page.getByRole('heading', { name: 'Sign in to see your visits' })).toBeVisible();
  await page.goto('/deals');
  await expect(page.getByRole('heading', { name: 'Sign in to see your deals' })).toBeVisible();
});
