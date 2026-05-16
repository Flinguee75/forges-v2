import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test('backoffice can see expired promotional vouchers in the listing', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/backoffice/vouchers');

  await expect(page.getByText('Liste des vouchers')).toBeVisible();
  await page.locator('select').selectOption('EXPIRE');

  await expect(page.getByRole('row', { name: /ORG-E2E-VOUCHER-EXPIRE/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /ORG-E2E-VOUCHER-EXPIRE/ })).toContainText(/Expire/i);
});
