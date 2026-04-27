import nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

type Langue = 'FR' | 'EN' | 'ES' | 'PT';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private translationsCache: Map<string, Record<string, any>> = new Map();

  constructor() {
    const smtpHost = process.env.BREVO_SMTP_HOST || process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    const smtpPort = parseInt(process.env.BREVO_SMTP_PORT || process.env.SMTP_PORT || '587', 10);
    const smtpSecure = (process.env.BREVO_SMTP_SECURE || process.env.SMTP_SECURE || 'false') === 'true';
    const smtpUser = process.env.BREVO_SMTP_USER || process.env.SMTP_USER;
    const smtpPass = process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS;

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  /**
   * Charge les traductions pour une langue donnée (RM-100)
   * Fallback FR si traduction absente (RM-99)
   */
  private loadTranslations(langue: Langue): Record<string, any> {
    const langKey = langue.toUpperCase();

    // Vérifier cache
    if (this.translationsCache.has(langKey)) {
      return this.translationsCache.get(langKey)!;
    }

    try {
      const langLower = langue.toLowerCase();
      const translationPath = path.join(__dirname, '../../locales', langLower, 'emails.json');

      if (!fs.existsSync(translationPath)) {
        console.warn(`[EmailService] Traduction ${langue} introuvable, fallback FR (RM-99)`);
        return this.loadTranslations('FR');
      }

      const translationData = fs.readFileSync(translationPath, 'utf-8');
      const translations = JSON.parse(translationData);

      // Cache
      this.translationsCache.set(langKey, translations);
      return translations;
    } catch (error) {
      console.error(`[EmailService] Erreur chargement traductions ${langue}:`, error);
      if (langue !== 'FR') {
        return this.loadTranslations('FR'); // Fallback FR (RM-99)
      }
      throw error;
    }
  }

  /**
   * Charge et interpole un template HTML avec traductions et variables
   */
  private loadTemplate(
    templateName: string,
    langue: Langue,
    variables: Record<string, string>
  ): { subject: string; html: string } {
    try {
      // Charger le template HTML
      const templatePath = path.join(__dirname, '../../templates', `${templateName}.html`);

      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template ${templateName} introuvable`);
      }

      let html = fs.readFileSync(templatePath, 'utf-8');

      // Charger les traductions
      const translations = this.loadTranslations(langue);
      const emailTranslations = translations[templateName] || {};
      const commonTranslations = translations.common || {};

      // Créer un mapping complet des variables à interpoler
      const allVariables: Record<string, string> = {
        lang: langue.toLowerCase(),
        // Traductions communes (préfixées t_)
        t_platform_name: commonTranslations.platform_name || 'FORGES',
        t_platform_tagline: commonTranslations.platform_tagline || '',
        t_greeting: commonTranslations.greeting || 'Bonjour',
        t_regards: commonTranslations.regards || 'Cordialement',
        t_team_signature: commonTranslations.team_signature || "L'équipe FORGES",
        t_footer_copyright: commonTranslations.footer_copyright || '© 2026 FORGES',
        t_footer_visit_site: commonTranslations.footer_visit_site || 'Visiter notre site',
        t_footer_support: commonTranslations.footer_support || 'Support',
        t_contact_us: commonTranslations.contact_us || '',
        // Traductions spécifiques au template (préfixées t_)
        t_title: emailTranslations.title || '',
        t_intro: emailTranslations.intro || '',
        t_formation_label: emailTranslations.formation_label || 'Formation :',
        t_session_label: emailTranslations.session_label || 'Session :',
        t_session_dates: emailTranslations.session_dates || '',
        t_important_title: emailTranslations.important_title || '',
        t_payment_deadline: emailTranslations.payment_deadline || '',
        t_deadline_label: emailTranslations.deadline_label || '',
        t_deadline_warning: emailTranslations.deadline_warning || '',
        t_cta_button: emailTranslations.cta_button || '',
        t_message: emailTranslations.message || '',
        t_reason_label: emailTranslations.reason_label || '',
        t_encouragement: emailTranslations.encouragement || '',
        t_warning_title: emailTranslations.warning_title || '',
        t_warning_message: emailTranslations.warning_message || '',
        t_consequence: emailTranslations.consequence || '',
        t_amount_label: emailTranslations.amount_label || '',
        t_period_label: emailTranslations.period_label || '',
        t_commissions_label: emailTranslations.commissions_label || '',
        t_info: emailTranslations.info || '',
        // Alerte validation (Gap 4 - RM-134)
        t_partenaire_label: emailTranslations.partenaire_label || '',
        t_submission_date_label: emailTranslations.submission_date_label || '',
        t_days_elapsed_label: emailTranslations.days_elapsed_label || '',
        t_action_required: emailTranslations.action_required || '',
        t_escalation_notice: emailTranslations.escalation_notice || '',
        // Variables dynamiques fournies
        ...variables,
      };

      // Interpoler toutes les variables {{variable}} dans le HTML et le sujet
      let subject = emailTranslations.subject || 'FORGES';
      Object.keys(allVariables).forEach((key) => {
        const value = allVariables[key] || '';
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, value);
        subject = subject.replace(regex, value);
      });

      return {
        subject,
        html,
      };
    } catch (error) {
      console.error(`[EmailService] Erreur chargement template ${templateName}:`, error);
      throw error;
    }
  }

  private buildTextEmail(lines: string[]): string {
    return lines.filter(Boolean).join('\n');
  }

  private buildHtmlEmail(title: string, paragraphs: string[], cta?: { label: string; url: string }, footer?: string): string {
    const ctaHtml = cta
      ? `<p><a href="${cta.url}" style="display:inline-block;background:#1B4F72;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:8px;">${cta.label}</a></p><p>Si le bouton ne fonctionne pas, copiez ce lien : <a href="${cta.url}">${cta.url}</a></p>`
      : '';

    const body = paragraphs.map((p) => `<p>${p}</p>`).join('');
    const footerHtml = footer ? `<p style="color:#566573;font-size:12px;">${footer}</p>` : '';

    return `
      <div style="font-family: Arial, sans-serif; color: #1C2833; line-height: 1.6;">
        <h2 style="color: #1B4F72; margin-bottom: 16px;">${title}</h2>
        ${body}
        ${ctaHtml}
        ${footerHtml}
      </div>
    `;
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.BREVO_SMTP_USER || 'support@forges.local';

      await this.transporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
    } catch (error) {
      // Email best-effort : ne jamais faire crasher l'application sur erreur SMTP.
      // Les callers peuvent logger via AuditLogger pour suivi.
      console.error('Email send error (non-bloquant):', (error as Error).message);
    }
  }

  async sendWelcomeEmail(email: string, nom: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Bienvenue sur FORGES',
      html: `<p>Bonjour ${nom},</p><p>Bienvenue sur la plateforme FORGES !</p>`,
    });
  }

  async sendAbonnementConfirmation(email: string, offre: string): Promise<void> {
    const title = 'Confirmation de votre abonnement FORGES';
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        `Votre abonnement ${offre} a été confirmé.`,
        'Vous pouvez maintenant accéder aux fonctionnalités associées à votre offre.',
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        `Votre abonnement <strong>${offre}</strong> a été confirmé.`,
        'Vous pouvez maintenant accéder aux fonctionnalités associées à votre offre.',
      ]),
    });
  }

  async sendPaiementConfirmation(email: string, montant: number): Promise<void> {
    const montantFormate = montant.toLocaleString('fr-FR');
    const title = 'Paiement confirmé';
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        `Votre paiement de ${montantFormate} XOF a été confirmé.`,
        'Le traitement associé à votre dossier ou abonnement peut continuer.',
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        `Votre paiement de <strong>${montantFormate} XOF</strong> a été confirmé.`,
        'Le traitement associé à votre dossier ou abonnement peut continuer.',
      ]),
    });
  }

  async sendConfirmation(email: string, token: string, langue: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const confirmationUrl = `${frontendUrl}/confirm-email/${token}`;

    await this.sendEmail({
      to: email,
      subject: 'Confirmez votre compte FORGES',
      text: [
        'Bonjour,',
        '',
        'Votre compte FORGES a bien été créé.',
        'Pour activer votre accès, cliquez sur le lien ci-dessous:',
        confirmationUrl,
        '',
        'Ce lien est personnel et valable pendant 24 heures.',
        `Langue de confirmation: ${langue}`,
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #1C2833; line-height: 1.6;">
          <h2 style="color: #1B4F72; margin-bottom: 16px;">Confirmez votre compte FORGES</h2>
          <p>Bonjour,</p>
          <p>Votre compte FORGES a bien été créé. Pour activer votre accès, cliquez sur le bouton ci-dessous.</p>
          <p>
            <a href="${confirmationUrl}" style="display:inline-block;background:#1B4F72;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:8px;">
              Confirmer mon compte
            </a>
          </p>
          <p>Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
          <p><a href="${confirmationUrl}">${confirmationUrl}</a></p>
          <p>Ce lien est personnel et valable pendant 24 heures.</p>
          <p>Langue de confirmation : ${langue}</p>
        </div>
      `,
    });
  }

  async sendTempPassword(email: string, tempPassword: string, langue: string): Promise<void> {
    const title = 'Mot de passe temporaire FORGES';
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        'Un mot de passe temporaire a été généré pour votre compte FORGES.',
        `Mot de passe temporaire: ${tempPassword}`,
        'Connectez-vous puis changez-le immédiatement.',
        `Langue du message: ${langue}`,
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        'Un mot de passe temporaire a été généré pour votre compte FORGES.',
        `<strong>Mot de passe temporaire :</strong> ${tempPassword}`,
        'Connectez-vous puis changez-le immédiatement.',
        `Langue du message : ${langue}`,
      ]),
    });
  }

  async sendResetPassword(email: string, token: string, langue: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;
    const title = 'Réinitialisation de mot de passe FORGES';
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        'Une demande de réinitialisation de mot de passe a été reçue.',
        `Utilisez ce lien: ${resetUrl}`,
        'Ce lien est valable pendant une durée limitée.',
        `Langue du message: ${langue}`,
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        'Une demande de réinitialisation de mot de passe a été reçue.',
        'Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.',
        `Langue du message : ${langue}`,
      ], { label: 'Réinitialiser mon mot de passe', url: resetUrl }, 'Ce lien est personnel et valable pendant une durée limitée.'),
    });
  }

  async sendInvitationPartenaire(email: string, token: string, langue: string): Promise<void> {
    const invitationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register-partenaire?token=${token}`;
    const title = 'Invitation à rejoindre FORGES en tant que partenaire';
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        'Vous avez reçu une invitation pour créer ou activer votre compte partenaire FORGES.',
        `Lien d'inscription: ${invitationUrl}`,
        'Cette invitation est limitée dans le temps.',
        `Langue du message: ${langue}`,
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        'Vous avez reçu une invitation pour créer ou activer votre compte partenaire FORGES.',
        `Langue du message : ${langue}`,
      ], { label: "Finaliser l'inscription partenaire", url: invitationUrl }, 'Cette invitation est limitée dans le temps.'),
    });
  }

  async sendCodeApporteur(email: string, code: string, langue: string): Promise<void> {
    const title = 'Votre code apporteur FORGES';
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        'Votre code apporteur a été activé.',
        `Code apporteur: ${code}`,
        'Partagez-le avec vos contacts pour suivre vos commissions.',
        `Langue du message: ${langue}`,
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        'Votre code apporteur a été activé.',
        `<strong>Code apporteur :</strong> ${code}`,
        'Partagez-le avec vos contacts pour suivre vos commissions.',
        `Langue du message : ${langue}`,
      ]),
    });
  }

  async sendAlerteExpirationB2B(email: string, dateFin: Date, langue: string): Promise<void> {
    const title = 'Votre abonnement B2B arrive à expiration';
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        `Votre abonnement B2B expire le ${dateFin.toLocaleDateString('fr-FR')}.`,
        'Pensez à renouveler pour éviter une interruption de service.',
        `Langue du message: ${langue}`,
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        `Votre abonnement B2B expire le <strong>${dateFin.toLocaleDateString('fr-FR')}</strong>.`,
        'Pensez à renouveler pour éviter une interruption de service.',
        `Langue du message : ${langue}`,
      ]),
    });
  }

  async sendAlerteExpirationOrg(email: string, dateFin: Date, langue: string): Promise<void> {
    const title = "Votre abonnement Organisation arrive à expiration";
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        `Votre abonnement Organisation expire le ${dateFin.toLocaleDateString('fr-FR')}.`,
        'Renouvelez-le pour conserver l’accès de vos membres.',
        `Langue du message: ${langue}`,
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        `Votre abonnement Organisation expire le <strong>${dateFin.toLocaleDateString('fr-FR')}</strong>.`,
        'Renouvelez-le pour conserver l’accès de vos membres.',
        `Langue du message : ${langue}`,
      ]),
    });
  }

  async sendConfirmationAbonnement(email: string, offre: string, montantOuLangue?: number | string, langue?: string): Promise<void> {
    const title = 'Confirmation de votre abonnement FORGES';
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        `Votre abonnement ${offre} est actif.`,
        typeof montantOuLangue === 'number' ? `Montant: ${montantOuLangue.toLocaleString('fr-FR')} XOF` : '',
        `Langue du message: ${typeof montantOuLangue === 'string' ? montantOuLangue : langue || 'FR'}`,
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        `Votre abonnement <strong>${offre}</strong> est actif.`,
        typeof montantOuLangue === 'number' ? `Montant : <strong>${montantOuLangue.toLocaleString('fr-FR')} XOF</strong>` : '',
        `Langue du message : ${typeof montantOuLangue === 'string' ? montantOuLangue : langue || 'FR'}`,
      ]),
    });
  }

  async sendUpgradeConfirmation(email: string, offreOuMontant: string | number, langue?: string): Promise<void> {
    const title = 'Mise à niveau de votre abonnement';
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        'Votre demande de mise à niveau a été prise en compte.',
        `Détail: ${offreOuMontant}`,
        `Langue du message: ${langue || 'FR'}`,
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        'Votre demande de mise à niveau a été prise en compte.',
        `Détail : <strong>${offreOuMontant}</strong>`,
        `Langue du message : ${langue || 'FR'}`,
      ]),
    });
  }

  async sendEchecPrelevement(email: string, dateFinOuLangue: Date | string, langue?: string): Promise<void> {
    const texteDate = dateFinOuLangue instanceof Date ? dateFinOuLangue.toISOString() : 'N/A';
    const lang = typeof dateFinOuLangue === 'string' ? dateFinOuLangue : (langue || 'FR');
    const title = 'Echec de prélèvement';
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        'Un prélèvement a échoué pour votre abonnement.',
        `Échéance concernée: ${texteDate}`,
        'Merci de vérifier votre moyen de paiement.',
        `Langue du message: ${lang}`,
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        'Un prélèvement a échoué pour votre abonnement.',
        `Échéance concernée : <strong>${texteDate}</strong>`,
        'Merci de vérifier votre moyen de paiement.',
        `Langue du message : ${lang}`,
      ]),
    });
  }

  async sendPaiementConfirme(email: string, formation: string, langue: string): Promise<void> {
    const title = 'Paiement confirmé';
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        `Votre paiement pour la formation ${formation} a été confirmé.`,
        'Votre dossier peut continuer son traitement.',
        `Langue du message: ${langue}`,
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        `Votre paiement pour la formation <strong>${formation}</strong> a été confirmé.`,
        'Votre dossier peut continuer son traitement.',
        `Langue du message : ${langue}`,
      ]),
    });
  }

  async sendDossierAnnuleExpiration(email: string, formation: string, langue?: string): Promise<void> {
    const title = 'Dossier annulé suite à expiration';
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        `Votre dossier pour la formation ${formation} a été annulé car le délai a expiré.`,
        'Vous pouvez consulter le catalogue pour repartir sur une autre inscription.',
        `Langue du message: ${langue || 'FR'}`,
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        `Votre dossier pour la formation <strong>${formation}</strong> a été annulé car le délai a expiré.`,
        'Vous pouvez consulter le catalogue pour repartir sur une autre inscription.',
        `Langue du message : ${langue || 'FR'}`,
      ]),
    });
  }

  async sendPartenaireApprouve(email: string, langue: string): Promise<void> {
    const title = 'Votre compte partenaire est actif';
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        'Votre compte partenaire a été approuvé et est maintenant actif.',
        'Vous pouvez soumettre et suivre vos formations.',
        `Langue du message: ${langue}`,
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        'Votre compte partenaire a été approuvé et est maintenant actif.',
        'Vous pouvez soumettre et suivre vos formations.',
        `Langue du message : ${langue}`,
      ]),
    });
  }

  async sendNouvelleFormationAValider(responsable: string, intitule: string, langue: string): Promise<void> {
    const title = 'Nouvelle formation à valider';
    await this.sendEmail({
      to: responsable,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        `Une nouvelle formation attend votre validation: ${intitule}.`,
        'Merci de vérifier le dossier dans le backoffice.',
        `Langue du message: ${langue}`,
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        `Une nouvelle formation attend votre validation : <strong>${intitule}</strong>.`,
        'Merci de vérifier le dossier dans le backoffice.',
        `Langue du message : ${langue}`,
      ]),
    });
  }

  async sendFormationValidee(email: string, intitule: string, langue: string): Promise<void> {
    const title = 'Formation validée';
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        `Votre formation ${intitule} a été validée.`,
        'Elle peut maintenant suivre le cycle de mise en ligne prévu.',
        `Langue du message: ${langue}`,
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        `Votre formation <strong>${intitule}</strong> a été validée.`,
        'Elle peut maintenant suivre le cycle de mise en ligne prévu.',
        `Langue du message : ${langue}`,
      ]),
    });
  }

  async sendFormationRejetee(email: string, intitule: string, motif: string, correctionsOuLangue?: string, langue?: string): Promise<void> {
    const hasLangOnly = correctionsOuLangue && ['FR', 'EN', 'ES', 'PT'].includes(correctionsOuLangue);
    const corrections = hasLangOnly ? '' : (correctionsOuLangue || '');
    const lang = hasLangOnly ? correctionsOuLangue : (langue || 'FR');
    const title = 'Formation rejetée';
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        `Votre formation ${intitule} a été rejetée.`,
        `Motif: ${motif}`,
        corrections ? `Corrections attendues: ${corrections}` : '',
        `Langue du message: ${lang}`,
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        `Votre formation <strong>${intitule}</strong> a été rejetée.`,
        `<strong>Motif :</strong> ${motif}`,
        corrections ? `<strong>Corrections attendues :</strong> ${corrections}` : '',
        `Langue du message : ${lang}`,
      ]),
    });
  }

  async sendEssaiExpire(email: string, langue: string): Promise<void> {
    const title = 'Votre période d’essai est expirée';
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        'Votre période d’essai est expirée.',
        'Vous pouvez maintenant choisir un abonnement adapté à vos besoins.',
        `Langue du message: ${langue}`,
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        'Votre période d’essai est expirée.',
        'Vous pouvez maintenant choisir un abonnement adapté à vos besoins.',
        `Langue du message : ${langue}`,
      ]),
    });
  }

  async notifyResponsable(action: string, payload: Record<string, unknown>): Promise<void> {
    const title = `Notification d'action FORGES: ${action}`;
    await this.sendEmail({
      to: process.env.DEFAULT_RESPONSABLE_EMAIL || 'responsable@localhost',
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        `Une action nécessite votre attention: ${action}.`,
        'Détails:',
        JSON.stringify(payload, null, 2),
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        `Une action nécessite votre attention : <strong>${action}</strong>.`,
        `<pre style="background:#F4F6F7;padding:12px;border-radius:8px;white-space:pre-wrap;">${JSON.stringify(payload, null, 2)}</pre>`,
      ]),
    });
  }

  /**
   * Envoie email dossier retenu (RM-05, UCS08)
   * Template: dossier-retenu.html
   */
  async sendDossierRetenu(
    email: string,
    nom_apprenant: string,
    formation_intitule: string,
    date_debut_session: string,
    date_fin_session: string,
    delai_expiration: string,
    lien_paiement: string,
    langue: Langue = 'FR'
  ): Promise<void> {
    const { subject, html } = this.loadTemplate('dossier-retenu', langue, {
      nom_apprenant,
      formation_intitule,
      date_debut: date_debut_session,
      date_fin: date_fin_session,
      delai_expiration,
      lien_paiement,
      site_url: process.env.FRONTEND_URL || 'https://forges.local',
      support_email: process.env.EMAIL_FROM || 'support@forges.local',
    });

    await this.sendEmail({ to: email, subject, html });
  }

  /**
   * Envoie email dossier rejeté (UCS08)
   * Template: dossier-rejete.html
   */
  async sendDossierRejete(
    email: string,
    nom_apprenant: string,
    formation_intitule: string,
    motif_refus: string,
    langue: Langue = 'FR'
  ): Promise<void> {
    const { subject, html } = this.loadTemplate('dossier-rejete', langue, {
      nom_apprenant,
      formation_intitule,
      motif_refus,
      catalogue_url: `${process.env.FRONTEND_URL || 'https://forges.local'}/catalogue`,
      site_url: process.env.FRONTEND_URL || 'https://forges.local',
      support_email: process.env.EMAIL_FROM || 'support@forges.local',
    });

    await this.sendEmail({ to: email, subject, html });
  }

  /**
   * Envoie email relance paiement 72h (RM-07)
   * Template: relance-paiement.html
   */
  async sendRelancePaiement72h(
    email: string,
    nom_apprenant: string,
    formation_intitule: string,
    date_debut_session: string,
    date_fin_session: string,
    delai_expiration: string,
    heures_restantes: number,
    lien_paiement: string,
    langue: Langue = 'FR'
  ): Promise<void> {
    const { subject, html } = this.loadTemplate('relance-paiement', langue, {
      nom_apprenant,
      formation_intitule,
      date_debut: date_debut_session,
      date_fin: date_fin_session,
      delai_expiration,
      heures_restantes: heures_restantes.toString(),
      lien_paiement,
      site_url: process.env.FRONTEND_URL || 'https://forges.local',
      support_email: process.env.EMAIL_FROM || 'support@forges.local',
    });

    await this.sendEmail({ to: email, subject, html });
  }

  /**
   * Envoie email reversement partenaire (RM-138)
   * Template: reversement-partenaire.html
   */
  async sendReversementPartenaire(
    email: string,
    raison_sociale: string,
    montant_reverse: number,
    nb_commissions: number,
    periode: string,
    langue: Langue = 'FR'
  ): Promise<void> {
    const montantFormate = (montant_reverse / 100).toLocaleString('fr-FR');

    const { subject, html } = this.loadTemplate('reversement-partenaire', langue, {
      raison_sociale,
      montant_reverse: montantFormate,
      montant: montantFormate, // pour interpolation dans subject
      nb_commissions: nb_commissions.toString(),
      periode,
      dashboard_url: `${process.env.FRONTEND_URL || 'https://forges.local'}/partenaire/reversements`,
      site_url: process.env.FRONTEND_URL || 'https://forges.local',
      support_email: process.env.EMAIL_FROM || 'support@forges.local',
    });

    await this.sendEmail({ to: email, subject, html });
  }

  /**
   * Envoie email reversement apporteur (RM-147)
   * Template: reversement-apporteur.html
   */
  async sendReversementApporteur(
    email: string,
    nom_apporteur: string,
    montant_commission: number,
    nb_commissions: number,
    periode: string,
    langue: Langue = 'FR'
  ): Promise<void> {
    const montantFormate = (montant_commission / 100).toLocaleString('fr-FR');

    const { subject, html } = this.loadTemplate('reversement-apporteur', langue, {
      nom_apporteur,
      montant_commission: montantFormate,
      montant: montantFormate, // pour interpolation dans subject
      nb_commissions: nb_commissions.toString(),
      periode,
      dashboard_url: `${process.env.FRONTEND_URL || 'https://forges.local'}/apporteur/commissions`,
      site_url: process.env.FRONTEND_URL || 'https://forges.local',
      support_email: process.env.EMAIL_FROM || 'support@forges.local',
    });

    await this.sendEmail({ to: email, subject, html });
  }

  /**
   * Envoie email dossier annulé (Gap 3 - RM-07, RM-27)
   * Template: dossier-annule.html
   *
   * Cas d'usage:
   * 1. Annulation automatique par DossierExpirationScheduler (délai 72h expiré)
   * 2. Annulation volontaire par l'apprenant (UCS11 / DELETE /api/dossiers/:id)
   */
  async sendDossierAnnule(
    email: string,
    nom_apprenant: string,
    formation_intitule: string,
    date_debut_session: string,
    date_fin_session: string,
    motif_annulation: string,
    langue: Langue = 'FR'
  ): Promise<void> {
    const { subject, html } = this.loadTemplate('dossier-annule', langue, {
      nom_apprenant,
      formation_intitule,
      date_debut: date_debut_session,
      date_fin: date_fin_session,
      motif_annulation,
      catalogue_url: `${process.env.FRONTEND_URL || 'https://forges.local'}/catalogue`,
      site_url: process.env.FRONTEND_URL || 'https://forges.local',
      support_email: process.env.EMAIL_FROM || 'support@forges.local',
    });

    await this.sendEmail({ to: email, subject, html });
  }

  /**
   * Envoie alerte validation J+5 (Gap 4 - RM-134)
   * Template: alerte-validation-j5.html
   * Destinataires : Responsable désigné + Admin
   */
  async sendAlerteValidationJ5(
    responsable_email: string,
    admin_email: string,
    formation_intitule: string,
    partenaire_nom: string,
    date_soumission: string,
    formation_id: string,
    langue: Langue = 'FR'
  ): Promise<void> {
    const { subject, html } = this.loadTemplate('alerte-validation-j5', langue, {
      formation_intitule,
      partenaire_nom,
      date_soumission,
      validation_url: `${process.env.FRONTEND_URL || 'https://forges.local'}/backoffice/responsable/validations/${formation_id}`,
      site_url: process.env.FRONTEND_URL || 'https://forges.local',
      support_email: process.env.EMAIL_FROM || 'support@forges.local',
    });

    const destinataires = [responsable_email, admin_email]
      .filter((e) => !!e)
      .join(',');

    await this.sendEmail({ to: destinataires, subject, html });
  }

  /**
   * Envoie alerte validation J+10 (Gap 4 - RM-134)
   * Template: alerte-validation-j10.html
   * Destinataire : Admin uniquement (escalade)
   */
  async sendAlerteValidationJ10(
    admin_email: string,
    formation_intitule: string,
    partenaire_nom: string,
    date_soumission: string,
    jours_ecoules: number,
    formation_id: string,
    langue: Langue = 'FR'
  ): Promise<void> {
    const { subject, html } = this.loadTemplate('alerte-validation-j10', langue, {
      formation_intitule,
      partenaire_nom,
      date_soumission,
      jours_ecoules: jours_ecoules.toString(),
      validation_url: `${process.env.FRONTEND_URL || 'https://forges.local'}/backoffice/admin/validations/${formation_id}`,
      site_url: process.env.FRONTEND_URL || 'https://forges.local',
      support_email: process.env.EMAIL_FROM || 'support@forges.local',
    });

    await this.sendEmail({ to: admin_email, subject, html });
  }
}

export const emailService = new EmailService();
