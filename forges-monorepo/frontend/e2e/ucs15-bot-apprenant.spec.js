import { test, expect } from '@playwright/test';
import { E2E_ACCOUNTS } from './e2e-data';
import { authHeaders, dataOf, getJson, postJson } from './helpers';

test('UCS15 RM-115/RM-118/RM-125: bot apprenant démarre avec questions fermées et rejette hors liste', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.apprenant);
  const start = await postJson(request, '/bot/session', {}, headers);

  expect(start.ok).toBeTruthy();
  const session = dataOf(start.payload);
  expect(session.session_id).toBeTruthy();
  expect(['ORIENTATION', 'UPGRADE', 'FEEDBACK', 'ENQUETE', 'IDLE']).toContain(session.flux);

  if (session.question?.options?.length) {
    expect(Array.isArray(session.question.options)).toBeTruthy();
    const rejected = await postJson(request, `/bot/session/${session.session_id}/reponse`, {
      question_id: session.question.id || 1,
      valeur: 'REPONSE_LIBRE_INTERDITE',
    }, headers);
    expect(rejected.status).toBe(400);
    expect(rejected.payload.error).toBe('REPONSE_HORS_LISTE');
  }

  const active = await getJson(request, '/bot/session/active', headers);
  expect(dataOf(active).id || dataOf(active).session_id).toBeTruthy();
});

test('UCS15 RM-124: backoffice voit les collections bot apprenant', async ({ request }) => {
  const headers = await authHeaders(request, E2E_ACCOUNTS.admin);
  const enquetes = await getJson(request, '/bot/backoffice/enquetes', headers);
  const feedbacks = await getJson(request, '/bot/backoffice/feedbacks', headers);

  expect(dataOf(enquetes).enquetes).toBeDefined();
  expect(dataOf(feedbacks).feedbacks).toBeDefined();
});
