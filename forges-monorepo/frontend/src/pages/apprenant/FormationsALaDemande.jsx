import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import apprenantApi from '../../api/espace-apprenant.api';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';

const STATUS_ORDER = { ACTIF: 0, SUSPENDU: 1, EXPIRE: 2 };
const FILTER_TABS = [
  { key: 'TOUS', label: 'Tous' },
  { key: 'ACTIF', label: 'Actifs' },
  { key: 'SUSPENDU', label: 'Suspendus' },
  { key: 'EXPIRE', label: 'Expires' },
];

function formatDate(dateValue) {
  if (!dateValue) return '-';
  return new Date(dateValue).toLocaleDateString('fr-FR');
}

function getDaysRemaining(dateExpiration) {
  if (!dateExpiration) return null;
  return Math.ceil((new Date(dateExpiration) - new Date()) / 86400000);
}

function getBadgeVariant(status) {
  if (status === 'ACTIF') return 'success';
  if (status === 'SUSPENDU') return 'warning';
  if (status === 'EXPIRE') return 'danger';
  return 'gray';
}

function ProgressRing({ value, size = 52, strokeWidth = 5 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary"
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <span className="absolute text-xs font-semibold text-text">{pct}%</span>
    </div>
  );
}

export default function FormationsALaDemande() {
  const [accesList, setAccesList] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [activeFilter, setActiveFilter] = useState('TOUS');
  const { execute, isLoading } = useApi();

  const loadAcces = async () => {
    setLoadError('');
    try {
      const result = await execute(
        () => apprenantApi.getMesFormationsDemande(),
        { showErrorToast: false }
      );
      const raw = Array.isArray(result) ? result : result?.data || [];
      const sorted = [...raw].sort(
        (a, b) => (STATUS_ORDER[a.statut] ?? 9) - (STATUS_ORDER[b.statut] ?? 9)
      );
      setAccesList(sorted);
    } catch (error) {
      setLoadError(error?.message || 'Impossible de charger les acces a la demande.');
    }
  };

  useEffect(() => {
    loadAcces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (activeFilter === 'TOUS') return accesList;
    return accesList.filter((a) => a.statut === activeFilter);
  }, [accesList, activeFilter]);

  const counts = useMemo(
    () => ({
      TOUS: accesList.length,
      ACTIF: accesList.filter((a) => a.statut === 'ACTIF').length,
      SUSPENDU: accesList.filter((a) => a.statut === 'SUSPENDU').length,
      EXPIRE: accesList.filter((a) => a.statut === 'EXPIRE').length,
    }),
    [accesList]
  );

  if (isLoading && accesList.length === 0) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="large" />
      </div>
    );
  }

  if (loadError) {
    return (
      <EmptyState
        type="error"
        title="Acces indisponibles"
        message={loadError}
        action={<Button variant="outline" onClick={loadAcces}>Reessayer</Button>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
          Formations a la demande
        </p>
        <h1 className="mt-3 text-3xl font-bold text-text">Vos acces</h1>
        <p className="mt-2 text-sm text-subtext">
          Consultez la progression, la date d&apos;expiration et la source de financement de chaque acces.
        </p>
      </div>

      {accesList.length === 0 ? (
        <EmptyState
          title="Aucun acces a la demande"
          message="Vos acces apparaitront ici apres activation via abonnement ou achat ponctuel."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                className={[
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                  activeFilter === tab.key
                    ? 'bg-primary text-white'
                    : 'border border-border bg-white text-subtext hover:border-primary/40 hover:text-text',
                ].join(' ')}
              >
                {tab.label}
                {counts[tab.key] > 0 && (
                  <span className={[
                    'ml-2 rounded-full px-1.5 py-0.5 text-xs',
                    activeFilter === tab.key ? 'bg-white/20' : 'bg-border',
                  ].join(' ')}>
                    {counts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              title="Aucun acces dans cette categorie"
              message="Changez de filtre pour voir d'autres acces."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filtered.map((acces) => {
                const daysLeft = getDaysRemaining(acces.date_expiration);
                const isActif = acces.statut === 'ACTIF';
                const isExpiringSoon = isActif && daysLeft !== null && daysLeft <= 14;

                return (
                  <Card key={acces.id} className="transition-shadow hover:shadow-md">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
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
                          <h2 className="mt-2 text-lg font-semibold leading-tight text-text">
                            {acces.formation?.intitule || acces.formation?.titre || 'Formation'}
                          </h2>
                          {acces.formation?.categorie && (
                            <p className="mt-0.5 text-xs text-subtext">{acces.formation.categorie}</p>
                          )}
                        </div>
                        <ProgressRing value={acces.progression} />
                      </div>

                      {isExpiringSoon && (
                        <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
                          Expire dans {daysLeft} jour{daysLeft > 1 ? 's' : ''} — {formatDate(acces.date_expiration)}
                        </div>
                      )}

                      {!isExpiringSoon && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-subtext">
                          <span>Expiration</span>
                          <span className="text-right font-medium text-text">{formatDate(acces.date_expiration)}</span>
                          {acces.last_access_at && (
                            <>
                              <span>Dernier acces</span>
                              <span className="text-right font-medium text-text">{formatDate(acces.last_access_at)}</span>
                            </>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-1">
                        {isActif && (
                          <Link to={`/apprenant/formations-a-la-demande/${acces.id}`}>
                            <Button size="small" data-testid={`acceder-${acces.id}`}>
                              Acceder
                            </Button>
                          </Link>
                        )}
                        <Link to={`/apprenant/formations-a-la-demande/${acces.id}`}>
                          <Button variant="outline" size="small">
                            Voir le detail
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
