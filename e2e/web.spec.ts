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

test('login offers password and OTP without sending a code', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Password', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'OTP', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'OTP', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Send OTP' })).toBeVisible();
});

test('search and protected areas render for a guest', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue as Guest' }).click();
  await page.goto('/search');
  await expect(page.getByRole('textbox', { name: 'Search' })).toBeVisible();
  await page.goto('/favorites');
  await expect(page.getByText('Sign in to see saved properties')).toBeVisible();
  await page.goto('/support');
  await expect(page.getByText('Sign in to see your support tickets.')).toBeVisible();
  await page.goto('/notifications');
  await expect(page.getByText('Sign in to see notifications')).toBeVisible();
});

test('browse filters fit a phone, a tablet, and a desktop', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue as Guest' }).click();

  const openBrowse = async (width: number, height: number) => {
    await page.setViewportSize({ width, height });
    await page.goto('/browse');
    await page.getByRole('button', { name: 'Apartment', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Properties for sale' })).toBeVisible();
  };

  await openBrowse(390, 844);
  const mobileFilters = page.getByRole('button', { name: /^Filters/ });
  await expect(mobileFilters).toBeVisible();
  await mobileFilters.click();
  await expect(page.getByText('Bedrooms')).toBeVisible();
  await expect(page.getByRole('button', { name: '5+ BHK' })).toBeVisible();

  await openBrowse(768, 1024);
  await expect(page.getByRole('button', { name: /^Filters/ })).toBeVisible();

  await openBrowse(1440, 900);
  await expect(page.getByText('Bedrooms')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Filters/ })).toHaveCount(0);
});
