import { PrismaClient } from '@prisma/client';
import { dechiffrerUrl } from '../../shared/crypto/crypto.service';
import { AuditLogger } from '../../shared/audit/audit.logger';

export class ProxyAccesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly audit: AuditLogger
  ) {}

  async acceder(accesId: string, userId: string): Promise<string> {
    const acces = await this.prisma.accesFormationDemande.findUnique({
      where: { id: accesId },
      include: { formation: { select: { id: true, intitule: true, url_externe_chiffree: true } } },
    });

    if (!acces) throw new Error('ACCES_NOT_FOUND');
    if (acces.apprenant_id !== userId) throw new Error('ACCES_FORBIDDEN');
    if (acces.statut !== 'ACTIF') throw new Error('ACCES_INACTIF');
    if (acces.date_expiration < new Date()) throw new Error('ACCES_EXPIRE');

    const urlChiffree = acces.formation?.url_externe_chiffree;
    if (!urlChiffree) throw new Error('URL_FORMATION_INDISPONIBLE');

    const urlReelle = dechiffrerUrl(urlChiffree);

    // Mettre à jour last_access_at
    await this.prisma.accesFormationDemande.update({
      where: { id: accesId },
      data: { last_access_at: new Date() },
    });

    // Log sans URL réelle — RM-154
    await this.audit.info('PROXY_ACCES_FORMATION', {
      acces_id: accesId,
      formation_id: acces.formation_id,
      user_id: userId,
    });

    return urlReelle;
  }
}
