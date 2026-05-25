export type DossierStatut =
  | 'EN_ATTENTE_VERIFICATION'
  | 'PAYE_DIRECTEMENT'
  | 'RETENU'
  | 'REJETE'
  | 'ANNULE'
  | 'PAYE';

export const DELAI_PAIEMENT_MS = 72 * 60 * 60 * 1000;

export interface TransitionContext {
  type_formation?: string;
  source_financement?: string;
  motif_refus?: string;
}

type TransitionGuard = (context: TransitionContext) => void;

interface TransitionRule {
  guard: TransitionGuard;
}

const TRANSITIONS: Partial<Record<DossierStatut, Partial<Record<DossierStatut, TransitionRule>>>> = {
  EN_ATTENTE_VERIFICATION: {
    RETENU: {
      guard: (ctx) => {
        if (ctx.type_formation !== 'PREMIUM' || ctx.source_financement !== 'RETAIL') {
          const err = new Error('NOT_PREMIUM_RETAIL');
          (err as any).code = 'NOT_PREMIUM_RETAIL';
          throw err;
        }
      },
    },
    REJETE: {
      guard: (ctx) => {
        if (ctx.type_formation !== 'PREMIUM' || ctx.source_financement !== 'RETAIL') {
          const err = new Error('NOT_PREMIUM_RETAIL');
          (err as any).code = 'NOT_PREMIUM_RETAIL';
          throw err;
        }
        if (!ctx.motif_refus || ctx.motif_refus.trim().length === 0) {
          const err = new Error('MOTIF_REQUIS');
          (err as any).code = 'MOTIF_REQUIS';
          throw err;
        }
      },
    },
    ANNULE: {
      guard: (_ctx) => {
        // annulation volontaire apprenant — RM-27, pas de guard formation requis
      },
    },
  },
  PAYE_DIRECTEMENT: {
    PAYE: {
      guard: (_ctx) => {
        // webhook paiement confirmé — pas de guard supplémentaire
      },
    },
    ANNULE: {
      guard: (_ctx) => {
        // RM-27 : annulation volontaire si paiement EN_ATTENTE uniquement
        // La vérification statut paiement est dans EspaceApprenantService.annulerDossier()
      },
    },
  },
  RETENU: {
    PAYE: {
      guard: (_ctx) => {
        // paiement confirmé après rétention
      },
    },
  },
};

export class DossierStateMachine {
  canTransition(from: DossierStatut, to: DossierStatut, context: TransitionContext): void {
    const fromTransitions = TRANSITIONS[from];

    if (!fromTransitions) {
      const err = new Error('TRANSITION_INVALIDE');
      (err as any).code = 'TRANSITION_INVALIDE';
      throw err;
    }

    const rule = fromTransitions[to];

    if (!rule) {
      const err = new Error('TRANSITION_INVALIDE');
      (err as any).code = 'TRANSITION_INVALIDE';
      throw err;
    }

    rule.guard(context);
  }
}
