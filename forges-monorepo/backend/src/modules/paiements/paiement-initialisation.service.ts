import { PrismaClient } from '@prisma/client';
import { getDelaiPaiementMs } from '../../config/env.config';

export interface CreerPaiementOptions {
  dossier_id: string;
  montant_catalogue: number;
  montant_final: number;
  reduction_appliquee: number;
  methode: string;
  statut?: 'EN_ATTENTE' | 'CONFIRME';
  transaction_id?: string;
  confirmed_at?: Date;
}

export class PaiementInitialisationService {
  constructor(private readonly prisma: PrismaClient) {}

  async creerOuRecuperer(options: CreerPaiementOptions): Promise<any> {
    const existant = await this.prisma.paiement.findUnique({
      where: { dossier_id: options.dossier_id },
    });

    if (existant) return existant;

    const statut = options.statut ?? 'EN_ATTENTE';

    return this.prisma.paiement.create({
      data: {
        dossier_id: options.dossier_id,
        montant_catalogue: options.montant_catalogue,
        montant_final: options.montant_final,
        reduction_appliquee: options.reduction_appliquee,
        methode: options.methode,
        statut,
        transaction_id: options.transaction_id ?? undefined,
        confirmed_at: options.confirmed_at ?? undefined,
        expires_at: statut === 'EN_ATTENTE' ? new Date(Date.now() + getDelaiPaiementMs()) : undefined,
      } as any,
    });
  }
}
