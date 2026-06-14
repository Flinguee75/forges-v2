import nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { getDelaiPaiementH } from '../../config/env.config';
import { buildEnrollmentConfirmationEmail } from './enrollment-confirmation-email.formatter';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

interface EmailWithAttachmentOptions extends EmailOptions {
  attachment?: EmailAttachment;
}

type Langue = 'FR' | 'EN' | 'ES' | 'PT';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private translationsCache: Map<string, Record<string, any>> = new Map();

  constructor() {
    if (process.env.NODE_ENV === 'test' && process.env.EMAIL_REAL_SMTP !== 'true') {
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      return;
    }

    // Priorité au SMTP "runtime" (Plesk/deploy) pour permettre de forcer Office 365.
    // Les variables BREVO_* restent en fallback de compatibilité.
    const smtpHost = process.env.SMTP_HOST || process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || process.env.BREVO_SMTP_PORT || '587', 10);
    const smtpSecure = (process.env.SMTP_SECURE || process.env.BREVO_SMTP_SECURE || 'false') === 'true';
    const smtpUser = process.env.SMTP_USER || process.env.BREVO_SMTP_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.BREVO_SMTP_KEY;

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      requireTLS: smtpPort === 587,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false,
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
        t_footer_support: commonTranslations.footer_support || 'Contact',
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
        // Toutes les clés du template courant (permet aux nouveaux templates d'ajouter des t_ sans modifier ce fichier)
        ...Object.fromEntries(
          Object.entries(emailTranslations)
            .filter(([k]) => k !== 'subject')
            .map(([k, v]) => [`t_${k}`, String(v || '')])
        ),
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
      const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.BREVO_SMTP_USER || 'contact@forges.local';
      const fromAddress = `"FORGES AGRÉGATEUR" <${fromEmail}>`;

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

  async sendEmailFromTemplateWithAttachment(
    to: string,
    templateName: string,
    langue: Langue,
    variables: Record<string, string>,
    conditionals: Record<string, boolean>,
    attachment: EmailAttachment
  ): Promise<void> {
    try {
      const { subject, html: rawHtml } = this.loadTemplate(templateName, langue, variables);
      let html = rawHtml;

      // Blocs conditionnels {{#if_xxx}}...{{/if_xxx}}
      Object.entries(conditionals).forEach(([key, show]) => {
        const openTag = new RegExp(`{{#if_${key}}}`, 'g');
        const closeTag = new RegExp(`{{/if_${key}}}`, 'g');
        if (!show) {
          // Supprimer le bloc entier
          const blockRe = new RegExp(`{{#if_${key}}}[\\s\\S]*?{{/if_${key}}}`, 'g');
          html = html.replace(blockRe, '');
        } else {
          html = html.replace(openTag, '').replace(closeTag, '');
        }
      });

      await this.sendEmailWithAttachment({ to, subject, html, attachment });
    } catch (err) {
      console.error('[EmailService] sendEmailFromTemplateWithAttachment error:', (err as Error).message);
    }
  }

  async sendEmailWithAttachment(options: EmailWithAttachmentOptions): Promise<void> {
    const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.BREVO_SMTP_USER || 'contact@forges.local';
    const fromAddress = `"FORGES AGRÉGATEUR" <${fromEmail}>`;

    await this.transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachment
        ? [{ filename: options.attachment.filename, content: options.attachment.content, contentType: options.attachment.contentType }]
        : [],
    });
  }

  async sendRemerciementFeedback(email: string, prenoms: string, formationIntitule: string, langue: string = 'FR'): Promise<void> {
    const subjects: Record<string, string> = {
      FR: 'Merci pour votre avis sur FORGES',
      EN: 'Thank you for your feedback on FORGES',
      ES: 'Gracias por su opinion en FORGES',
      PT: 'Obrigado pelo seu feedback no FORGES',
    };
    const intros: Record<string, string> = {
      FR: `Merci d'avoir pris le temps de partager votre avis sur la formation <strong>${formationIntitule}</strong>.`,
      EN: `Thank you for taking the time to share your feedback on <strong>${formationIntitule}</strong>.`,
      ES: `Gracias por tomarse el tiempo de compartir su opinion sobre <strong>${formationIntitule}</strong>.`,
      PT: `Obrigado por dedicar tempo para partilhar a sua opiniao sobre <strong>${formationIntitule}</strong>.`,
    };
    const bodies: Record<string, string> = {
      FR: 'Votre retour nous aide à améliorer la qualité de nos formations et à mieux vous accompagner.',
      EN: 'Your feedback helps us improve the quality of our training and better support you.',
      ES: 'Su opinion nos ayuda a mejorar la calidad de nuestra formacion y a apoyarle mejor.',
      PT: 'O seu feedback ajuda-nos a melhorar a qualidade das nossas formacoes e a apoiá-lo melhor.',
    };
    const lang = ['FR', 'EN', 'ES', 'PT'].includes(langue.toUpperCase()) ? langue.toUpperCase() : 'FR';
    const subject = subjects[lang] || subjects.FR;
    const intro = intros[lang] || intros.FR;
    const body = bodies[lang] || bodies.FR;

    await this.sendEmail({
      to: email,
      subject,
      html: this.buildHtmlEmail(subject, [
        `Bonjour <strong>${prenoms}</strong>,`,
        intro,
        body,
        "L'equipe FORGES vous remercie.",
      ]),
    });
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

  async sendTempPassword(
    email: string,
    tempPassword: string,
    langue: string,
    typeCompte: 'APPRENANT' | 'ORGANISATION' = 'APPRENANT',
  ): Promise<void> {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    const typeLabel = typeCompte === 'ORGANISATION' ? 'Organisation' : 'Apprenant';
    const subject = `Bienvenue sur FORGES — Vos identifiants de connexion (compte ${typeLabel})`;

    await this.sendEmail({
      to: email,
      subject,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        `Votre compte ${typeLabel} FORGES vient d'être créé par notre équipe.`,
        '',
        'Vos identifiants de connexion :',
        `  Email : ${email}`,
        `  Mot de passe temporaire : ${tempPassword}`,
        '',
        `Connectez-vous ici : ${loginUrl}`,
        '',
        'IMPORTANT : Ce mot de passe est temporaire. Changez-le dès votre première connexion.',
        '',
        'Si vous n\'etes pas a l\'origine de cette creation ou pour toute question, contactez-nous : contact@forges-group.com',
        '',
        'L\'equipe FORGES',
      ]),
      html: this.buildHtmlEmail(subject, [
        `Votre compte <strong>${typeLabel}</strong> FORGES vient d'être créé par notre équipe.`,
        '<br>',
        'Vos identifiants de connexion :',
        `<strong>Email :</strong> ${email}`,
        `<strong>Mot de passe temporaire :</strong> <code style="background:#f4f4f4;padding:2px 6px;border-radius:4px;">${tempPassword}</code>`,
        '<br>',
        `<a href="${loginUrl}" style="display:inline-block;background:#1B4F72;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;">Accéder à mon espace</a>`,
        `<p style="font-size:12px;color:#666;">Si le bouton ne fonctionne pas, copiez ce lien : <a href="${loginUrl}">${loginUrl}</a></p>`,
        '<br>',
        '<strong>Important :</strong> Ce mot de passe est temporaire. Changez-le dès votre première connexion.',
        '<br>',
        'Si vous n\'êtes pas à l\'origine de cette création ou pour toute question, contactez-nous : <a href="mailto:contact@forges-group.com">contact@forges-group.com</a>',
      ]),
    });
  }

  async sendTempPasswordBackoffice(
    email: string,
    nom: string,
    tempPassword: string,
    role: 'ADMIN' | 'SUPERVISEUR' | 'RESPONSABLE' | 'AGENT' | 'GESTIONNAIRE',
  ): Promise<void> {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

    const roleConfig: Record<string, { label: string; description: string; permissions: string[] }> = {
      SUPERVISEUR: {
        label: 'Superviseur',
        description: "Vous supervisez l'ensemble des activités de la plateforme : formations, sessions, dossiers apprenants, organisations et tableau de bord analytique.",
        permissions: [
          'Consulter et gérer toutes les formations et sessions',
          'Accéder aux dossiers et inscriptions de tous les apprenants',
          'Visualiser les tableaux de bord et statistiques',
          'Superviser les partenaires et organisations',
          'Consulter les reversements et commissions',
        ],
      },
      AGENT: {
        label: 'Agent comptable',
        description: "Vous gérez la partie financière et commerciale de FORGES : devis, factures, paiements et suivi des règlements.",
        permissions: [
          'Créer et gérer les devis et factures (B2B et individuels)',
          'Suivre les paiements et reversements partenaires',
          'Marquer les devis comme payés',
          'Accéder aux rapports financiers',
          'Envoyer les factures par email aux organisations et apprenants',
        ],
      },
      RESPONSABLE: {
        label: 'Responsable pédagogique',
        description: "Vous validez les dossiers apprenants et les formations soumises par les partenaires.",
        permissions: [
          'Valider ou rejeter les dossiers en attente',
          'Valider les formations soumises par les partenaires',
          'Accéder aux informations apprenants de votre périmètre',
        ],
      },
      ADMIN: {
        label: 'Administrateur',
        description: "Vous avez un accès complet à toutes les fonctionnalités de la plateforme FORGES.",
        permissions: [
          'Accès complet à tous les modules',
          'Gestion des comptes et des rôles',
          'Configuration de la plateforme',
        ],
      },
      GESTIONNAIRE: {
        label: 'Gestionnaire',
        description: "Vous gérez les opérations courantes de la plateforme.",
        permissions: ['Gestion des formations et sessions', 'Suivi des apprenants'],
      },
    };

    const config = roleConfig[role] || roleConfig.GESTIONNAIRE;
    const subject = `Bienvenue sur FORGES — Votre compte ${config.label} est prêt`;

    const permissionsHtml = config.permissions
      .map(p => `<li style="margin:6px 0;color:#1C2833;">${p}</li>`)
      .join('');

    const permissionsText = config.permissions.map(p => `  • ${p}`).join('\n');

    await this.sendEmail({
      to: email,
      subject,
      text: this.buildTextEmail([
        `Bonjour ${nom},`,
        '',
        `Votre compte ${config.label} FORGES vient d'être créé.`,
        '',
        config.description,
        '',
        'Ce que vous pouvez faire sur la plateforme :',
        permissionsText,
        '',
        'Vos identifiants de connexion :',
        `  Email : ${email}`,
        `  Mot de passe temporaire : ${tempPassword}`,
        '',
        `Connectez-vous ici : ${loginUrl}`,
        '',
        'IMPORTANT : Ce mot de passe est temporaire. Changez-le dès votre première connexion.',
        '',
        "Pour toute question, contactez-nous : contact@forges-group.com",
        '',
        "L'equipe FORGES",
      ]),
      html: `
        <div style="font-family:Arial,sans-serif;color:#1C2833;line-height:1.6;max-width:600px;">
          <h2 style="color:#1B4F72;margin-bottom:4px;">Bienvenue sur FORGES</h2>
          <p style="color:#566573;margin-top:0;font-size:14px;">Votre espace <strong>${config.label}</strong> est prêt</p>

          <p>Bonjour <strong>${nom}</strong>,</p>
          <p>${config.description}</p>

          <div style="background:#EBF5FB;border-left:4px solid #1B4F72;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;">
            <p style="margin:0 0 10px;font-weight:bold;color:#1B4F72;">Ce que vous pouvez faire sur FORGES :</p>
            <ul style="margin:0;padding-left:20px;">
              ${permissionsHtml}
            </ul>
          </div>

          <div style="background:#F9F9F9;border:1px solid #E8E8E8;border-radius:8px;padding:16px 20px;margin:20px 0;">
            <p style="margin:0 0 8px;font-weight:bold;color:#1B4F72;">Vos identifiants de connexion</p>
            <p style="margin:4px 0;">Email : <strong>${email}</strong></p>
            <p style="margin:4px 0;">Mot de passe temporaire : <code style="background:#F0F0F0;padding:3px 8px;border-radius:4px;font-size:14px;">${tempPassword}</code></p>
          </div>

          <p style="text-align:center;margin:24px 0;">
            <a href="${loginUrl}" style="display:inline-block;background:#1B4F72;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:15px;">Accéder à mon espace FORGES</a>
          </p>
          <p style="font-size:12px;color:#888;text-align:center;">Si le bouton ne fonctionne pas : <a href="${loginUrl}" style="color:#1B4F72;">${loginUrl}</a></p>

          <p style="background:#FEF9E7;border:1px solid #F9E79F;border-radius:6px;padding:12px 16px;font-size:13px;">
            <strong>Important :</strong> Ce mot de passe est temporaire. Vous devrez le modifier des votre premiere connexion.
          </p>

          <p style="color:#566573;font-size:12px;margin-top:24px;border-top:1px solid #EEE;padding-top:16px;">
            Pour toute question, contactez-nous : <a href="mailto:contact@forges-group.com" style="color:#1B4F72;">contact@forges-group.com</a><br>
            &copy; 2026 FORGES AGREGATEUR
          </p>
        </div>
      `,
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
    const subject = 'Invitation à rejoindre FORGES en tant que partenaire';

    const permissionsHtml = [
      'Soumettre vos formations au catalogue FORGES',
      'Suivre les validations et le statut de vos dossiers',
      'Accéder à votre tableau de bord et vos reversements',
      'Gérer vos apprenants et vos sessions de formation',
    ].map(p => `<li style="margin:6px 0;color:#1C2833;">${p}</li>`).join('');

    const permissionsText = [
      '  • Soumettre vos formations au catalogue FORGES',
      '  • Suivre les validations et le statut de vos dossiers',
      '  • Accéder à votre tableau de bord et vos reversements',
      '  • Gérer vos apprenants et vos sessions de formation',
    ].join('\n');

    await this.sendEmail({
      to: email,
      subject,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        'Vous avez été invité à rejoindre FORGES en tant que partenaire de formation.',
        'En activant votre compte, vous pourrez :',
        permissionsText,
        '',
        'Pour finaliser votre inscription, cliquez sur le lien ci-dessous :',
        invitationUrl,
        '',
        'Ce lien est personnel et valable pendant 48 heures.',
        '',
        "L'équipe FORGES",
      ]),
      html: `
        <div style="font-family:Arial,sans-serif;color:#1C2833;line-height:1.6;max-width:600px;">
          <h2 style="color:#1B4F72;margin-bottom:4px;">Bienvenue sur FORGES</h2>
          <p style="color:#566573;margin-top:0;font-size:14px;">Votre espace <strong>Partenaire</strong> vous attend</p>

          <p>Bonjour,</p>
          <p>Vous avez été invité à rejoindre <strong>FORGES Agrégateur</strong> en tant que partenaire de formation. Activez votre compte pour accéder à votre espace dédié.</p>

          <div style="background:#EBF5FB;border-left:4px solid #1B4F72;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;">
            <p style="margin:0 0 10px;font-weight:bold;color:#1B4F72;">En tant que partenaire, vous pourrez :</p>
            <ul style="margin:0;padding-left:20px;">
              ${permissionsHtml}
            </ul>
          </div>

          <p style="text-align:center;margin:28px 0;">
            <a href="${invitationUrl}" style="display:inline-block;background:#1B4F72;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:15px;">Activer mon compte partenaire</a>
          </p>
          <p style="font-size:12px;color:#888;text-align:center;">Si le bouton ne fonctionne pas : <a href="${invitationUrl}" style="color:#1B4F72;">${invitationUrl}</a></p>

          <p style="background:#FEF9E7;border:1px solid #F9E79F;border-radius:6px;padding:12px 16px;font-size:13px;">
            <strong>Important :</strong> Ce lien est personnel et valable pendant <strong>48 heures</strong>. Ne le partagez pas.
          </p>

          <p style="color:#566573;font-size:12px;margin-top:24px;border-top:1px solid #EEE;padding-top:16px;">
            Pour toute question, contactez-nous : <a href="mailto:contact@forges-group.com" style="color:#1B4F72;">contact@forges-group.com</a><br>
            &copy; 2026 FORGES AGREGATEUR
          </p>
        </div>
      `,
    });
  }

  async sendCodeApporteur(
    email: string,
    code: string,
    langue: string,
    nom?: string,
    tauxCommissionPct?: number,
  ): Promise<void> {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    const registerUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?ref=${code}`;
    const taux = tauxCommissionPct ?? 5;
    const greeting = nom ? `Bonjour <strong>${nom}</strong>,` : 'Bonjour,';
    const greetingText = nom ? `Bonjour ${nom},` : 'Bonjour,';
    const subject = 'Bienvenue sur FORGES — Votre compte Apporteur est activé';

    await this.sendEmail({
      to: email,
      subject,
      text: this.buildTextEmail([
        greetingText,
        '',
        'Votre compte Apporteur FORGES est activé. Vous pouvez désormais recommander nos formations et percevoir une commission sur chaque inscription réalisée via votre lien.',
        '',
        `Votre taux de commission : ${taux}%`,
        'Ce taux s\'applique sur le montant encaissé par FORGES pour chaque inscription générée par votre code.',
        '',
        'Comment ça marche :',
        '  1. Partagez votre code ou lien de parrainage à vos contacts',
        '  2. Ils s\'inscrivent via votre lien ou saisissent votre code',
        '  3. A chaque paiement validé, une commission est créditée sur votre compte',
        `  4. Dès que votre cumul atteint 5 000 XOF, le reversement est traité`,
        '',
        `Votre code apporteur : ${code}`,
        `Votre lien de parrainage : ${registerUrl}`,
        '',
        `Accédez à votre tableau de bord pour suivre vos commissions : ${loginUrl}`,
        '',
        'Pour toute question : contact@forges-group.com',
        '',
        "L'equipe FORGES",
      ]),
      html: `
        <div style="font-family:Arial,sans-serif;color:#1C2833;line-height:1.6;max-width:600px;">
          <h2 style="color:#6C3483;margin-bottom:4px;">Bienvenue sur FORGES</h2>
          <p style="color:#566573;margin-top:0;font-size:14px;">Votre compte <strong>Apporteur</strong> est activé</p>

          <p>${greeting}</p>
          <p>Vous pouvez désormais recommander les formations FORGES et percevoir une commission sur chaque inscription réalisée via votre lien ou code.</p>

          <div style="background:#F5EEF8;border-left:4px solid #6C3483;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;">
            <p style="margin:0 0 10px;font-weight:bold;color:#6C3483;">Comment ça marche :</p>
            <ol style="margin:0;padding-left:20px;color:#1C2833;">
              <li style="margin:6px 0;">Partagez votre code ou lien de parrainage à vos contacts</li>
              <li style="margin:6px 0;">Ils s'inscrivent via votre lien ou saisissent votre code à l'inscription</li>
              <li style="margin:6px 0;">A chaque paiement validé, une commission est créditée sur votre compte</li>
              <li style="margin:6px 0;">Dès que votre cumul atteint <strong>5 000 XOF</strong>, le reversement est traité</li>
            </ol>
          </div>

          <div style="background:#F9F9F9;border:1px solid #E8E8E8;border-radius:8px;padding:16px 20px;margin:20px 0;">
            <p style="margin:0 0 12px;font-weight:bold;color:#6C3483;">Vos informations d'apporteur</p>
            <p style="margin:4px 0;font-size:13px;">Taux de commission : <strong style="font-size:20px;color:#6C3483;">${taux}%</strong></p>
            <p style="margin:12px 0 4px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.05em;">Votre code permanent</p>
            <p style="margin:0;"><code style="background:#EEE;padding:6px 12px;border-radius:6px;font-size:13px;word-break:break-all;">${code}</code></p>
            <p style="margin:12px 0 4px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.05em;">Votre lien de parrainage</p>
            <p style="margin:0;word-break:break-all;font-size:13px;"><a href="${registerUrl}" style="color:#6C3483;">${registerUrl}</a></p>
          </div>

          <p style="text-align:center;margin:24px 0;">
            <a href="${loginUrl}" style="display:inline-block;background:#6C3483;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:15px;">Accéder à mon tableau de bord</a>
          </p>
          <p style="font-size:12px;color:#888;text-align:center;">Si le bouton ne fonctionne pas : <a href="${loginUrl}" style="color:#6C3483;">${loginUrl}</a></p>

          <p style="color:#566573;font-size:12px;margin-top:24px;border-top:1px solid #EEE;padding-top:16px;">
            Pour toute question : <a href="mailto:contact@forges-group.com" style="color:#6C3483;">contact@forges-group.com</a><br>
            &copy; 2026 FORGES AGREGATEUR
          </p>
        </div>
      `,
    });
  }

  async sendVouchersOrganisation(
    email: string,
    codes: string[],
    formationLabel: string,
    organisationLabel?: string
  ): Promise<void> {
    const title = 'Vos vouchers organisation FORGES';
    const intro = organisationLabel
      ? `Suite au paiement de votre devis, vos vouchers pour l'organisation ${organisationLabel} sont prêts.`
      : 'Suite au paiement de votre devis, vos vouchers organisation sont prêts.';
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        intro,
        `Formation : ${formationLabel}`,
        `Codes : ${codes.join(', ')}`,
        'Merci de les distribuer à vos employés pour leurs inscriptions.',
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        organisationLabel
          ? `Suite au paiement de votre devis, vos vouchers pour l'organisation <strong>${organisationLabel}</strong> sont prêts.`
          : 'Suite au paiement de votre devis, vos vouchers organisation sont prêts.',
        `<strong>Formation :</strong> ${formationLabel}`,
        `<strong>Codes :</strong> ${codes.join(', ')}`,
        'Merci de les distribuer à vos employés pour leurs inscriptions.',
      ]),
    });
  }

  async sendVoucherRefuse(email: string, motif: string, langue: string): Promise<void> {
    const title = 'Voucher promotionnel refusé';
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        'Votre voucher promotionnel a été refusé.',
        `Motif: ${motif}`,
        `Langue du message: ${langue}`,
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        'Votre voucher promotionnel a été refusé.',
        `<strong>Motif :</strong> ${motif}`,
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

  async sendPaiementConfirme(email: string, formation: string): Promise<void> {
    const title = 'Paiement confirmé';
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        `Votre paiement pour la formation ${formation} a été confirmé.`,
        'Votre dossier peut continuer son traitement.',
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        `Votre paiement pour la formation <strong>${formation}</strong> a été confirmé.`,
        'Votre dossier peut continuer son traitement.',
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
      delai_paiement_heures: getDelaiPaiementH().toString(),
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
      delai_paiement_heures: getDelaiPaiementH().toString(),
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

  async sendAlerteFinEssai(email: string, dateFinEssai: Date, langue: string): Promise<void> {
    const title = "Votre periode d'essai FORGES arrive a echeance";
    await this.sendEmail({
      to: email,
      subject: title,
      text: this.buildTextEmail([
        'Bonjour,',
        '',
        `Votre periode d'essai se termine le ${dateFinEssai.toLocaleDateString('fr-FR')}.`,
        'Souscrivez un abonnement Organisation pour conserver votre acces.',
        `Langue du message: ${langue}`,
      ]),
      html: this.buildHtmlEmail(title, [
        'Bonjour,',
        `Votre periode d'essai se termine le <strong>${dateFinEssai.toLocaleDateString('fr-FR')}</strong>.`,
        'Souscrivez un abonnement Organisation pour conserver votre acces.',
        `Langue du message : ${langue}`,
      ]),
    });
  }

  async sendEnrolementConfirmationApprenant(options: {
    to: string;
    prenoms: string;
    nom: string;
    fonction?: string;
    organisation: string;
    formation: string;
    session?: {
      date_debut?: Date | string | null;
      date_fin?: Date | string | null;
      lieu?: string | null;
    } | null;
  }): Promise<void> {
    const { to, prenoms, nom, organisation, formation, session } = options;
    const { subject, text, html } = buildEnrollmentConfirmationEmail({
      prenoms,
      nom,
      organisation,
      formation,
      session,
    });

    await this.sendEmail({
      to,
      subject,
      text,
      html,
    });
  }

  async sendEnrolementDevisOrganisation(options: {
    to: string;
    contactReferent: string;
    organisation: string;
    formation: string;
    numeroDevis: string;
    nbPlaces: number;
    tarifUnitaire: number;
    montantTotal: number;
    notesAdmin?: string;
    pdfBuffer?: Buffer;
    pdfFilename?: string;
  }): Promise<void> {
    const {
      to, contactReferent, organisation, formation,
      numeroDevis, nbPlaces, tarifUnitaire, montantTotal,
      notesAdmin, pdfBuffer, pdfFilename,
    } = options;

    const tarifFormate = tarifUnitaire.toLocaleString('fr-FR');
    const montantFormate = montantTotal.toLocaleString('fr-FR');
    const sujet = `Devis ${numeroDevis} — Masterclass GWU/CCDL — FORGES`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a2e;">
        <div style="background:#1a1a2e;padding:24px 32px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;letter-spacing:1px;">FORGES AGRÉGATEUR</h1>
          <p style="color:#a0a8c0;margin:4px 0 0;font-size:13px;">Devis de formation — réf. ${numeroDevis}</p>
        </div>

        <div style="background:#f8f9fb;padding:32px;border-radius:0 0 8px 8px;">
          <p style="font-size:15px;color:#333;margin-top:0;">Bonjour <strong>${contactReferent}</strong>,</p>
          <p style="font-size:14px;color:#555;">
            Veuillez trouver ci-joint le devis de participation de <strong>${organisation}</strong>
            à la <strong>${formation}</strong>.
          </p>

          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin:24px 0;">
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr style="background:#f1f5f9;">
                <td style="padding:12px 16px;color:#666;font-weight:600;">Organisation</td>
                <td style="padding:12px 16px;text-align:right;font-weight:700;">${organisation}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;color:#666;">Formation</td>
                <td style="padding:12px 16px;text-align:right;font-weight:600;">${formation}</td>
              </tr>
              <tr style="background:#f1f5f9;">
                <td style="padding:12px 16px;color:#666;">Nombre de places</td>
                <td style="padding:12px 16px;text-align:right;font-weight:600;">${nbPlaces}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;color:#666;">Tarif unitaire</td>
                <td style="padding:12px 16px;text-align:right;font-weight:600;">${tarifFormate} FCFA</td>
              </tr>
              <tr style="border-top:2px solid #1a1a2e;">
                <td style="padding:16px;font-weight:700;font-size:15px;">MONTANT TOTAL</td>
                <td style="padding:16px;text-align:right;font-weight:700;font-size:18px;color:#1a1a2e;">${montantFormate} FCFA</td>
              </tr>
            </table>
          </div>

          ${notesAdmin ? `<p style="font-size:13px;color:#888;font-style:italic;border-left:3px solid #e2e8f0;padding-left:12px;">${notesAdmin}</p>` : ''}

          <p style="font-size:14px;color:#555;">
            Le devis en PDF est joint à cet email. Pour valider votre participation et procéder au règlement,
            contactez notre équipe en répondant à ce message.
          </p>

          <div style="border-top:1px solid #e2e8f0;margin-top:32px;padding-top:20px;">
            <p style="font-size:13px;color:#888;margin:0;">
              FORGES AGRÉGATEUR — <a href="mailto:contact@forges-group.com" style="color:#1a1a2e;font-weight:600;">contact@forges-group.com</a>
            </p>
          </div>
        </div>
      </div>
    `;

    if (pdfBuffer && pdfFilename) {
      await this.sendEmailWithAttachment({
        to,
        subject: sujet,
        html,
        attachment: { filename: pdfFilename, content: pdfBuffer, contentType: 'application/pdf' },
      });
    } else {
      await this.sendEmail({ to, subject: sujet, html });
    }
  }
}

export const emailService = new EmailService();
