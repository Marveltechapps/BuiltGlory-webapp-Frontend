import { expect, test } from '@playwright/test';

test('home shows the live catalog count', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue as Guest' }).click();
  await expect(page.getByText('Live listings')).toBeVisible();
});

test('visits and deals ask for a customer session', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue as Guest' }).click();
  await page.goto('/visits');
  await expect(page.getByText('Sign in to see your visits')).toBeVisible();
  await page.goto('/deals');
  await expect(page.getByText('Sign in to see your deals')).toBeVisible();
});

test('a fresh visit is stopped by the customer auth gate', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Continue as Guest' })).toBeVisible();
  await expect(page.getByText('Live listings')).toHaveCount(0);
});
