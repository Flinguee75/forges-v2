import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apprenantApi from '../../api/espace-apprenant.api';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';

function formatDate(dateValue) {
  if (!dateValue) return '-';
  return new Date(dateValue).toLocaleDateString('fr-FR');
}

function getBadgeVariant(status) {
  if (status === 'ACTIF') return 'success';
  if (status === 'SUSPENDU') return 'warning';
  if (status === 'EXPIRE') return 'danger';
  return 'gray';
}

export default function FormationsALaDemande() {
  const [accesList, setAccesList] = useState([]);
  const [loadError, setLoadError] = useState('');
  const { execute, isLoading } = useApi();

  const loadAcces = async () => {
    setLoadError('');

    try {
      const result = await execute(
        () => apprenantApi.getMesFormationsDemande(),
        { showErrorToast: false }
      );

      setAccesList(Array.isArray(result) ? result : result?.data || []);
    } catch (error) {
      setLoadError(error?.message || 'Impossible de charger les accès à la demande.');
    }
  };

  useEffect(() => {
    loadAcces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading && accesList.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (loadError) {
    return (
      <EmptyState
        type="error"
        title="Accès indisponibles"
        message={loadError}
        action={(
          <Button variant="outline" onClick={loadAcces}>
            Réessayer
          </Button>
        )}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
          Formations à la demande
        </p>
        <h1 className="mt-3 text-3xl font-bold text-text">
          Vos accès actifs et historiques
        </h1>
        <p className="mt-2 text-sm text-subtext">
          Consultez la progression, la date d&apos;expiration et la source de financement de chaque accès.
        </p>
      </div>

      {accesList.length === 0 ? (
        <EmptyState
          title="Aucun accès à la demande"
          message="Vos accès apparaitront ici après activation via abonnement ou achat ponctuel."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {accesList.map((acces) => (
            <Card key={acces.id}>
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-text">
                      {acces.formation?.titre || 'Formation'}
                    </h2>
                    <p className="mt-1 text-sm text-subtext">
                      {acces.formation?.description || 'Accès à la demande'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getBadgeVariant(acces.statut)} size="small">
                      {acces.statut}
                    </Badge>
                    {acces.source_financement && (
                      <Badge variant="info" size="small">
                        {acces.source_financement}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 text-sm text-subtext md:grid-cols-2">
                  <p>Expiration: {formatDate(acces.date_expiration)}</p>
                  <p>Progression: {Number(acces.progression || 0)}%</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link to={`/apprenant/formations-a-la-demande/${acces.id}`}>
                    <Button size="small">Voir le détail</Button>
                  </Link>
                  <Badge variant="gray" size="small">
                    {acces.formation?.mode_formation || 'A_LA_DEMANDE'}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
