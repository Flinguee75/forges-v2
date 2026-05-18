import { BeneficiaireService } from './beneficiaire.service';
import { OrganisationDashboardService } from './organisation-dashboard.service';

export class EspaceOrganisationService {
  constructor(
    private readonly beneficiaireService: BeneficiaireService,
    private readonly dashboardService: OrganisationDashboardService
  ) {}

  getDashboard(organisation_id: string) {
    return this.dashboardService.getDashboard(organisation_id);
  }

  getBeneficiaires(organisation_id: string, filters?: any) {
    return this.beneficiaireService.getBeneficiaires(organisation_id, filters);
  }

  importerBeneficiairesCSV(csvContent: string, organisation_id: string, userId: string) {
    return this.beneficiaireService.importerBeneficiairesCSV(csvContent, organisation_id, userId);
  }

  getMesVouchers(organisation_id: string, filters?: any) {
    return this.dashboardService.getMesVouchers(organisation_id, filters);
  }

  getRapportBailleur(organisation_id: string, filters?: any) {
    return this.dashboardService.getRapportBailleur(organisation_id, filters);
  }

  getDashboardB2B(organisation_id: string) {
    return this.beneficiaireService.getDashboardB2B(organisation_id);
  }

  desactiverBeneficiaire(apprenant_id: string, organisation_id: string, userId: string) {
    return this.beneficiaireService.desactiverBeneficiaire(apprenant_id, organisation_id, userId);
  }

  createMembre(organisation_id: string, data: any) {
    return this.beneficiaireService.createMembre(organisation_id, data);
  }

  commanderVouchers(organisation_id: string, data: any) {
    return this.dashboardService.commanderVouchers(organisation_id, data);
  }

  getSuiviInscriptions(organisation_id: string, filters: any) {
    return this.dashboardService.getSuiviInscriptions(organisation_id, filters);
  }

  getMesPaiements(organisation_id: string, filters: any) {
    return this.dashboardService.getMesPaiements(organisation_id, filters);
  }

  getMonProfil(organisation_id: string) {
    return this.dashboardService.getMonProfil(organisation_id);
  }

  inscrireBeneficiaire(organisation_id: string, data: {
    beneficiaire_id: string;
    session_id: string;
    source_financement: 'B2B' | 'VOUCHER';
    voucher_organisation_id?: string;
  }) {
    return this.beneficiaireService.inscrireBeneficiaire(organisation_id, data);
  }

  updateMonProfil(organisation_id: string, data: any) {
    return this.dashboardService.updateMonProfil(organisation_id, data);
  }
}
