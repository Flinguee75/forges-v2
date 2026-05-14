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
};

export function buildEnrollmentConfirmationEmail(options: EnrollmentConfirmationEmailOptions) {
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
