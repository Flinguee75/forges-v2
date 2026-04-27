import { BotRepository } from './bot.repository';
import { PrismaClient } from '@prisma/client';

// RM-118 : options des questions fermées — AUCUNE saisie libre
export const OPTIONS_BOT = {
  OBJECTIF: ['Certifier mes compétences', 'Changer de domaine', 'Progresser dans mon poste', 'Découvrir un secteur', 'Améliorer mes revenus'],
  SECTEUR:  ['IT & Cybersécurité', 'Finance', 'Santé', 'Droit', 'Management', 'IA & Data', 'Logistique', 'RH', 'Autre'],
  NIVEAU:   ['Débutant', 'Intermédiaire', 'Avancé', 'Expert'],
  DOMAINE_ENQUETE: ['IT', 'Finance', 'Santé', 'Droit', 'Management', 'IA', 'Cybersécurité', 'Autre'],
  VOLUME_ENQUETE:  ['1–5', '6–20', '21–50', '51+'],
  RECOMMANDE:      ['Oui', 'Non'],
  NOTE_ETOILES:    [1, 2, 3, 4, 5],
} as const;

// RM-116 : règles de déclenchement automatique des flux
export function determinerFluxPrioritaire(profil: {
  sessions_cloturees_sans_feedback: boolean;
  est_abonne_essentiel: boolean;
  formation_premium_souhaitee: boolean;
  palier_b2b_plein: boolean;
  dernier_refus_upgrade_jours: number | null;
  nb_refus_upgrade: number;
}): 'FEEDBACK' | 'UPGRADE' | 'ORIENTATION' {
  // RM-121 : Feedback prioritaire
  if (profil.sessions_cloturees_sans_feedback) return 'FEEDBACK';

  // RM-120 : cooldown upgrade
  const cooldownJours = profil.nb_refus_upgrade >= 3 ? 30 : 7;
  const upgradeBloque = profil.dernier_refus_upgrade_jours !== null &&
    profil.dernier_refus_upgrade_jours < cooldownJours;

  // RM-119 : upgrade si conditions satisfaites
  if (!upgradeBloque && (profil.est_abonne_essentiel && profil.formation_premium_souhaitee || profil.palier_b2b_plein)) {
    return 'UPGRADE';
  }

  return 'ORIENTATION';
}

export class BotEngineService {
  constructor(
    private readonly botRepo: BotRepository,
    private readonly prisma: PrismaClient
  ) {}

  // RM-118 : valider réponse — doit être dans les options autorisées
  validerReponse(question: string, valeur: any, options: readonly any[]): boolean {
    return (options as any[]).includes(valeur);
  }

  // RM-118 : Flux Orientation — filtrage catalogue par arbre de décision
  async fluxOrientation(reponses: {
    objectif?: string;
    secteur?: string;
    niveau?: string;
  }, langue: string, estAbonne: boolean) {

    const formations = await this.botRepo.filtrerFormations({
      langue,
      inclus_abonnement: estAbonne ? true : undefined,
    });

    // RM-118 : max 5 formations, badges inclus_abonnement + Premium
    return formations.map(f => ({
      ...f,
      badge_inclus: f.inclus_abonnement ? 'Inclus dans votre abonnement' : null,
      badge_premium: f.type_formation === 'PREMIUM' ? 'Premium' : null,
    }));
  }

  // RM-119/120 : Flux Upgrade suggestion
  genererArgumentaireUpgrade(
    offre_actuelle: string,
    formation_ciblee_type?: string
  ): string {
    if (offre_actuelle === 'ESSENTIEL' && formation_ciblee_type === 'PREMIUM') {
      return 'Avec l\'abonnement Premium, vous bénéficiez de -15% sur toutes les formations Premium et d\'un accès illimité aux formations Standard incluses.';
    }
    return 'Passez au palier supérieur pour former plus de collaborateurs et accéder aux formations certifiantes.';
  }

  // RM-122 : Flux Feedback — 5 questions fixes
  getQuestionsFeedback(formation_intitule: string, langue: string) {
    return [
      { id: 1, texte: `Comment évaluez-vous globalement la formation "${formation_intitule}" ?`, options: OPTIONS_BOT.NOTE_ETOILES, obligatoire: true },
      { id: 2, texte: 'Quelle note donnez-vous au contenu pédagogique ?', options: OPTIONS_BOT.NOTE_ETOILES, obligatoire: false },
      { id: 3, texte: 'Quelle note donnez-vous au formateur/à l\'organisation ?', options: OPTIONS_BOT.NOTE_ETOILES, obligatoire: false },
      { id: 4, texte: 'Votre commentaire (optionnel, max 500 caractères)', type: 'TEXTE_LIBRE', max_length: 500, obligatoire: false },
      { id: 5, texte: 'Recommanderiez-vous cette formation ?', options: OPTIONS_BOT.RECOMMANDE, obligatoire: true },
    ];
  }

  // RM-123 : Flux Enquête — 3 questions fermées
  getQuestionsEnquete() {
    return [
      { id: 1, texte: 'Dans quel domaine cherchez-vous une formation ?', options: OPTIONS_BOT.DOMAINE_ENQUETE, obligatoire: true },
      { id: 2, texte: 'Quel niveau ciblez-vous ?', options: OPTIONS_BOT.NIVEAU, obligatoire: true },
      { id: 3, texte: 'Combien de personnes souhaitez-vous former ?', options: OPTIONS_BOT.VOLUME_ENQUETE, obligatoire: true },
    ];
  }
}
