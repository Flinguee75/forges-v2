import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apprenantApi from '../../api/espace-apprenant.api';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';

const STATUT_COLORS = {
  EN_ATTENTE: 'warning',
  EN_ATTENTE_VERIFICATION: 'warning',
  RETENU: 'success',
  PAYE: 'success',
  PAYE_DIRECTEMENT: 'success',
  CONFIRME: 'success',
  REFUSE: 'danger',
  REJETE: 'danger',
  ANNULE: 'neutral',
  GRIS: 'neutral',
  EXCEPTION: 'warning',
  ARCHIVE: 'neutral',
};

const STATUT_LABELS = {
  EN_ATTENTE: 'En attente',
  EN_ATTENTE_VERIFICATION: 'En vérification',
  RETENU: 'Retenu',
  PAYE: 'Payé',
  PAYE_DIRECTEMENT: 'Payé directement',
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
  { value: 'PAYE', label: 'Payé' },
  { value: 'REFUSE', label: 'Refusé' },
  { value: 'ANNULE', label: 'Annulé' },
];

export default function MesDossiersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dossiers, setDossiers] = useState([]);
  const [activeFilter, setActiveFilter] = useState('');
  const { execute, isLoading } = useApi();

  useEffect(() => {
    loadDossiers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                    <Badge variant={STATUT_COLORS[dossier.statut] || 'neutral'} data-testid={`dossier-status-${dossier.id}`}>
                      {STATUT_LABELS[dossier.statut] || dossier.statut}
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

                <div className="flex flex-col gap-2 items-end">
                  {dossier.statut === 'RETENU' && (
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => navigate(`/apprenant/paiements/initier/${dossier.id}`)}
                      data-testid={`btn-payer-${dossier.id}`}
                    >
                      Payer maintenant
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
    RETAIL: 'Paiement direct',
    VOUCHER: 'Code Voucher',
    ABONNEMENT: 'Abonnement',
    B2B: 'Entreprise (B2B)',
    INSTITUTIONNEL: 'Institutionnel',
  };
  return labels[source] || source;
}
