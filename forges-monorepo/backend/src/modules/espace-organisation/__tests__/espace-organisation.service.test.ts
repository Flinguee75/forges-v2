import { EspaceOrganisationService } from '../espace-organisation.service';
import { BeneficiaireService } from '../beneficiaire.service';
import { OrganisationDashboardService } from '../organisation-dashboard.service';

describe('EspaceOrganisationService (facade)', () => {
  let service: EspaceOrganisationService;
  let mockBeneficiaireService: jest.Mocked<BeneficiaireService>;
  let mockDashboardService: jest.Mocked<OrganisationDashboardService>;

  beforeEach(() => {
    mockBeneficiaireService = {
      getBeneficiaires: jest.fn(),
      importerBeneficiairesCSV: jest.fn(),
      getDashboardB2B: jest.fn(),
      desactiverBeneficiaire: jest.fn(),
      createMembre: jest.fn(),
      inscrireBeneficiaire: jest.fn(),
    } as any;

    mockDashboardService = {
      getDashboard: jest.fn(),
      getSuiviInscriptions: jest.fn(),
      getMesPaiements: jest.fn(),
      getMonProfil: jest.fn(),
      updateMonProfil: jest.fn(),
      getRapportBailleur: jest.fn(),
      getMesVouchers: jest.fn(),
      commanderVouchers: jest.fn(),
    } as any;

    service = new EspaceOrganisationService(mockBeneficiaireService, mockDashboardService);
  });

  it('getDashboard delègue au dashboardService', async () => {
    mockDashboardService.getDashboard.mockResolvedValue({ organisation: {}, stats: {} } as any);
    await service.getDashboard('org-01');
    expect(mockDashboardService.getDashboard).toHaveBeenCalledWith('org-01');
  });

  it('getBeneficiaires delègue au beneficiaireService', async () => {
    mockBeneficiaireService.getBeneficiaires.mockResolvedValue({ dossiers: [], total: 0 } as any);
    await service.getBeneficiaires('org-01', { page: 1 });
    expect(mockBeneficiaireService.getBeneficiaires).toHaveBeenCalledWith('org-01', { page: 1 });
  });

  it('importerBeneficiairesCSV delègue au beneficiaireService', async () => {
    mockBeneficiaireService.importerBeneficiairesCSV.mockResolvedValue({
      succes: 1,
      erreurs: 0,
      doublons: 0,
      imported: 1,
      linked: 0,
      skipped: 0,
      rapport: [],
    });
    await service.importerBeneficiairesCSV('csv', 'org-01', 'user-01');
    expect(mockBeneficiaireService.importerBeneficiairesCSV).toHaveBeenCalledWith('csv', 'org-01', 'user-01');
  });

  it('getDashboardB2B delègue au beneficiaireService', async () => {
    mockBeneficiaireService.getDashboardB2B.mockResolvedValue({ palier: 'BUSINESS' } as any);
    await service.getDashboardB2B('org-01');
    expect(mockBeneficiaireService.getDashboardB2B).toHaveBeenCalledWith('org-01');
  });

  it('desactiverBeneficiaire delègue au beneficiaireService', async () => {
    mockBeneficiaireService.desactiverBeneficiaire.mockResolvedValue({ message: 'ok' });
    await service.desactiverBeneficiaire('a-01', 'org-01', 'user-01');
    expect(mockBeneficiaireService.desactiverBeneficiaire).toHaveBeenCalledWith('a-01', 'org-01', 'user-01');
  });

  it('createMembre delègue au beneficiaireService', async () => {
    mockBeneficiaireService.createMembre.mockResolvedValue({ message: 'ok', apprenant: {} } as any);
    await service.createMembre('org-01', { email: 'a@b.com' });
    expect(mockBeneficiaireService.createMembre).toHaveBeenCalledWith('org-01', { email: 'a@b.com' });
  });

  it('commanderVouchers delègue au dashboardService', async () => {
    mockDashboardService.commanderVouchers.mockResolvedValue({ message: 'ok', vouchers: [] });
    await service.commanderVouchers('org-01', { formation_id: 'f-01', quantite: 5 });
    expect(mockDashboardService.commanderVouchers).toHaveBeenCalledWith('org-01', { formation_id: 'f-01', quantite: 5 });
  });

  it('getSuiviInscriptions delègue au dashboardService', async () => {
    mockDashboardService.getSuiviInscriptions.mockResolvedValue({ dossiers: [], total: 0 } as any);
    await service.getSuiviInscriptions('org-01', {});
    expect(mockDashboardService.getSuiviInscriptions).toHaveBeenCalledWith('org-01', {});
  });

  it('getMesPaiements delègue au dashboardService', async () => {
    mockDashboardService.getMesPaiements.mockResolvedValue({ paiements: [], total: 0 } as any);
    await service.getMesPaiements('org-01', {});
    expect(mockDashboardService.getMesPaiements).toHaveBeenCalledWith('org-01', {});
  });

  it('getMonProfil delègue au dashboardService', async () => {
    mockDashboardService.getMonProfil.mockResolvedValue({ id: 'org-01' } as any);
    await service.getMonProfil('org-01');
    expect(mockDashboardService.getMonProfil).toHaveBeenCalledWith('org-01');
  });

  it('updateMonProfil delègue au dashboardService', async () => {
    mockDashboardService.updateMonProfil.mockResolvedValue({ message: 'ok', organisation: {} } as any);
    await service.updateMonProfil('org-01', { raison_sociale: 'X' });
    expect(mockDashboardService.updateMonProfil).toHaveBeenCalledWith('org-01', { raison_sociale: 'X' });
  });

  it('getMesVouchers delègue au dashboardService', async () => {
    mockDashboardService.getMesVouchers.mockResolvedValue({ vouchers: [], total: 0 } as any);
    await service.getMesVouchers('org-01', { statut: 'ACTIF' });
    expect(mockDashboardService.getMesVouchers).toHaveBeenCalledWith('org-01', { statut: 'ACTIF' });
  });

  it('getRapportBailleur delègue au dashboardService', async () => {
    mockDashboardService.getRapportBailleur.mockResolvedValue({ date_generation: '' } as any);
    await service.getRapportBailleur('org-01', { debut: new Date() });
    expect(mockDashboardService.getRapportBailleur).toHaveBeenCalledWith('org-01', expect.any(Object));
  });

  it('inscrireBeneficiaire delègue au beneficiaireService', async () => {
    mockBeneficiaireService.inscrireBeneficiaire = jest.fn().mockResolvedValue({ dossier_id: 'd-01', statut: 'PAYE' });
    const params = { beneficiaire_id: 'app-01', session_id: 'sess-01', source_financement: 'B2B' as const };
    await service.inscrireBeneficiaire('org-01', params);
    expect(mockBeneficiaireService.inscrireBeneficiaire).toHaveBeenCalledWith('org-01', params);
  });
});
