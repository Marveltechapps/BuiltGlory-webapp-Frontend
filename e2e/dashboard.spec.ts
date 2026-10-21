import { expect, test } from '@playwright/test';

test('login explains how an admin password is reset', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await expect(page.getByText('A Super Admin resets staff passwords from Access Control.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send Reset Link' })).toHaveCount(0);
});
