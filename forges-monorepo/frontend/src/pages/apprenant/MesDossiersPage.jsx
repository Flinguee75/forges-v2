import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apprenantApi from '../../api/espace-apprenant.api';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';
import Modal from '../../components/ui/Modal';
import { getDossierStatutMeta } from '../../utils/dossierStatus';

const STATUT_LABELS = {
  EN_ATTENTE: 'En attente',
  EN_ATTENTE_VERIFICATION: 'En vérification',
  RETENU: 'Retenu',
  PAYE: 'Payé',
  PAYE_DIRECTEMENT: 'Paiement requis',
  CONFIRME: 'Confirmé',
  REFUSE: 'Refusé',
  REJETE: 'Rejeté',
  ANNULE: 'Annulé',
  GRIS: 'En gris',
  EXCEPTION: 'Exception',
  ARCHIVE: 'Archivé',
};

const STATUS_FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'EN_ATTENTE_VERIFICATION', label: 'En vérification' },
  { value: 'RETENU', label: 'Retenu' },
  { value: 'PAYE_DIRECTEMENT', label: 'Paiement requis' },
  { value: 'PAYE', label: 'Payé' },
  { value: 'REFUSE', label: 'Refusé' },
  { value: 'ANNULE', label: 'Annulé' },
];

export default function MesDossiersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dossiers, setDossiers] = useState([]);
  const [activeFilter, setActiveFilter] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newDossierInfo, setNewDossierInfo] = useState(null);
  const { execute, isLoading } = useApi();

  useEffect(() => {
    loadDossiers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Détecter arrivée depuis inscription et afficher modale de confirmation
  useEffect(() => {
    if (location.state?.dossierCree) {
      setNewDossierInfo(location.state.dossierCree);
      setShowSuccessModal(true);
      // Nettoyer le state pour éviter réaffichage au refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const loadDossiers = async () => {
    await execute(() => apprenantApi.getMesDossiers(), {
      onSuccess: (data) => {
        setDossiers(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
      },
    });
  };

  const getFormationTitre = (dossier) =>
    dossier?.formation?.titre
    || dossier?.formation?.intitule
    || dossier?.session?.formation?.titre
    || dossier?.session?.formation?.intitule
    || 'Formation';

  const filtered = activeFilter
    ? dossiers.filter((d) => d.statut === activeFilter)
    : dossiers;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text mb-2">Mes dossiers d'inscription</h1>
        <p className="text-subtext">
          {dossiers.length > 0 ? `${dossiers.length} dossier${dossiers.length > 1 ? 's' : ''}` : 'Consultez l\'état de vos inscriptions aux formations'}
        </p>
      </div>

      {dossiers.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveFilter(value)}
              className={`rounded-full border px-4 py-1 text-sm font-medium transition-colors ${
                activeFilter === value
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-white text-subtext hover:border-primary hover:text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {location.state?.message && (
        <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg text-success" data-testid="inscription-success-message">
          {location.state.message}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="large" />
        </div>
      ) : dossiers.length === 0 ? (
        <EmptyState
          type="empty"
          title="Aucun dossier d'inscription"
          message="Vous n'avez pas encore d'inscription à une formation."
          action={
            <Button onClick={() => navigate('/apprenant/catalogue')}>
              Parcourir le catalogue
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.length === 0 && activeFilter && (
            <EmptyState
              title="Aucun dossier dans ce statut"
              message="Modifiez le filtre pour voir vos autres dossiers."
            />
          )}
          {filtered.map((dossier) => (
            <Card key={dossier.id} data-testid={`dossier-card-${dossier.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-text" data-testid={`dossier-title-${dossier.id}`}>
                      {getFormationTitre(dossier)}
                    </h3>
                    <Badge variant={getDossierStatutMeta(dossier.statut).variant} data-testid={`dossier-status-${dossier.id}`}>
                      {STATUT_LABELS[dossier.statut] || getDossierStatutMeta(dossier.statut).label}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm text-subtext">
                    {dossier.session && (
                      <>
                        <div>
                          Session: {formatDate(dossier.session.date_debut)} - {formatDate(dossier.session.date_fin)}
                        </div>
                        {dossier.session.lieu && (
                          <div>Lieu: {dossier.session.lieu}</div>
                        )}
                      </>
                    )}
                    <div>
                      Source de financement: {formatSourceFinancement(dossier.source_financement)}
                    </div>
                    {dossier.voucher_code && (
                      <div className="text-success">
                        Inscription avec voucher
                      </div>
                    )}
                    <div>
                      Inscrit le {formatDate(dossier.created_at)}
                    </div>
                  </div>

                  {dossier.motif_refus && (
                    <div className="mt-3 p-3 bg-danger/10 border border-danger/20 rounded text-sm text-danger">
                      <strong>Motif de refus:</strong> {dossier.motif_refus}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 items-end">
                  {/* Bandeau warning paiement requis pour PAYE_DIRECTEMENT */}
                  {dossier.statut === 'PAYE_DIRECTEMENT' && (
                    <div className="rounded-lg border-2 border-warning bg-warning/10 p-3 max-w-xs">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm">
                          <p className="font-semibold text-warning">Paiement requis</p>
                          <p className="text-gray-700 mt-1">
                            Votre dossier est accepté, mais l'inscription ne sera confirmée qu'après validation du paiement.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {(dossier.statut === 'RETENU' || dossier.statut === 'PAYE_DIRECTEMENT') && dossier.source_financement !== 'VOUCHER' && (
                    <Button
                      variant="primary"
                      size="medium"
                      className="w-full min-w-[200px] font-semibold shadow-lg"
                      onClick={() => navigate(`/apprenant/paiements/initier/${dossier.id}`)}
                      data-testid={`btn-payer-${dossier.id}`}
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Payer maintenant
                      </span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => navigate(`/apprenant/dossiers/${dossier.id}`)}
                  >
                    Voir détails
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modale de confirmation post-inscription */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Inscription enregistrée !"
        size="medium"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg border border-success">
            <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-success">Votre dossier a été créé avec succès</p>
              <p className="text-sm text-gray-700">Formation : {newDossierInfo?.formationTitre}</p>
            </div>
          </div>

          <div className="rounded-lg border-2 border-warning bg-warning/5 p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-warning flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
              <p className="font-semibold text-warning text-lg">Paiement requis</p>
                <p className="mt-2 text-gray-700">
                  Votre dossier est créé, mais l'inscription ne sera confirmée qu'après <strong>paiement validé</strong>.
                </p>
                <div className="mt-3 p-3 bg-white rounded border border-warning">
                  <p className="font-semibold text-warning">Prochaine étape</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Lancez le paiement sécurisé. Le dossier passera en payé uniquement après confirmation du paiement.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant="primary"
              size="large"
              className="w-full"
              onClick={() => {
                setShowSuccessModal(false);
                navigate(`/apprenant/paiements/initier/${newDossierInfo?.dossierId}`);
              }}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Payer maintenant
              </span>
            </Button>
            <Button
              variant="outline"
              size="medium"
              className="w-full"
              onClick={() => setShowSuccessModal(false)}
            >
              Payer plus tard (je comprends le risque)
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatSourceFinancement(source) {
  const labels = {
    RETAIL: 'Paiement apprenant',
    VOUCHER: 'Code Voucher',
    ABONNEMENT: 'Abonnement',
    B2B: 'Entreprise (B2B)',
    INSTITUTIONNEL: 'Institutionnel',
  };
  return labels[source] || source;
}
