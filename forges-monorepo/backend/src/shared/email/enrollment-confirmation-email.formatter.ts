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
    `Votre inscription est bien enregistrée pour la ${options.formation}${sessionLabel}.`,
    `Organisation : ${options.organisation}.`,
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
    subject: `FORGES — Votre inscription ${options.formation} — Finalisez votre paiement`,
    text: plainText,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F6F7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);background:#FFFFFF;">

        <tr>
          <td style="background:#0D2B45;padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td valign="middle">
                  <img src="https://edu.forges-group.com/logo_forges.png" alt="FORGES" style="height:44px;display:block;" />
                </td>
                <td align="right" valign="middle">
                  <div style="color:#2E86C1;font-size:13px;font-weight:600;">Plateforme de formations certifiantes</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr><td style="background:#148F77;height:4px;"></td></tr>

        <tr>
          <td style="background:#ffffff;padding:36px 32px;color:#1C2833;">
            <p style="margin:0 0 8px;font-size:15px;color:#1C2833;">
              Bonjour <strong>${options.prenoms}</strong>,
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#1C2833;line-height:1.6;">
              Votre inscription est bien enregistrée pour la <strong style="color:#0D2B45;">${options.formation}${sessionLabel}</strong>.
            </p>

            <p style="margin:0 0 24px;font-size:14px;color:#1C2833;line-height:1.6;">
              Organisation : <strong>${options.organisation}</strong>
            </p>

            <p style="margin:0 0 24px;font-size:14px;color:#1C2833;line-height:1.6;">
              Vous pouvez finaliser votre paiement en ligne en vous connectant à votre compte FORGES via le lien ci-dessous :
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr><td align="center">
                <a href="https://edu.forges-group.com"
                   style="background:#0D2B45;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;">
                  Acceder a mon compte FORGES
                </a>
              </td></tr>
            </table>

            <p style="margin:0 0 8px;font-size:13px;color:#1C2833;font-style:italic;border-left:3px solid #2E86C1;padding-left:12px;line-height:1.6;">
              Si vous avez deja effectue le paiement, merci d'ignorer ce message.
            </p>

            <p style="margin:20px 0 0;font-size:14px;color:#1C2833;line-height:1.6;">
              Pour toute question, nous restons a votre disposition.
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#0D2B45;padding:20px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#ffffff;font-size:12px;">
                  <strong style="color:#ffffff !important;">FORGES AGREGATEUR</strong><br>
                  <span style="color:#ffffff !important;">contact@forges-group.com &nbsp;|&nbsp; +225 05 04 08 43 84</span><br>
                  <span style="color:#ffffff !important;">edu.forges-group.com</span>
                </td>
                <td align="right">
                  <div style="width:8px;height:8px;background:#2E86C1;border-radius:50%;display:inline-block;"></div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  };
}
