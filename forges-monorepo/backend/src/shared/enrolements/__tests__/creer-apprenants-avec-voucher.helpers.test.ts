import {
  buildInscriptionVoucherInput,
  buildVoucherEnrollmentConfirmationEmail,
  parseCsvApprenantsAvecVoucher,
} from '../creer-apprenants-avec-voucher.helpers';

describe('creer-apprenants-avec-voucher helpers', () => {
  it('normalise un voucher vide en paiement direct', () => {
    const csv = [
      'nom,prenom,email,organisation,voucher',
      'Dogba,Benjamin,dogba@example.com,FORGES,   ',
    ].join('\n');

    const rows = parseCsvApprenantsAvecVoucher(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      email: 'dogba@example.com',
      voucher: null,
    });

    expect(
      buildInscriptionVoucherInput({
        sessionId: 'session-01',
        apprenantId: 'apprenant-01',
        voucher: rows[0].voucher,
      })
    ).toEqual({
      session_id: 'session-01',
      apprenantId: 'apprenant-01',
      source_financement: 'RETAIL',
      voucher_code: null,
      code_apporteur: null,
    });
  });

  it('conserve un voucher présent pour l inscription promo', () => {
    const csv = [
      'nom,prenom,email,organisation,voucher',
      'Dogba,Benjamin,dogba@example.com,FORGES, VOUCHER-PROMO-01 ',
    ].join('\n');

    const rows = parseCsvApprenantsAvecVoucher(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      voucher: 'VOUCHER-PROMO-01',
    });

    expect(
      buildInscriptionVoucherInput({
        sessionId: 'session-02',
        apprenantId: 'apprenant-02',
        voucher: rows[0].voucher,
      })
    ).toEqual({
      session_id: 'session-02',
      apprenantId: 'apprenant-02',
      source_financement: 'RETAIL',
      voucher_code: 'VOUCHER-PROMO-01',
      code_apporteur: null,
    });
  });

  it('compose le message de confirmation avec le texte de paiement demandé', () => {
    const email = buildVoucherEnrollmentConfirmationEmail({
      prenom: 'Red',
      formationLabel: 'Masterclass GWU/CCDL (1er-11 juin 2026)',
      paymentUrl: 'https://edu.forges-group.com',
    });

    expect(email.subject).toContain('Masterclass GWU/CCDL');
    expect(email.text).toContain('Bonjour Red,');
    expect(email.text).toContain('Votre inscription à la Masterclass GWU/CCDL (1er-11 juin 2026) est bien enregistrée.');
    expect(email.text).toContain('Vous pouvez finaliser votre paiement en ligne');
    expect(email.text).toContain('https://edu.forges-group.com');
    expect(email.text).toContain('Si vous avez déjà effectué le paiement');
    expect(email.text).toContain('Cordialement');
    expect(email.html).toContain('https://edu.forges-group.com');
  });
});
