import { DossierStateMachine, DossierStatut, DELAI_PAIEMENT_MS } from '../dossier-state-machine';

describe('DossierStateMachine', () => {
  let machine: DossierStateMachine;

  beforeEach(() => {
    machine = new DossierStateMachine();
  });

  describe('DELAI_PAIEMENT_MS', () => {
    it('vaut exactement 72 heures en millisecondes', () => {
      expect(DELAI_PAIEMENT_MS).toBe(72 * 60 * 60 * 1000);
    });
  });

  describe('EN_ATTENTE_VERIFICATION -> RETENU', () => {
    it('accepte la transition pour un dossier Premium+Retail', () => {
      expect(() =>
        machine.canTransition('EN_ATTENTE_VERIFICATION', 'RETENU', {
          type_formation: 'PREMIUM',
          source_financement: 'RETAIL',
        })
      ).not.toThrow();
    });

    it('refuse si la formation n est pas PREMIUM (type STANDARD)', () => {
      expect(() =>
        machine.canTransition('EN_ATTENTE_VERIFICATION', 'RETENU', {
          type_formation: 'STANDARD',
          source_financement: 'RETAIL',
        })
      ).toThrow('NOT_PREMIUM_RETAIL');
    });

    it('refuse si la source de financement n est pas RETAIL (source B2B)', () => {
      expect(() =>
        machine.canTransition('EN_ATTENTE_VERIFICATION', 'RETENU', {
          type_formation: 'PREMIUM',
          source_financement: 'B2B',
        })
      ).toThrow('NOT_PREMIUM_RETAIL');
    });

    it('refuse si formation et source sont tous deux invalides', () => {
      expect(() =>
        machine.canTransition('EN_ATTENTE_VERIFICATION', 'RETENU', {
          type_formation: 'STANDARD',
          source_financement: 'ABONNEMENT',
        })
      ).toThrow('NOT_PREMIUM_RETAIL');
    });

    it('refuse si le statut courant n est pas EN_ATTENTE_VERIFICATION (dossier RETENU)', () => {
      expect(() =>
        machine.canTransition('RETENU', 'RETENU', {
          type_formation: 'PREMIUM',
          source_financement: 'RETAIL',
        })
      ).toThrow('TRANSITION_INVALIDE');
    });

    it('refuse si le statut courant est PAYE_DIRECTEMENT', () => {
      expect(() =>
        machine.canTransition('PAYE_DIRECTEMENT', 'RETENU', {
          type_formation: 'PREMIUM',
          source_financement: 'RETAIL',
        })
      ).toThrow('TRANSITION_INVALIDE');
    });
  });

  describe('EN_ATTENTE_VERIFICATION -> REJETE', () => {
    it('accepte la transition avec motif valide pour un dossier Premium+Retail', () => {
      expect(() =>
        machine.canTransition('EN_ATTENTE_VERIFICATION', 'REJETE', {
          type_formation: 'PREMIUM',
          source_financement: 'RETAIL',
          motif_refus: 'Dossier incomplet',
        })
      ).not.toThrow();
    });

    it('refuse si motif_refus est absent', () => {
      expect(() =>
        machine.canTransition('EN_ATTENTE_VERIFICATION', 'REJETE', {
          type_formation: 'PREMIUM',
          source_financement: 'RETAIL',
        })
      ).toThrow('MOTIF_REQUIS');
    });

    it('refuse si motif_refus est une chaine vide', () => {
      expect(() =>
        machine.canTransition('EN_ATTENTE_VERIFICATION', 'REJETE', {
          type_formation: 'PREMIUM',
          source_financement: 'RETAIL',
          motif_refus: '',
        })
      ).toThrow('MOTIF_REQUIS');
    });

    it('refuse si motif_refus contient uniquement des espaces', () => {
      expect(() =>
        machine.canTransition('EN_ATTENTE_VERIFICATION', 'REJETE', {
          type_formation: 'PREMIUM',
          source_financement: 'RETAIL',
          motif_refus: '   ',
        })
      ).toThrow('MOTIF_REQUIS');
    });

    it('refuse si la formation n est pas PREMIUM', () => {
      expect(() =>
        machine.canTransition('EN_ATTENTE_VERIFICATION', 'REJETE', {
          type_formation: 'STANDARD',
          source_financement: 'RETAIL',
          motif_refus: 'Dossier incomplet',
        })
      ).toThrow('NOT_PREMIUM_RETAIL');
    });

    it('refuse si la source n est pas RETAIL', () => {
      expect(() =>
        machine.canTransition('EN_ATTENTE_VERIFICATION', 'REJETE', {
          type_formation: 'PREMIUM',
          source_financement: 'VOUCHER',
          motif_refus: 'Dossier incomplet',
        })
      ).toThrow('NOT_PREMIUM_RETAIL');
    });
  });

  describe('EN_ATTENTE_VERIFICATION -> ANNULE', () => {
    it('accepte l annulation volontaire sans guard de formation', () => {
      expect(() =>
        machine.canTransition('EN_ATTENTE_VERIFICATION', 'ANNULE', {})
      ).not.toThrow();
    });
  });

  describe('PAYE_DIRECTEMENT -> PAYE', () => {
    it('accepte la transition webhook paiement confirme', () => {
      expect(() =>
        machine.canTransition('PAYE_DIRECTEMENT', 'PAYE', {})
      ).not.toThrow();
    });
  });

  describe('RETENU -> PAYE', () => {
    it('accepte la transition paiement confirme apres retention', () => {
      expect(() =>
        machine.canTransition('RETENU', 'PAYE', {})
      ).not.toThrow();
    });
  });

  describe('transitions invalides', () => {
    it('refuse une transition depuis un statut terminal PAYE', () => {
      expect(() =>
        machine.canTransition('PAYE', 'ANNULE', {})
      ).toThrow('TRANSITION_INVALIDE');
    });

    it('refuse une transition depuis un statut terminal REJETE', () => {
      expect(() =>
        machine.canTransition('REJETE', 'PAYE', {})
      ).toThrow('TRANSITION_INVALIDE');
    });

    it('refuse une transition depuis un statut terminal ANNULE', () => {
      expect(() =>
        machine.canTransition('ANNULE', 'RETENU', {})
      ).toThrow('TRANSITION_INVALIDE');
    });

    it('refuse PAYE_DIRECTEMENT -> RETENU (non autorise)', () => {
      expect(() =>
        machine.canTransition('PAYE_DIRECTEMENT', 'RETENU', {
          type_formation: 'PREMIUM',
          source_financement: 'RETAIL',
        })
      ).toThrow('TRANSITION_INVALIDE');
    });
  });
});
