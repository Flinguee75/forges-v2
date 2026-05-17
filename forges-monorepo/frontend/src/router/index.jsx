import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import RoleGuard from './RoleGuard';
import { useAuth } from '../hooks/useAuth';
import RouteErrorFallback from '../components/common/RouteErrorFallback';

const PublicLayout = lazy(() => import('../components/layout/PublicLayout'));
const EtudiantLayout = lazy(() => import('../components/layout/EtudiantLayout'));
const OrgLayout = lazy(() => import('../components/layout/OrgLayout'));
const PartenaireLayout = lazy(() => import('../components/layout/PartenaireLayout'));
const ApporteurLayout = lazy(() => import('../components/layout/ApporteurLayout'));
const BackofficeLayout = lazy(() => import('../components/layout/BackofficeLayout'));

const LandingPage = lazy(() => import('../pages/public/LandingPage'));
const UnauthorizedPage = lazy(() => import('../pages/public/UnauthorizedPage'));
const CataloguePage = lazy(() => import('../pages/public/CataloguePage'));
const FormationDetailPage = lazy(() => import('../pages/public/FormationDetailPage'));
const RegisterPartenairePage = lazy(() => import('../pages/public/RegisterPartenaire'));
const RegisterApporteurPage = lazy(() => import('../pages/public/RegisterApporteur'));

const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterChoicePage = lazy(() => import('../pages/auth/RegisterChoicePage'));
const RegisterEtudiantPage = lazy(() => import('../pages/auth/RegisterEtudiantPage'));
const RegisterOrganisationPage = lazy(() => import('../pages/auth/RegisterOrganisationPage'));
const ConfirmEmailPage = lazy(() => import('../pages/auth/ConfirmEmailPage'));
const ResetPasswordRequestPage = lazy(() => import('../pages/auth/ResetPasswordRequestPage'));
const ResetPasswordConfirmPage = lazy(() => import('../pages/auth/ResetPasswordConfirmPage'));

const ApprenantDashboard = lazy(() => import('../pages/apprenant/ApprenantDashboard'));
const MonAbonnement = lazy(() => import('../pages/apprenant/MonAbonnement'));
const SouscrireAbonnement = lazy(() => import('../pages/apprenant/SouscrireAbonnement'));
const FormationsALaDemande = lazy(() => import('../pages/apprenant/FormationsALaDemande'));
const AccesFormation = lazy(() => import('../pages/apprenant/AccesFormation'));
const MesDossiersApprenantPage = lazy(() => import('../pages/apprenant/MesDossiersPage'));
const InscriptionSessionPage = lazy(() => import('../pages/apprenant/InscriptionSessionPage'));
const FormationDetailApprenantPage = lazy(() => import('../pages/apprenant/FormationDetailApprenantPage'));
const MesDossiersPage = lazy(() => import('../pages/etudiant/MesDossiersPage'));
const DossierDetail = lazy(() => import('../pages/etudiant/DossierDetail'));
const CatalogueApprenantPage = lazy(() => import('../pages/apprenant/CatalogueApprenantPage'));
const MesPaiementsPage = lazy(() => import('../pages/etudiant/MesPaiementsPage'));
const PaiementDetailEtudiant = lazy(() => import('../pages/etudiant/PaiementDetail'));
const PaiementInitiation = lazy(() => import('../pages/apprenant/PaiementInitiation'));
const PaiementCallback = lazy(() => import('../pages/apprenant/PaiementCallback'));
const AbonnementCallback = lazy(() => import('../pages/apprenant/AbonnementCallback'));
const MesAttestationsPage = lazy(() => import('../pages/etudiant/MesAttestationsPage'));
const MonProfilPage = lazy(() => import('../pages/etudiant/MonProfilPage'));

const OrgDashboard = lazy(() => import('../pages/organisation/OrgDashboard'));
const MonAbonnementOrg = lazy(() => import('../pages/organisation/MonAbonnementOrg'));
const AbonnementB2B = lazy(() => import('../pages/organisation/AbonnementB2B'));
const VouchersPage = lazy(() => import('../pages/organisation/VouchersPage'));
const InscriptionsPage = lazy(() => import('../pages/organisation/InscriptionsPage'));
const PaiementsOrganisationPage = lazy(() => import('../pages/organisation/PaiementsOrganisationPage'));
const ProfilOrganisationPage = lazy(() => import('../pages/organisation/ProfilOrganisationPage'));
const GestionEmployesPage = lazy(() => import('../pages/organisation/GestionEmployesPage'));
const GestionApprenantsB2B = lazy(() => import('../pages/organisation/GestionApprenantsB2B'));
const AbonnementOrgCallback = lazy(() => import('../pages/organisation/AbonnementOrgCallback'));
const AbonnementB2BCallback = lazy(() => import('../pages/organisation/AbonnementB2BCallback'));

const PartenaireDashboard = lazy(() => import('../pages/partenaire/PartenaireDashboard'));
const MesFormations = lazy(() => import('../pages/partenaire/MesFormations'));
const SoumettreFormation = lazy(() => import('../pages/partenaire/SoumettreFormation'));
const PartenaireFormationDetail = lazy(() => import('../pages/partenaire/FormationDetail'));
const MesReversements = lazy(() => import('../pages/partenaire/MesReversements'));
const ExportCSVPartenaire = lazy(() => import('../pages/partenaire/ExportCSV'));
const ProfilPartenairePage = lazy(() => import('../pages/partenaire/ProfilPartenaire'));

const ApporteurDashboard = lazy(() => import('../pages/apporteur/ApporteurDashboard'));
const MesCommissions = lazy(() => import('../pages/apporteur/MesCommissions'));
const MesReversementsApporteur = lazy(() => import('../pages/apporteur/MesReversements'));
const ProfilApporteurPage = lazy(() => import('../pages/apporteur/ProfilApporteur'));

const BackofficeDashboard = lazy(() => import('../pages/backoffice/BackofficeDashboard'));
const RapportsDashboard = lazy(() => import('../pages/backoffice/rapports/RapportsDashboard'));
const ExportPage = lazy(() => import('../pages/backoffice/rapports/ExportPage'));
const FormationsList = lazy(() => import('../pages/backoffice/formations/FormationsList'));
const FormationForm = lazy(() => import('../pages/backoffice/formations/FormationForm'));
const FormationDetail = lazy(() => import('../pages/backoffice/formations/FormationDetail'));
const SessionsList = lazy(() => import('../pages/backoffice/sessions/SessionsList'));
const SessionForm = lazy(() => import('../pages/backoffice/sessions/SessionForm'));
const SessionDetail = lazy(() => import('../pages/backoffice/sessions/SessionDetail'));
const DossiersList = lazy(() => import('../pages/backoffice/dossiers/DossiersList'));
const DossierDecision = lazy(() => import('../pages/backoffice/dossiers/DossierDecision'));
const PaiementsList = lazy(() => import('../pages/backoffice/paiements/PaiementsList'));
const PaiementDetail = lazy(() => import('../pages/backoffice/paiements/PaiementDetail'));
const VouchersList = lazy(() => import('../pages/backoffice/vouchers/VouchersList'));
const VoucherForm = lazy(() => import('../pages/backoffice/vouchers/VoucherForm'));
const VoucherDetail = lazy(() => import('../pages/backoffice/vouchers/VoucherDetail'));
const AbonnementsAdmin = lazy(() => import('../pages/backoffice/abonnements/AbonnementsAdmin'));
const ContratInstitutionnel = lazy(() => import('../pages/backoffice/abonnements/ContratInstitutionnel'));
const ConfigAdmin = lazy(() => import('../pages/backoffice/config/ConfigAdmin'));
const EnquetesCatalogue = lazy(() => import('../pages/backoffice/bot/EnquetesCatalogue'));
const FeedbacksAdmin = lazy(() => import('../pages/backoffice/bot/FeedbacksAdmin'));
const PartenairesList = lazy(() => import('../pages/backoffice/partenaires/PartenairesList'));
const PartenaireDetail = lazy(() => import('../pages/backoffice/partenaires/PartenaireDetail'));
const InvitationPartenaire = lazy(() => import('../pages/backoffice/partenaires/InvitationPartenaire'));
const ApprobationPartenaire = lazy(() => import('../pages/backoffice/partenaires/ApprobationPartenaire'));
const ValidationFormation = lazy(() => import('../pages/backoffice/partenaires/ValidationFormation'));
const FormationsPartenaire = lazy(() => import('../pages/backoffice/partenaires/FormationsPartenaire'));
const ReversementsPartenaires = lazy(() => import('../pages/backoffice/partenaires/ReversementsPartenaires'));
const UtilisateursList = lazy(() => import('../pages/backoffice/utilisateurs/UtilisateursList'));
const CreateUtilisateur = lazy(() => import('../pages/backoffice/utilisateurs/CreateUtilisateur'));
const EquipeBackofficePage = lazy(() => import('../pages/backoffice/utilisateurs/EquipeBackofficePage'));
const ApporteursList = lazy(() => import('../pages/backoffice/apporteurs/ApporteursList'));
const CreateApporteur = lazy(() => import('../pages/backoffice/apporteurs/CreateApporteur'));
const ApporteurDetail = lazy(() => import('../pages/backoffice/apporteurs/ApporteurDetail'));
const ReversementsApporteurs = lazy(() => import('../pages/backoffice/apporteurs/ReversementsApporteurs'));
const ApprenantsList = lazy(() => import('../pages/backoffice/apprenants/ApprenantsList'));
const ApprenantDetail = lazy(() => import('../pages/backoffice/apprenants/ApprenantDetail'));
const ApprenantCreate = lazy(() => import('../pages/backoffice/apprenants/ApprenantCreate'));
const OrganisationsList = lazy(() => import('../pages/backoffice/organisations/OrganisationsList'));
const OrganisationDetail = lazy(() => import('../pages/backoffice/organisations/OrganisationDetail'));
const OrganisationCreate = lazy(() => import('../pages/backoffice/organisations/OrganisationCreate'));

const DevisList = lazy(() => import('../pages/backoffice/devis/DevisList'));
const DevisForm = lazy(() => import('../pages/backoffice/devis/DevisForm'));
const DevisDetail = lazy(() => import('../pages/backoffice/devis/DevisDetail'));
const DevisPage = lazy(() => import('../pages/organisation/DevisPage'));

const PlaceholderPage = lazy(() => import('../pages/PlaceholderPage'));
const ComponentsDemo = lazy(() => import('../pages/ComponentsDemo'));
const MockCheckoutPage = lazy(() => import('../pages/MockCheckoutPage'));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
        <p className="text-sm text-[var(--color-subtext)]">Chargement...</p>
      </div>
    </div>
  );
}

function withSuspense(element) {
  return (
    <Suspense fallback={<RouteFallback />}>
      {element}
    </Suspense>
  );
}

function BackofficeIndexRedirect() {
  const { user } = useAuth();

  if (user?.role === 'AGENT') {
    return <Navigate to="/backoffice/paiements" replace />;
  }

  if (user?.role === 'RESPONSABLE') {
    return <Navigate to="/backoffice/formations" replace />;
  }

  return <Navigate to="/backoffice/dashboard" replace />;
}

function LegacyApprenantRedirect() {
  const location = useLocation();
  const nextPath = `${location.pathname}${location.search}${location.hash}`.replace(/^\/etudiant\b/, '/apprenant');
  return <Navigate to={nextPath} replace />;
}

/**
 * Router principal de l'application FORGES
 * Implémente la protection des routes par authentification et rôle
 * Référence: CLAUDE.md section 17.3 et 17.7
 */
const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteErrorFallback />,
    children: [
  // ============================================
  // ROUTES PUBLIQUES (sans authentification)
  // ============================================
  {
    element: withSuspense(<PublicLayout />),
    children: [
      {
        path: '/',
        element: withSuspense(<LandingPage />),
      },
      {
        path: '/login',
        element: withSuspense(<LoginPage />),
      },
      {
        path: '/unauthorized',
        element: withSuspense(<UnauthorizedPage />),
      },
      {
        path: '/components-demo',
        element: withSuspense(<ComponentsDemo />),
      },
      {
        path: '/mock-checkout/:transactionId',
        element: withSuspense(<MockCheckoutPage />),
      },
      {
        path: '/catalogue',
        element: withSuspense(<CataloguePage />),
      },
      {
        path: '/catalogue/:id',
        element: withSuspense(<FormationDetailPage />),
      },
      {
        path: '/formations/:id',
        element: withSuspense(<FormationDetailPage />),
      },
      {
        path: '/register',
        element: withSuspense(<RegisterChoicePage />),
      },
      {
        path: '/register/etudiant',
        element: withSuspense(<RegisterEtudiantPage />),
      },
      {
        path: '/register/organisation',
        element: withSuspense(<RegisterOrganisationPage />),
      },
      {
        path: '/register-partenaire',
        element: withSuspense(<RegisterPartenairePage />),
      },
      {
        path: '/confirm-email-partenaire',
        element: withSuspense(<RegisterPartenairePage />),
      },
      {
        path: '/register-apporteur',
        element: withSuspense(<RegisterApporteurPage />),
      },
      {
        path: '/confirm-email/:token',
        element: withSuspense(<ConfirmEmailPage />),
      },
      {
        path: '/reset-password',
        element: withSuspense(<ResetPasswordRequestPage />),
      },
      {
        path: '/reset-password/:token',
        element: withSuspense(<ResetPasswordConfirmPage />),
      },
    ],
  },

  // ============================================
  // ESPACE APPRENANT (rôle: APPRENANT)
  // ============================================
  {
    path: '/apprenant',
    element: (
      <PrivateRoute>
        <RoleGuard allowedRoles={['APPRENANT', 'ETUDIANT']}>
          {withSuspense(<EtudiantLayout />)}
        </RoleGuard>
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/apprenant/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: withSuspense(<ApprenantDashboard />),
      },
      {
        path: 'catalogue',
        element: withSuspense(<CatalogueApprenantPage />),
      },
      {
        path: 'abonnement',
        element: withSuspense(<MonAbonnement />),
      },
      {
        path: 'abonnement/souscrire',
        element: withSuspense(<SouscrireAbonnement />),
      },
      {
        path: 'abonnement/callback',
        element: withSuspense(<AbonnementCallback />),
      },
      {
        path: 'formations-a-la-demande',
        element: withSuspense(<FormationsALaDemande />),
      },
      {
        path: 'formations-a-la-demande/:accesId',
        element: withSuspense(<AccesFormation />),
      },
      {
        path: 'formations/:id',
        element: withSuspense(<FormationDetailApprenantPage />),
      },
      {
        path: 'inscrire/:formationId',
        element: withSuspense(<InscriptionSessionPage />),
      },
      {
        path: 'mes-dossiers',
        element: withSuspense(<MesDossiersApprenantPage />),
      },
      {
        path: 'dossiers',
        element: withSuspense(<MesDossiersPage />),
      },
      {
        path: 'dossiers/:id',
        element: withSuspense(<DossierDetail />),
      },
      {
        path: 'paiements',
        element: withSuspense(<MesPaiementsPage />),
      },
      {
        path: 'paiements/initier/:dossierId',
        element: withSuspense(<PaiementInitiation />),
      },
      {
        path: 'paiements/callback',
        element: withSuspense(<PaiementCallback />),
      },
      {
        path: 'paiements/:id',
        element: withSuspense(<PaiementDetailEtudiant />),
      },
      {
        path: 'attestations',
        element: withSuspense(<MesAttestationsPage />),
      },
      {
        path: 'profil',
        element: withSuspense(<MonProfilPage />),
      },
    ],
  },
  {
    path: '/etudiant/*',
    element: <LegacyApprenantRedirect />,
  },

  // ============================================
  // ESPACE ORGANISATION (rôle: ORGANISATION)
  // ============================================
  {
    path: '/organisation',
    element: (
      <PrivateRoute>
        <RoleGuard allowedRoles={['ORGANISATION']}>
          {withSuspense(<OrgLayout />)}
        </RoleGuard>
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/organisation/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: withSuspense(<OrgDashboard />),
      },
      {
        path: 'abonnement',
        element: withSuspense(<MonAbonnementOrg />),
      },
      {
        path: 'abonnement/souscrire',
        element: withSuspense(<MonAbonnementOrg />),
      },
      {
        path: 'abonnement/callback',
        element: withSuspense(<AbonnementOrgCallback />),
      },
      {
        path: 'b2b',
        element: withSuspense(<AbonnementB2B />),
      },
      {
        path: 'b2b/callback',
        element: withSuspense(<AbonnementB2BCallback />),
      },
      {
        path: 'vouchers',
        element: withSuspense(<VouchersPage />),
      },
      {
        path: 'inscriptions',
        element: withSuspense(<InscriptionsPage />),
      },
      {
        path: 'paiements',
        element: withSuspense(<PaiementsOrganisationPage />),
      },
      {
        path: 'devis',
        element: withSuspense(<DevisPage />),
      },
      {
        path: 'profil',
        element: withSuspense(<ProfilOrganisationPage />),
      },
      {
        path: 'employes',
        element: withSuspense(<GestionEmployesPage />),
      },
      {
        path: 'b2b-apprenants',
        element: withSuspense(<GestionApprenantsB2B />),
      },
      {
        path: 'catalogue',
        element: withSuspense(<CatalogueApprenantPage />),
      },
      {
        path: 'formations/:id',
        element: withSuspense(<FormationDetailApprenantPage />),
      },
    ],
  },

  // ============================================
  // ESPACE PARTENAIRE (rôle: PARTENAIRE)
  // ============================================
  {
    path: '/partenaire',
    element: (
      <PrivateRoute>
        <RoleGuard allowedRoles={['PARTENAIRE']}>
          {withSuspense(<PartenaireLayout />)}
        </RoleGuard>
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/partenaire/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: withSuspense(<PartenaireDashboard />),
      },
      {
        path: 'formations',
        element: withSuspense(<MesFormations />),
      },
      {
        path: 'formations/:id',
        element: withSuspense(<PartenaireFormationDetail />),
      },
      {
        path: 'soumettre-formation',
        element: withSuspense(<SoumettreFormation />),
      },
      {
        path: 'reversements',
        element: withSuspense(<MesReversements />),
      },
      {
        path: 'export-csv',
        element: withSuspense(<ExportCSVPartenaire />),
      },
      {
        path: 'profil',
        element: withSuspense(<ProfilPartenairePage />),
      },
    ],
  },

  // ============================================
  // ESPACE APPORTEUR (rôle: APPORTEUR)
  // ============================================
  {
    path: '/apporteur',
    element: (
      <PrivateRoute>
        <RoleGuard allowedRoles={['APPORTEUR']}>
          {withSuspense(<ApporteurLayout />)}
        </RoleGuard>
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/apporteur/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: withSuspense(<ApporteurDashboard />),
      },
      {
        path: 'commissions',
        element: withSuspense(<MesCommissions />),
      },
      {
        path: 'reversements',
        element: withSuspense(<MesReversementsApporteur />),
      },
      {
        path: 'profil',
        element: withSuspense(<ProfilApporteurPage />),
      },
    ],
  },

  // ============================================
  // BACKOFFICE (rôles: ADMIN, SUPERVISEUR, RESPONSABLE, AGENT)
  // ============================================
  {
    path: '/backoffice',
    element: (
      <PrivateRoute>
        <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR', 'RESPONSABLE', 'AGENT']}>
          {withSuspense(<BackofficeLayout />)}
        </RoleGuard>
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <BackofficeIndexRedirect />,
      },
      {
        path: 'dashboard',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR', 'RESPONSABLE']}>
            {withSuspense(<BackofficeDashboard />)}
          </RoleGuard>
        ),
      },
      {
        path: 'rapports',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR']}>
            {withSuspense(<RapportsDashboard />)}
          </RoleGuard>
        ),
      },
      {
        path: 'rapports/export',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR']}>
            {withSuspense(<ExportPage />)}
          </RoleGuard>
        ),
      },
      {
        path: 'formations',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR', 'RESPONSABLE']}>
            {withSuspense(<FormationsList />)}
          </RoleGuard>
        ),
      },
      {
        path: 'formations/new',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR', 'RESPONSABLE']}>
            {withSuspense(<FormationForm />)}
          </RoleGuard>
        ),
      },
      {
        path: 'formations/:id',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR', 'RESPONSABLE']}>
            {withSuspense(<FormationDetail />)}
          </RoleGuard>
        ),
      },
      {
        path: 'formations/:id/edit',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR', 'RESPONSABLE']}>
            {withSuspense(<FormationForm />)}
          </RoleGuard>
        ),
      },
      {
        path: 'sessions',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR']}>
            {withSuspense(<SessionsList />)}
          </RoleGuard>
        ),
      },
      {
        path: 'sessions/new',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR']}>
            {withSuspense(<SessionForm />)}
          </RoleGuard>
        ),
      },
      {
        path: 'sessions/:id',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR']}>
            {withSuspense(<SessionDetail />)}
          </RoleGuard>
        ),
      },
      {
        path: 'sessions/:id/edit',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR']}>
            {withSuspense(<SessionForm />)}
          </RoleGuard>
        ),
      },
      {
        path: 'dossiers',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR']}>
            {withSuspense(<DossiersList />)}
          </RoleGuard>
        ),
      },
      {
        path: 'dossiers/:id',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR']}>
            {withSuspense(<DossierDecision />)}
          </RoleGuard>
        ),
      },
      {
        path: 'dossiers/:id/decision',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR']}>
            {withSuspense(<DossierDecision />)}
          </RoleGuard>
        ),
      },
      {
        path: 'paiements',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'AGENT']}>
            {withSuspense(<PaiementsList />)}
          </RoleGuard>
        ),
      },
      {
        path: 'paiements/:id',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'AGENT']}>
            {withSuspense(<PaiementDetail />)}
          </RoleGuard>
        ),
      },
      {
        path: 'vouchers',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'AGENT', 'SUPERVISEUR']}>
            {withSuspense(<VouchersList />)}
          </RoleGuard>
        ),
      },
      {
        path: 'vouchers/new',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'AGENT']}>
            {withSuspense(<VoucherForm />)}
          </RoleGuard>
        ),
      },
      {
        path: 'vouchers/:id',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'AGENT', 'SUPERVISEUR']}>
            {withSuspense(<VoucherDetail />)}
          </RoleGuard>
        ),
      },
      {
        path: 'devis',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'AGENT']}>
            {withSuspense(<DevisList />)}
          </RoleGuard>
        ),
      },
      {
        path: 'devis/new',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'AGENT']}>
            {withSuspense(<DevisForm />)}
          </RoleGuard>
        ),
      },
      {
        path: 'devis/:id',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'AGENT']}>
            {withSuspense(<DevisDetail />)}
          </RoleGuard>
        ),
      },
      {
        path: 'abonnements',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR', 'AGENT']}>
            {withSuspense(<AbonnementsAdmin />)}
          </RoleGuard>
        ),
      },
      {
        path: 'abonnements/contrat-institutionnel',
        element: (
          <RoleGuard allowedRoles={['ADMIN']}>
            {withSuspense(<ContratInstitutionnel />)}
          </RoleGuard>
        ),
      },
      {
        path: 'bot/enquetes-catalogue',
        element: (
          <RoleGuard allowedRoles={['ADMIN']}>
            {withSuspense(<EnquetesCatalogue />)}
          </RoleGuard>
        ),
      },
      {
        path: 'bot/feedbacks',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'RESPONSABLE']}>
            {withSuspense(<FeedbacksAdmin />)}
          </RoleGuard>
        ),
      },
      // ============================================
      // ROUTES PARTENAIRES (F-14)
      // ============================================
      {
        path: 'partenaires',
        element: (
          <RoleGuard allowedRoles={['ADMIN']}>
            {withSuspense(<PartenairesList />)}
          </RoleGuard>
        ),
      },
      {
        path: 'partenaires/invitation',
        element: (
          <RoleGuard allowedRoles={['ADMIN']}>
            {withSuspense(<InvitationPartenaire />)}
          </RoleGuard>
        ),
      },
      {
        path: 'partenaires/:id',
        element: (
          <RoleGuard allowedRoles={['ADMIN']}>
            {withSuspense(<PartenaireDetail />)}
          </RoleGuard>
        ),
      },
      {
        path: 'partenaires/:id/approuver',
        element: (
          <RoleGuard allowedRoles={['ADMIN']}>
            {withSuspense(<ApprobationPartenaire />)}
          </RoleGuard>
        ),
      },
      {
        path: 'formations-partenaires',
        element: (
          <RoleGuard allowedRoles={['RESPONSABLE', 'ADMIN']}>
            {withSuspense(<FormationsPartenaire />)}
          </RoleGuard>
        ),
      },
      {
        path: 'formations-partenaires/:id/valider',
        element: (
          <RoleGuard allowedRoles={['RESPONSABLE', 'ADMIN']}>
            {withSuspense(<ValidationFormation />)}
          </RoleGuard>
        ),
      },
      {
        path: 'reversements-partenaires',
        element: (
          <RoleGuard allowedRoles={['AGENT', 'SUPERVISEUR', 'ADMIN']}>
            {withSuspense(<ReversementsPartenaires />)}
          </RoleGuard>
        ),
      },
      // ============================================
      // ROUTES APPRENANTS
      // ============================================
      {
        path: 'apprenants',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR']}>
            {withSuspense(<ApprenantsList />)}
          </RoleGuard>
        ),
      },
      {
        path: 'apprenants/new',
        element: (
          <RoleGuard allowedRoles={['ADMIN']}>
            {withSuspense(<ApprenantCreate />)}
          </RoleGuard>
        ),
      },
      {
        path: 'apprenants/:id',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR']}>
            {withSuspense(<ApprenantDetail />)}
          </RoleGuard>
        ),
      },
      // ============================================
      // ROUTES ORGANISATIONS
      // ============================================
      {
        path: 'organisations',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR']}>
            {withSuspense(<OrganisationsList />)}
          </RoleGuard>
        ),
      },
      {
        path: 'organisations/new',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR']}>
            {withSuspense(<OrganisationCreate />)}
          </RoleGuard>
        ),
      },
      {
        path: 'organisations/:id',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR']}>
            {withSuspense(<OrganisationDetail />)}
          </RoleGuard>
        ),
      },
      // ============================================
      // ROUTES APPORTEURS (F-15)
      // ============================================
      {
        path: 'apporteurs',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR', 'AGENT']}>
            {withSuspense(<ApporteursList />)}
          </RoleGuard>
        ),
      },
      {
        path: 'apporteurs/new',
        element: (
          <RoleGuard allowedRoles={['ADMIN']}>
            {withSuspense(<CreateApporteur />)}
          </RoleGuard>
        ),
      },
      {
        path: 'apporteurs/:id',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR', 'AGENT']}>
            {withSuspense(<ApporteurDetail />)}
          </RoleGuard>
        ),
      },
      {
        path: 'reversements-apporteurs',
        element: (
          <RoleGuard allowedRoles={['ADMIN', 'SUPERVISEUR', 'AGENT']}>
            {withSuspense(<ReversementsApporteurs />)}
          </RoleGuard>
        ),
      },
      // ============================================
      // ROUTES UTILISATEURS BACKOFFICE
      // ============================================
      {
        path: 'utilisateurs',
        element: (
          <RoleGuard allowedRoles={['ADMIN']}>
            {withSuspense(<UtilisateursList />)}
          </RoleGuard>
        ),
      },
      {
        path: 'equipe',
        element: (
          <RoleGuard allowedRoles={['ADMIN']}>
            {withSuspense(<EquipeBackofficePage />)}
          </RoleGuard>
        ),
      },
      {
        path: 'utilisateurs/new',
        element: (
          <RoleGuard allowedRoles={['ADMIN']}>
            {withSuspense(<CreateUtilisateur />)}
          </RoleGuard>
        ),
      },
      {
        path: 'config',
        element: (
          <RoleGuard allowedRoles={['ADMIN']}>
            {withSuspense(<ConfigAdmin />)}
          </RoleGuard>
        ),
      },
    ],
  },

  // TODO F-10: Ajouter les routes backoffice comptes + rapports
  // /backoffice/comptes, /backoffice/comptes/:id
  // /backoffice/rapports, /backoffice/rapports/export

  // ============================================
  // 404 - Route catch-all
  // ============================================
  {
    path: '*',
    element: (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <div className="text-6xl font-bold text-primary mb-4">404</div>
          <h1 className="text-2xl font-semibold text-text mb-2">Page non trouvée</h1>
          <p className="text-subtext mb-6">
            La page que vous recherchez n&apos;existe pas.
          </p>
          <a href="/" className="text-primary hover:text-secondary">
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    ),
  },
    ],
  },
]);

export default router;
