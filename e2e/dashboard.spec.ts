import { expect, test } from '@playwright/test';

test('login rejects an empty admin form before calling the API', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByText('Email is required')).toBeVisible();
  await expect(page.getByText('Password is required')).toBeVisible();
});

test('login explains how an admin password is reset', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await expect(page.getByText('A Super Admin resets staff passwords from Access Control.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send Reset Link' })).toHaveCount(0);
});
