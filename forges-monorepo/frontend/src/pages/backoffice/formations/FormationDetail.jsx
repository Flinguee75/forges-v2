import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { formationsApi } from '../../../api/formations.api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/feedback/Spinner';
import EmptyState from '../../../components/feedback/EmptyState';

function getStatutBadge(statut) {
  const mapping = {
    BROUILLON: { variant: 'gray', label: 'Brouillon' },
    EN_ATTENTE_PLANIFICATION: { variant: 'warning', label: 'En attente planification' },
    EN_ATTENTE_VALIDATION: { variant: 'warning', label: 'En attente validation' },
    ACTIVE: { variant: 'success', label: 'Active' },
    ARCHIVEE: { variant: 'danger', label: 'Archivée' },
    REJETEE: { variant: 'danger', label: 'Rejetée' },
    SUSPENDUE: { variant: 'warning', label: 'Suspendue' },
  };

  const config = mapping[statut] || { variant: 'gray', label: statut };
  return <Badge variant={config.variant} size="small">{config.label}</Badge>;
}

export default function FormationDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { execute, isLoading, error } = useApi();
  const [formation, setFormation] = useState(null);

  const loadFormation = async () => {
    await execute(() => formationsApi.getByIdBackoffice(id), {
      onSuccess: (response) => {
        setFormation(response?.data || response);
      },
    });
  };

  useEffect(() => {
    loadFormation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleArchive = async () => {
    await execute(
      () => formationsApi.archiver(id),
      {
        onSuccess: () => loadFormation(),
      }
    );
  };

  const handlePublish = async () => {
    await execute(
      () => formationsApi.publier(id),
      {
        onSuccess: () => loadFormation(),
      }
    );
  };

  if (isLoading && !formation) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (error && !formation) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card>
          <EmptyState
            title="Formation indisponible"
            message={error}
            action={(
              <Button onClick={() => navigate('/backoffice/formations')}>
                Retour aux formations
              </Button>
            )}
          />
        </Card>
      </div>
    );
  }

  if (!formation) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
              Détail formation
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">
              {formation.titre || formation.intitule}
            </h2>
            <p className="mt-2 text-subtext">
              Vue backoffice réactivée pour consultation et archivage.
            </p>
          </div>
          <div className="flex gap-2">
            {formation.statut !== 'ACTIVE' && formation.statut !== 'ARCHIVEE' && (
              <Button variant="primary" onClick={handlePublish} loading={isLoading}>
                Publier
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(`/backoffice/formations/${formation.id}/edit`)}>
              Modifier
            </Button>
            {formation.statut !== 'ARCHIVEE' && (
              <Button variant="danger" onClick={handleArchive} loading={isLoading}>
                Archiver
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card title="Résumé">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtext">Statut</p>
            <div className="mt-1">{getStatutBadge(formation.statut)}</div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtext">Sessions</p>
            <p className="mt-1 text-sm text-text">{formation._count?.sessions || 0}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtext">Durée</p>
            <p className="mt-1 text-sm text-text">{formation.duree || formation.duree_jours} jours</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtext">Tarif</p>
            <p className="mt-1 text-sm text-text">
              {Math.round((formation.tarif || formation.cout_catalogue || 0) / 100).toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        </div>
      </Card>

      <Card title="Description">
        <div className="space-y-4 text-sm text-text">
          <p>{formation.description || formation.description_courte}</p>
          {formation.description_longue && <p className="text-subtext">{formation.description_longue}</p>}
        </div>
      </Card>
    </div>
  );
}
