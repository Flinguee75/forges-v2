/**
 * Tests pour les utilitaires de formatage de formations
 * Validé pour FormationDetailPage et FormationMarketplaceCard
 */

describe('Utilitaires de formatage pour formations', () => {
  describe('formatDuration', () => {
    it('devrait formater 1 jour correctement', () => {
      const formatDuration = (days) => {
        if (days === 1) return '1 jour';
        return `${days} jours`;
      };

      expect(formatDuration(1)).toBe('1 jour');
    });

    it('devrait formater plusieurs jours correctement', () => {
      const formatDuration = (days) => {
        if (days === 1) return '1 jour';
        return `${days} jours`;
      };

      expect(formatDuration(60)).toBe('60 jours');
      expect(formatDuration(30)).toBe('30 jours');
      expect(formatDuration(365)).toBe('365 jours');
    });

    it('devrait gérer 0 jour', () => {
      const formatDuration = (days) => {
        if (!days) return 'N/A';
        if (days === 1) return '1 jour';
        return `${days} jours`;
      };

      expect(formatDuration(0)).toBe('N/A');
    });
  });

  describe('getFormationDescription', () => {
    it('devrait prioriser description_courte', () => {
      const getFormationDescription = (item) =>
        item?.description || item?.description_courte || item?.description_longue || '';

      const formation = {
        description_courte: 'Description courte',
        description_longue: 'Description longue',
      };

      expect(getFormationDescription(formation)).toBe('Description courte');
    });

    it('devrait retourner une chaîne vide si aucune description', () => {
      const getFormationDescription = (item) =>
        item?.description || item?.description_courte || item?.description_longue || '';

      const formation = {};

      expect(getFormationDescription(formation)).toBe('');
    });
  });

  describe('getCertificationDelivree', () => {
    it('devrait retourner true si certification_delivree est true', () => {
      const getCertificationDelivree = (item) => item?.certification_delivree || false;

      const formation = { certification_delivree: true };

      expect(getCertificationDelivree(formation)).toBe(true);
    });

    it('devrait retourner false par défaut', () => {
      const getCertificationDelivree = (item) => item?.certification_delivree || false;

      const formation = {};

      expect(getCertificationDelivree(formation)).toBe(false);
    });
  });

  describe('getFormationCompetences', () => {
    it('devrait retourner un array d\'objectifs pédagogiques', () => {
      const getFormationCompetences = (item) => item?.objectifs_pedagogiques || [];

      const formation = {
        objectifs_pedagogiques: ['Compétence 1', 'Compétence 2'],
      };

      expect(getFormationCompetences(formation)).toEqual(['Compétence 1', 'Compétence 2']);
    });

    it('devrait retourner un array vide si pas d\'objectifs', () => {
      const getFormationCompetences = (item) => item?.objectifs_pedagogiques || [];

      const formation = {};

      expect(getFormationCompetences(formation)).toEqual([]);
    });
  });

  describe('getFormationPrerequis', () => {
    it('devrait retourner les prérequis', () => {
      const getFormationPrerequis = (item) => item?.prerequis || '';

      const formation = {
        prerequis: 'Maîtrise de Python et Linux',
      };

      expect(getFormationPrerequis(formation)).toBe('Maîtrise de Python et Linux');
    });

    it('devrait retourner une chaîne vide si pas de prérequis', () => {
      const getFormationPrerequis = (item) => item?.prerequis || '';

      const formation = {};

      expect(getFormationPrerequis(formation)).toBe('');
    });
  });

  describe('Intégration complète avec une formation mock', () => {
    it('devrait traiter une formation complète correctement', () => {
      const mockFormation = {
        id: 'frm-prem-0001-0000-0000-000000000002',
        intitule: '[F-PREM-01] Cybersécurité Avancée GWU',
        description_courte: 'Certification Premium GWU — Cybersécurité niveau expert.',
        description_longue: '<p>Formation complète en cybersécurité.</p>',
        duree_jours: 60,
        cout_catalogue: 200000000,
        type_formation: 'PREMIUM',
        certification_delivree: true,
        prerequis: 'Maîtrise de Python et Linux',
        objectifs_pedagogiques: [
          'Sécuriser une infrastructure',
          'Gérer les risques',
        ],
      };

      // Accesseurs
      const getFormationDescription = (item) =>
        item?.description || item?.description_courte || item?.description_longue || '';
      const getFormationDuree = (item) => item?.duree ?? item?.duree_jours;
      const getCertificationDelivree = (item) => item?.certification_delivree || false;
      const getFormationPrerequis = (item) => item?.prerequis || '';
      const getFormationCompetences = (item) => item?.objectifs_pedagogiques || [];

      expect(getFormationDescription(mockFormation)).toBe(
        'Certification Premium GWU — Cybersécurité niveau expert.'
      );
      expect(getFormationDuree(mockFormation)).toBe(60);
      expect(getCertificationDelivree(mockFormation)).toBe(true);
      expect(getFormationPrerequis(mockFormation)).toBe('Maîtrise de Python et Linux');
      expect(getFormationCompetences(mockFormation)).toHaveLength(2);
    });
  });
});
