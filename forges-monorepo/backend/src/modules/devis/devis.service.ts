import { PrismaClient } from '@prisma/client';
import { DevisRepository } from './devis.repository';
import { AuditLogger } from '../../shared/audit/audit.logger';
import { EmailService } from '../../shared/email/email.service';
import { CreerDevisDto } from './dto/devis.dto';
import { genererPdfDevis } from './devis-pdf.service';

export class DevisService {
  constructor(
    private readonly devisRepository: DevisRepository,
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger,
    private readonly emailService: EmailService
  ) {}

  async creerDevis(dto: CreerDevisDto, adminId: string) {
    const [organisation, formation] = await Promise.all([
      this.prisma.organisation.findUnique({ where: { id: dto.organisation_id } }),
      this.prisma.formation.findUnique({ where: { id: dto.formation_id } }),
    ]);

    if (!organisation) throw new Error('ORGANISATION_NOT_FOUND');
    if (!formation) throw new Error('FORMATION_NOT_FOUND');

    if (dto.session_id) {
      const session = await this.prisma.session.findUnique({ where: { id: dto.session_id } });
      if (!session || session.formation_id !== dto.formation_id) {
        throw new Error('SESSION_INVALIDE');
      }
    }

    const annee = new Date().getFullYear();
    const count = await this.devisRepository.countParAnnee(annee);
    const sequence = String(count + 1).padStart(3, '0');
    const numero_devis = `FORGES-DEVIS-${annee}-${sequence}`;

    // RM-150: montant calculé par le backend, jamais par le client
    const montant_total_xof = dto.nb_places * dto.tarif_unitaire_xof;

    const devis = await this.devisRepository.create({
      numero_devis,
      organisation_id: dto.organisation_id,
      formation_id: dto.formation_id,
      session_id: dto.session_id,
      nb_places: dto.nb_places,
      tarif_unitaire_xof: dto.tarif_unitaire_xof,
      montant_total_xof,
      notes_admin: dto.notes_admin,
      created_by: adminId,
    });

    await this.audit.info('DEVIS_CREE', {
      devis_id: devis.id,
      numero_devis,
      organisation_id: dto.organisation_id,
      montant_total_xof,
      created_by: adminId,
    });

    const langue = organisation.langue_preferee || 'FR';

    let pdfBuffer: Buffer | undefined;
    try {
      const session = dto.session_id
        ? await this.prisma.session.findUnique({ where: { id: dto.session_id } })
        : undefined;
      pdfBuffer = await genererPdfDevis({ devis, organisation, formation, session });
    } catch (pdfError: any) {
      await this.audit.warning('DEVIS_PDF_ECHEC', {
        devis_id: devis.id,
        numero_devis,
        error: pdfError?.message || 'UNKNOWN',
      });
    }

    await this.emailService.sendEmail({
      to: organisation.email,
      subject: langue === 'EN'
        ? `Your quote ${numero_devis} from FORGES`
        : `Votre devis ${numero_devis} — FORGES AGGREGATEUR`,
      html: this.buildEmailDevis(devis, organisation, formation, langue),
    }).catch(async (emailError: any) => {
      await this.audit.warning('DEVIS_EMAIL_ECHEC', {
        devis_id: devis.id,
        numero_devis,
        to: organisation.email,
        error: emailError?.message || 'UNKNOWN',
      });
    });

    if (pdfBuffer) {
      await this.emailService.sendEmailWithAttachment({
        to: organisation.email,
        subject: langue === 'EN'
          ? `Your quote ${numero_devis} from FORGES`
          : `Votre devis ${numero_devis} — FORGES AGGREGATEUR`,
        html: this.buildEmailDevis(devis, organisation, formation, langue),
        attachment: { filename: `${numero_devis}.pdf`, content: pdfBuffer, contentType: 'application/pdf' },
      }).catch(async (emailError: any) => {
        await this.audit.warning('DEVIS_PDF_EMAIL_ECHEC', {
          devis_id: devis.id,
          numero_devis,
          to: organisation.email,
          error: emailError?.message || 'UNKNOWN',
        });
      });
    }

    return devis;
  }

  async listerDevis(filters: { organisation_id?: string; statut?: string } = {}) {
    return this.devisRepository.findAll(filters);
  }

  async getDevis(id: string) {
    const devis = await this.devisRepository.findById(id);
    if (!devis) throw new Error('DEVIS_NOT_FOUND');
    return devis;
  }

  async payerDevis(id: string, agentId: string, notes_admin?: string) {
    const devis = await this.devisRepository.findById(id);
    if (!devis) throw new Error('DEVIS_NOT_FOUND');
    if (devis.statut !== 'CREE') throw new Error('DEVIS_STATUT_INVALIDE');

    const updated = await this.devisRepository.payer(id, notes_admin);

    await this.audit.info('DEVIS_PAYE', {
      devis_id: id,
      numero_devis: devis.numero_devis,
      organisation_id: devis.organisation_id,
      montant_total_xof: devis.montant_total_xof,
      agent_id: agentId,
    });

    return updated;
  }

  async annulerDevis(id: string, adminId: string, notes_admin?: string) {
    const devis = await this.devisRepository.findById(id);
    if (!devis) throw new Error('DEVIS_NOT_FOUND');

    // RM-151: annulation uniquement si statut CREE
    if (devis.statut !== 'CREE') throw new Error('DEVIS_ANNULATION_IMPOSSIBLE');

    const updated = await this.devisRepository.annuler(id, notes_admin);

    await this.audit.info('DEVIS_ANNULE', {
      devis_id: id,
      numero_devis: devis.numero_devis,
      organisation_id: devis.organisation_id,
      admin_id: adminId,
    });

    return updated;
  }

  async listerDevisOrganisation(organisationId: string) {
    return this.devisRepository.findAll({ organisation_id: organisationId });
  }

  private buildEmailDevis(devis: any, organisation: any, formation: any, langue: string): string {
    if (langue === 'EN') {
      return `
        <p>Dear ${organisation.raison_sociale},</p>
        <p>Please find below your quote details:</p>
        <ul>
          <li><strong>Quote number:</strong> ${devis.numero_devis}</li>
          <li><strong>Training:</strong> ${formation.intitule}</li>
          <li><strong>Places:</strong> ${devis.nb_places}</li>
          <li><strong>Unit price:</strong> ${devis.tarif_unitaire_xof.toLocaleString()} XOF</li>
          <li><strong>Total amount:</strong> ${devis.montant_total_xof.toLocaleString()} XOF</li>
        </ul>
        <p>Please proceed with payment and notify your FORGES contact.</p>
      `;
    }
    return `
      <p>Bonjour ${organisation.raison_sociale},</p>
      <p>Veuillez trouver ci-dessous les détails de votre devis :</p>
      <ul>
        <li><strong>Numéro de devis :</strong> ${devis.numero_devis}</li>
        <li><strong>Formation :</strong> ${formation.intitule}</li>
        <li><strong>Nombre de places :</strong> ${devis.nb_places}</li>
        <li><strong>Tarif unitaire :</strong> ${devis.tarif_unitaire_xof.toLocaleString()} XOF</li>
        <li><strong>Montant total :</strong> ${devis.montant_total_xof.toLocaleString()} XOF</li>
      </ul>
      <p>Merci d'effectuer le paiement et de notifier votre contact FORGES.</p>
    `;
  }
}
