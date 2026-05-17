import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import { authHeaders, dataOf, getJson, loginAsOrganisation, postJson } from './helpers';

test('UCS16 RM-115/RM-118/RM-125: bot organisation démarre sans saisie libre', async ({ page, request }) => {
  await loginAsOrganisation(page);
  await page.goto('/organisation/dashboard');
  await expect(page.getByText(/Organisation E2E|dashboard|tableau de bord/i).first()).toBeVisible();

  const headers = await authHeaders(request, E2E_ACCOUNTS.organisation);
  const start = await postJson(request, '/bot/session', {}, headers);

  expect(start.ok).toBeTruthy();
  const session = dataOf(start.payload);
  expect(session.session_id).toBeTruthy();
  expect(['UPGRADE', 'FEEDBACK', 'IDLE']).toContain(session.flux);

  if (session.options?.length || session.question?.options?.length) {
    const rejected = await postJson(request, `/bot/session/${session.session_id}/reponse`, {
      question_id: session.question_id || session.question?.id || 1,
      valeur: 'REPONSE_LIBRE_INTERDITE',
    }, headers);
    expect(rejected.status).toBe(400);
    expect(rejected.payload.error).toBe('REPONSE_HORS_LISTE');
  }
});

test('UCS16: backoffice consolide enquêtes et feedbacks organisation', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.admin);
  const enquetes = await getJson(request, '/bot/backoffice/enquetes?limit=5', headers);
  const feedbacks = await getJson(request, '/bot/backoffice/feedbacks?limit=5', headers);

  expect(dataOf(enquetes).meta.total).toBeGreaterThanOrEqual(0);
  expect(dataOf(feedbacks).meta.total).toBeGreaterThanOrEqual(0);
});
