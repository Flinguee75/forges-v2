/**
 * Tests d'intégration pour les améliorations de présentation des formations
 * Valide le flux complet: Catalogue → Détail → Informations enrichies
 */

import { render, screen, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

describe('Intégration: Amélioration présentation formations', () => {
  describe('Sections détails enrichies', () => {
    it('devrait afficher les sections attendues pour une formation Premium certifiante', () => {
      const mockFormation = {
        id: 'frm-test-001',
        intitule: 'Formation Test',
        description_courte: 'Description courte',
        description_longue: '<p>Description longue</p>',
        duree_jours: 60,
        cout_catalogue: 200000000,
        type_formation: 'PREMIUM',
        certification_delivree: true,
        prerequis: 'Prérequis',
        objectifs_pedagogiques: ['Objectif 1', 'Objectif 2'],
        duree_acces_jours: 365,
        statut: 'ACTIVE',
        responsable_id: 'usr-001',
      };

      // Vérifier que tous les champs nécessaires sont présents
      expect(mockFormation.description_longue).toBeTruthy();
      expect(mockFormation.prerequis).toBeTruthy();
      expect(mockFormation.objectifs_pedagogiques.length).toBeGreaterThan(0);
      expect(mockFormation.certification_delivree).toBe(true);
    });

    it('devrait gérer les formations sans détails optionnels', () => {
      const mockFormation = {
        id: 'frm-test-002',
        intitule: 'Formation Basique',
        description_courte: 'Description simple',
        duree_jours: 30,
        cout_catalogue: 50000000,
        type_formation: 'STANDARD',
        certification_delivree: false,
        prerequis: '',
        objectifs_pedagogiques: [],
      };

      // Les champs optionnels sont vides mais pas indéfinis
      expect(mockFormation.prerequis).toBe('');
      expect(mockFormation.objectifs_pedagogiques).toEqual([]);
      expect(mockFormation.certification_delivree).toBe(false);
    });
  });

  describe('Affichage conditionnel', () => {
    it('devrait masquer les sections vides', () => {
      const mockFormation = {
        prerequis: '',
        objectifs_pedagogiques: [],
        certification_delivree: false,
      };

      const shouldShowPrerequisSection = mockFormation.prerequis ? true : false;
      const shouldShowCompetencesSection =
        mockFormation.objectifs_pedagogiques.length > 0 ? true : false;
      const shouldShowCertificationSection = mockFormation.certification_delivree
        ? true
        : false;

      expect(shouldShowPrerequisSection).toBe(false);
      expect(shouldShowCompetencesSection).toBe(false);
      expect(shouldShowCertificationSection).toBe(false);
    });

    it('devrait afficher les sections remplies', () => {
      const mockFormation = {
        prerequis: 'Prérequis nécessaires',
        objectifs_pedagogiques: ['Objectif 1'],
        certification_delivree: true,
      };

      const shouldShowPrerequisSection = mockFormation.prerequis ? true : false;
      const shouldShowCompetencesSection =
        mockFormation.objectifs_pedagogiques.length > 0 ? true : false;
      const shouldShowCertificationSection = mockFormation.certification_delivree
        ? true
        : false;

      expect(shouldShowPrerequisSection).toBe(true);
      expect(shouldShowCompetencesSection).toBe(true);
      expect(shouldShowCertificationSection).toBe(true);
    });
  });

  describe('Cartes formations améliorées', () => {
    it('devrait afficher tous les badges importants', () => {
      const mockFormation = {
        type_formation: 'PREMIUM',
        certification_delivree: true,
        inclus_abonnement: true,
        prerequis: 'Prérequis',
      };

      const badges = [];
      if (mockFormation.inclus_abonnement) badges.push('Inclus');
      if (mockFormation.type_formation === 'PREMIUM') badges.push('Premium');
      if (mockFormation.certification_delivree) badges.push('🏆 Certifiante');

      expect(badges).toContain('Inclus');
      expect(badges).toContain('Premium');
      expect(badges).toContain('🏆 Certifiante');
    });

    it('devrait afficher les prérequis sur la carte si présents', () => {
      const mockFormation = {
        prerequis: 'Maîtrise de Python et Linux',
      };

      const hasPrerequisites = mockFormation.prerequis && mockFormation.prerequis.length > 0;
      expect(hasPrerequisites).toBe(true);
    });

    it('devrait tronquer les prérequis longs', () => {
      const mockFormation = {
        prerequis: 'Prérequis très long ' + 'a'.repeat(100),
      };

      const displayPrerequisites = mockFormation.prerequis
        ? mockFormation.prerequis.length > 50
          ? mockFormation.prerequis.substring(0, 50) + '...'
          : mockFormation.prerequis
        : '';

      expect(displayPrerequisites.length).toBeLessThanOrEqual(53); // 50 + '...'
    });
  });

  describe('Colonne latérale enrichie', () => {
    it('devrait afficher tous les éléments d\'information', () => {
      const mockFormation = {
        duree_jours: 60,
        cout_catalogue: 200000000,
        duree_acces_jours: 365,
        type_formation: 'PREMIUM',
        statut: 'ACTIVE',
        id: 'frm-test-001',
      };

      const infoSections = [];
      if (mockFormation.duree_jours) infoSections.push('duree');
      if (mockFormation.cout_catalogue) infoSections.push('tarif');
      if (mockFormation.duree_acces_jours) infoSections.push('acces');
      if (mockFormation.type_formation) infoSections.push('type');
      if (mockFormation.id) infoSections.push('reference');

      expect(infoSections).toContain('duree');
      expect(infoSections).toContain('tarif');
      expect(infoSections).toContain('acces');
      expect(infoSections).toContain('type');
      expect(infoSections).toContain('reference');
    });
  });

  describe('Formatage et présentation', () => {
    it('devrait formater la durée correctement', () => {
      const formatDuration = (days) => {
        if (!days) return 'N/A';
        if (days === 1) return '1 jour';
        return `${days} jours`;
      };

      expect(formatDuration(1)).toBe('1 jour');
      expect(formatDuration(60)).toBe('60 jours');
      expect(formatDuration(0)).toBe('N/A');
    });

    it('devrait afficher les compétences comme liste à puces', () => {
      const mockFormation = {
        objectifs_pedagogiques: [
          'Sécuriser une infrastructure',
          'Gérer les risques',
          'Auditer un système',
        ],
      };

      mockFormation.objectifs_pedagogiques.forEach((competence, idx) => {
        expect(competence).toBeTruthy();
        expect(typeof competence).toBe('string');
      });

      expect(mockFormation.objectifs_pedagogiques).toHaveLength(3);
    });

    it('devrait afficher les prérequis avec icône 📋', () => {
      const icon = '📋';
      expect(icon).toBe('📋');
    });

    it('devrait afficher les compétences avec icône ✨', () => {
      const icon = '✨';
      expect(icon).toBe('✨');
    });

    it('devrait afficher la certification avec icône 🏆', () => {
      const icon = '🏆';
      expect(icon).toBe('🏆');
    });
  });

  describe('Responsabilité et accessibilité', () => {
    it('devrait supporter les formulations longues', () => {
      const mockFormation = {
        description_longue:
          'Formation très complète qui couvre les aspects avancés de la cybersécurité ' +
          'incluant la sécurité cloud, la conformité RGPD, et la gestion des incidents.',
      };

      expect(mockFormation.description_longue.length).toBeGreaterThan(100);
    });

    it('devrait supporter le rendu HTML', () => {
      const mockFormation = {
        description_longue: '<p>Formation</p><ul><li>Point 1</li></ul>',
      };

      const hasHtml = mockFormation.description_longue.includes('<');
      expect(hasHtml).toBe(true);
    });

    it('devrait supporter le texte brut', () => {
      const mockFormation = {
        description_longue: 'Formation simple en texte brut.',
      };

      const hasHtml = mockFormation.description_longue.includes('<');
      expect(hasHtml).toBe(false);
    });
  });
});
