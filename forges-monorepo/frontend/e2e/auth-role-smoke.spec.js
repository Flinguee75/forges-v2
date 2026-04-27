import { test, expect } from '@playwright/test';

test('auth and role smoke flow', async ({ page }) => {
  await page.goto('/apprenant/dashboard');
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('Email').fill('apprenant@forges.ci');
  await page.getByLabel('Mot de passe').fill('Test@FORGES2026!');
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page).toHaveURL(/\/apprenant\/dashboard$/);

  const session = await page.evaluate(() => ({
    accessToken: window.sessionStorage.getItem('access_token'),
    refreshToken: window.sessionStorage.getItem('refresh_token'),
    user: window.sessionStorage.getItem('user'),
  }));

  expect(session.accessToken).toBeTruthy();
  expect(session.refreshToken).toBeTruthy();
  expect(session.user).toBeTruthy();

  await page.goto('/partenaire/dashboard');
  await expect(page).toHaveURL(/\/unauthorized$/);
});
