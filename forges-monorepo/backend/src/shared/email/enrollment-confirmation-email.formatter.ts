type SessionBlock = {
  date_debut?: Date | string | null;
  date_fin?: Date | string | null;
  lieu?: string | null;
};

export type EnrollmentConfirmationEmailOptions = {
  prenoms: string;
  nom: string;
  organisation: string;
  formation: string;
  session?: SessionBlock | null;
  paymentUrl?: string;
};

export function buildEnrollmentConfirmationEmail(options: EnrollmentConfirmationEmailOptions) {
  if (options.paymentUrl) {
    const subject = `Votre inscription à ${options.formation} est enregistrée — FORGES`;
    const text = [
      `Bonjour ${options.prenoms},`,
      '',
      `Votre inscription à la ${options.formation} est bien enregistrée.`,
      '',
      'Vous pouvez finaliser votre paiement en ligne en vous connectant à votre compte FORGES via le lien ci-dessous :',
      options.paymentUrl,
      '',
      'Si vous avez déjà effectué le paiement, merci d\'ignorer ce message.',
      '',
      'Pour toute question, nous restons à votre disposition.',
      '',
      'Cordialement,',
      "L’équipe FORGES",
    ].join('\n');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1C2833;line-height:1.6;">
        <div style="background:#1B4F72;color:#fff;padding:24px 28px;border-radius:8px 8px 0 0;">
          <div style="font-size:18px;font-weight:700;letter-spacing:.5px;">FORGES AGRÉGATEUR</div>
          <div style="font-size:13px;opacity:.9;margin-top:4px;">Plateforme de formations certifiantes</div>
        </div>
        <div style="background:#fff;border:1px solid #D5D8DC;border-top:none;padding:28px;border-radius:0 0 8px 8px;">
          <p style="margin:0 0 16px;">Bonjour ${options.prenoms},</p>
          <p style="margin:0 0 16px;">Votre inscription à la <strong>${options.formation}</strong> est bien enregistrée.</p>
          <p style="margin:0 0 16px;">Vous pouvez finaliser votre paiement en ligne en vous connectant à votre compte FORGES via le lien ci-dessous :</p>
          <p style="margin:0 0 20px;">
            <a href="${options.paymentUrl}" style="color:#2E86C1;font-weight:700;text-decoration:none;">${options.paymentUrl}</a>
          </p>
          <p style="margin:0 0 16px;">Si vous avez déjà effectué le paiement, merci d&apos;ignorer ce message.</p>
          <p style="margin:0 0 16px;">Pour toute question, nous restons à votre disposition.</p>
          <p style="margin:24px 0 0;">Cordialement,<br>L’équipe FORGES</p>
        </div>
      </div>
    `;

    return { subject, text, html };
  }

  const nomComplet = `${options.prenoms} ${options.nom}`;
  const fonctionLine = options.organisation
    ? `<p style="margin:0;color:#666;font-size:13px;">${options.organisation}</p>`
    : '';
  const sessionLine = options.session
    ? [
        options.session.date_debut && options.session.date_fin
          ? `<p style="margin:0 0 4px;font-size:13px;color:#555;"><strong>Session :</strong> du ${new Date(options.session.date_debut).toLocaleDateString('fr-FR')} au ${new Date(options.session.date_fin).toLocaleDateString('fr-FR')}</p>`
          : null,
        options.session.lieu ? `<p style="margin:0;font-size:13px;color:#555;"><strong>Lieu :</strong> ${options.session.lieu}</p>` : null,
      ].filter(Boolean).join('')
    : '';

  return {
    subject: `Votre inscription Masterclass GWU/CCDL confirmée — FORGES`,
    text: [
      `Bonjour ${nomComplet},`,
      '',
      `Votre inscription à la ${options.formation} a bien été confirmée.`,
      options.organisation ? options.organisation : '',
      '',
      'Votre inscription est bien enregistrée.',
    ].filter(Boolean).join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e;">
        <div style="background:#1a1a2e;padding:24px 32px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;letter-spacing:1px;">FORGES AGRÉGATEUR</h1>
          <p style="color:#a0a8c0;margin:4px 0 0;font-size:13px;">Plateforme de formations certifiantes</p>
        </div>

        <div style="background:#f8f9fb;padding:32px;border-radius:0 0 8px 8px;">
          <p style="font-size:15px;color:#333;margin-top:0;">Bonjour <strong>${nomComplet}</strong>,</p>
          ${fonctionLine}
          <br>
          <p style="font-size:15px;color:#333;">
            Votre inscription à la <strong>${options.formation}</strong> a bien été confirmée.
          </p>

          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:24px 0;">
            <p style="margin:0 0 8px;font-size:13px;color:#555;">Votre inscription est bien enregistrée.</p>
            ${sessionLine}
          </div>

          <p style="font-size:14px;color:#555;">
            Pour toute question concernant cette masterclass, n'hésitez pas à contacter notre équipe.
          </p>

          <div style="border-top:1px solid #e2e8f0;margin-top:32px;padding-top:20px;">
            <p style="font-size:13px;color:#888;margin:0;">
              <a href="mailto:contact@forges-group.com" style="color:#1a1a2e;font-weight:600;">contact@forges-group.com</a>
            </p>
          </div>
        </div>
      </div>
    `,
  };
}
