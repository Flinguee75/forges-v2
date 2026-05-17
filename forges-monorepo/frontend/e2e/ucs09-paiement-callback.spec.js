import { test, expect } from '@playwright/test';
import { createHmac } from 'crypto';
import { E2E_ACCOUNTS, E2E_SCENARIO } from './e2e-data';
import {
  API_BASE_URL,
  WEBHOOK_SECRET,
  apiLogin,
  findDossier,
  postJson,
} from './helpers';

async function installApprenantSession(page, session = null) {
  await page.addInitScript((storedSession) => {
    window.sessionStorage.setItem('access_token', storedSession?.accessToken || 'e2e-access-token');
    window.sessionStorage.setItem('refresh_token', storedSession?.refreshToken || 'e2e-refresh-token');
    window.sessionStorage.setItem('user', JSON.stringify(storedSession?.user || {
      id: 'app-e2e-callback',
      email: 'callback-e2e@forges.ci',
      role: 'APPRENANT',
    }));
  }, session);
}

test('UCS09: retour provider success ne confirme pas tant que FORGES garde le paiement PENDING', async ({ page }) => {
  await installApprenantSession(page);
  await page.route('**/api/paiements', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        data: [
          {
            id: 'pay-e2e-pending',
            statut: 'PENDING',
            order_ngser: 'FRG-FNO-E2E-PENDING',
            montant_final: 150000,
          },
        ],
      }),
    });
  });

  await page.goto('/apprenant/paiements/callback?status=success&status_id=1&order_id=FRG-FNO-E2E-PENDING');

  await expect(page.getByText('En attente')).toBeVisible();
  await expect(page.getByText(/Votre paiement a été confirmé/i)).toHaveCount(0);
});

test('UCS09: callback affiche confirme uniquement quand FORGES retourne CONFIRME', async ({ page }) => {
  await installApprenantSession(page);
  await page.route('**/api/paiements', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        data: [
          {
            id: 'pay-e2e-confirmed',
            statut: 'CONFIRME',
            order_ngser: 'FRG-FNO-E2E-CONFIRMED',
            montant_final: 150000,
          },
        ],
      }),
    });
  });

  await page.goto('/apprenant/paiements/callback?status=success&status_id=1&order_id=FRG-FNO-E2E-CONFIRMED');

  await expect(page.getByRole('heading', { name: /Paiement confirmé/i })).toBeVisible();
  await expect(page.getByText(/Votre paiement a été confirmé/i)).toBeVisible();
});

test('UCS09 integration: inscription, initiation, webhook signé et callback lisent le backend réel', async ({ request, page }) => {
  const session = await apiLogin(request, E2E_ACCOUNTS.apprenantRecon5);
  const headers = { Authorization: `Bearer ${session.accessToken}` };

  const inscription = await postJson(request, `/sessions/${E2E_SCENARIO.standardSessionId}/inscrire`, {
    source_financement: 'RETAIL',
  }, headers);
  expect(inscription.ok, `Inscription echouee (${inscription.status}): ${JSON.stringify(inscription.payload)}`).toBeTruthy();

  const dossierId = inscription.payload?.dossier?.id || inscription.payload?.data?.dossier?.id;
  expect(dossierId).toBeTruthy();

  const paiement = await postJson(request, '/paiements/initier', {
    dossier_id: dossierId,
  }, headers);
  expect(paiement.ok, `Initiation paiement echouee (${paiement.status}): ${JSON.stringify(paiement.payload)}`).toBeTruthy();

  const paiementData = paiement.payload?.data || paiement.payload;
  expect(paiementData.order_ngser).toBeTruthy();

  const transactionId = `TX-E2E-CALLBACK-${Date.now()}`;
  const webhookBody = {
    order_id: paiementData.order_ngser,
    transaction_id: transactionId,
    status_id: 1,
    transaction_amount: Math.round((paiementData.montant_initie || 0) / 100),
    wallet: 'MOCK',
  };
  const signature = createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(webhookBody))
    .digest('hex');

  const webhook = await request.post(`${API_BASE_URL}/webhooks/paiement`, {
    headers: { 'x-webhook-signature': signature },
    data: webhookBody,
  });
  expect(webhook.ok()).toBeTruthy();

  const dossier = await findDossier(request, headers, (item) => item.id === dossierId);
  expect(dossier?.statut).toBe('PAYE');
  expect(dossier?.paiement?.statut).toBe('CONFIRME');

  await installApprenantSession(page, session);
  await page.goto(`/apprenant/paiements/callback?status=success&status_id=1&order_id=${paiementData.order_ngser}&transaction_id=${transactionId}`);

  await expect(page.getByRole('heading', { name: /Paiement confirmé/i })).toBeVisible();
  await expect(page.getByText(/Votre paiement a été confirmé/i)).toBeVisible();
});
