import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test('backoffice can create and refuse a promotional voucher', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/backoffice/vouchers/new');

  await expect(page.getByText('Création promotionnelle')).toBeVisible();
  await page.getByLabel('Valeur').fill('15');
  await page.getByLabel('Quota max').fill('2');
  await page.getByLabel("Date d'expiration").fill('2027-04-23');

  await page.getByRole('button', { name: 'Créer le voucher' }).click();

  await expect(page.getByText('Voucher créé')).toBeVisible();
  await expect(page.getByText('Statut: BROUILLON')).toBeVisible();
  await page.getByRole('button', { name: 'Ouvrir le détail' }).click();

  await expect(page).toHaveURL(/\/backoffice\/vouchers\/.+/);
  await expect(page.getByText('Statut: BROUILLON')).toBeVisible();

  await page.getByPlaceholder('Motif de refus').fill('Voucher promo non conforme');
  await page.getByRole('button', { name: 'Refuser' }).click();

  await expect(page.getByText('REFUSE').first()).toBeVisible();
});
