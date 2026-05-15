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
  const sessionLabel = options.session?.date_debut && options.session?.date_fin
    ? ` (${new Date(options.session.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} – ${new Date(options.session.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })})`
    : '';

  const plainText = [
    `Bonjour ${options.prenoms},`,
    '',
    `Votre inscription à la ${options.formation}${sessionLabel} est bien enregistrée.`,
    '',
    'Vous pouvez finaliser votre paiement en ligne en vous connectant à votre compte FORGES via le lien ci-dessous :',
    'https://edu.forges-group.com',
    '',
    'Si vous avez déjà effectué le paiement, merci d\'ignorer ce message.',
    '',
    'Pour toute question, nous restons à votre disposition.',
    '',
    'Cordialement,',
    'L\'équipe FORGES',
  ].join('\n');

  return {
    subject: `Votre inscription ${options.formation} — Finalisez votre paiement`,
    text: plainText,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <div style="background:#1a1a2e;padding:24px 32px;text-align:center;">
          <img src="https://edu.forges-group.com/logo_forges.png" alt="FORGES" style="height:48px;display:block;margin:0 auto;" />
        </div>

        <div style="padding:32px;">
          <p style="font-size:15px;color:#333;margin-top:0;">Bonjour <strong>${options.prenoms}</strong>,</p>

          <p style="font-size:15px;color:#333;line-height:1.6;">
            Votre inscription à la <strong>${options.formation}${sessionLabel}</strong> est bien enregistrée.
          </p>

          <p style="font-size:15px;color:#333;line-height:1.6;">
            Vous pouvez finaliser votre paiement en ligne en vous connectant à votre compte FORGES via le lien ci-dessous :
          </p>

          <div style="text-align:center;margin:28px 0;">
            <a href="https://edu.forges-group.com"
               style="background:#1a1a2e;color:#fff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:15px;font-weight:600;display:inline-block;">
              Accéder à mon compte FORGES
            </a>
          </div>

          <p style="font-size:13px;color:#888;line-height:1.6;">
            Si vous avez déjà effectué le paiement, merci d'ignorer ce message.
          </p>

          <p style="font-size:14px;color:#555;line-height:1.6;">
            Pour toute question, nous restons à votre disposition.
          </p>

          <div style="border-top:1px solid #e2e8f0;margin-top:32px;padding-top:20px;">
            <p style="font-size:13px;color:#555;margin:0;">Cordialement,</p>
            <p style="font-size:13px;color:#333;font-weight:600;margin:4px 0 0;">L'équipe FORGES</p>
            <p style="font-size:12px;color:#aaa;margin:4px 0 0;">
              <a href="mailto:contact@forges-group.com" style="color:#888;">contact@forges-group.com</a>
            </p>
          </div>
        </div>
      </div>
    `,
  };
}
