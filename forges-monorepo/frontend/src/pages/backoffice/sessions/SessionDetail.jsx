import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import { sessionsApi } from '../../../api/sessions.api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/feedback/Spinner';
import EmptyState from '../../../components/feedback/EmptyState';
import { getDossierStatutMeta } from '../../../utils/dossierStatus';

function getStatutBadge(statut) {
  const mapping = {
    BROUILLON: { variant: 'gray', label: 'Brouillon' },
    PLANIFIEE: { variant: 'info', label: 'Planifiée' },
    A_VENIR: { variant: 'info', label: 'À venir' },
    INSCRIPTIONS_OUVERTES: { variant: 'success', label: 'Inscriptions ouvertes' },
    OUVERTE: { variant: 'success', label: 'Ouverte' },
    EN_COURS: { variant: 'info', label: 'En cours' },
    CLOTUREE: { variant: 'warning', label: 'Clôturée' },
    TERMINEE: { variant: 'gray', label: 'Terminée' },
    ARCHIVEE: { variant: 'gray', label: 'Archivée' },
    ANNULEE: { variant: 'danger', label: 'Annulée' },
  };

  const config = mapping[statut] || { variant: 'gray', label: statut };
  return <Badge variant={config.variant} size="small">{config.label}</Badge>;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('fr-FR');
}

function getCapacityStats(capacity, registeredCount) {
  const capacityValue = Number(capacity || 0);
  const registeredValue = Number(registeredCount || 0);
  const remaining = Math.max(0, capacityValue - registeredValue);
  const occupancy = capacityValue > 0 ? Math.round((registeredValue / capacityValue) * 100) : 0;

  return { capacityValue, registeredValue, remaining, occupancy };
}

export default function SessionDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { execute, isLoading, error } = useApi();
  const { showToast } = useToast();
  const [session, setSession] = useState(null);
  const [dossiers, setDossiers] = useState([]);

  const loadSession = async () => {
    await execute(() => sessionsApi.getById(id), {
      onSuccess: (response) => {
        setSession(response?.data || response);
      },
    });
  };

  const loadDossiers = async () => {
    try {
      await execute(() => sessionsApi.getDossiers(id), {
        showErrorToast: false,
        onSuccess: (response) => {
          const payload = response?.data?.data ?? response?.data ?? response;
          setDossiers(Array.isArray(payload) ? payload : []);
        },
      });
    } catch {
      // dossiers non bloquants
    }
  };

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (session) {
      loadDossiers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const closeSession = async () => {
    try {
      await execute(() => sessionsApi.cloturerManuellement(id), {
        onSuccess: () => {
          showToast('Session clôturée avec succès.', 'success');
          loadSession();
        },
        onError: (err) => {
          const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Impossible de clôturer la session.';
          showToast(message, 'error');
        },
      });
    } catch {
      // Le toast est déjà affiché via onError ; on évite un rejet non géré.
    }
  };

  const cancelSession = async () => {
    try {
      await execute(() => sessionsApi.annuler(id), {
        onSuccess: () => {
          showToast('Session annulée avec succès.', 'success');
          loadSession();
        },
        onError: (err) => {
          const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Impossible d’annuler la session.';
          showToast(message, 'error');
        },
      });
    } catch {
      // Le toast est déjà affiché via onError ; on évite un rejet non géré.
    }
  };

  if (isLoading && !session) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card>
          <EmptyState
            title="Session indisponible"
            message={error}
            action={(
              <Button onClick={() => navigate('/backoffice/sessions')}>
                Retour aux sessions
              </Button>
            )}
          />
        </Card>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
              Détail session
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">
              {session.formation?.titre || session.formation?.intitule || 'Session backoffice'}
            </h2>
            <p className="mt-2 text-subtext">
              Détail et actions backoffice réactivés.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/backoffice/sessions/${session.id}/edit`)}>
              Modifier
            </Button>
            {['OUVERTE', 'INSCRIPTIONS_OUVERTES', 'EN_COURS'].includes(session.statut) && (
              <Button variant="warning" onClick={closeSession} loading={isLoading}>
                Clôturer
              </Button>
            )}
            {['PLANIFIEE', 'A_VENIR', 'INSCRIPTIONS_OUVERTES', 'OUVERTE'].includes(session.statut) && (
              <Button variant="danger" onClick={cancelSession} loading={isLoading}>
                Annuler
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card title="Résumé">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtext">Statut</p>
            <div className="mt-1">{getStatutBadge(session.statut)}</div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtext">Capacité</p>
            <p className="mt-1 text-sm text-text">{session.capacite}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtext">Dossiers</p>
            <p className="mt-1 text-sm text-text">{session._count?.dossiers || session.dossiers?.length || 0}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtext">Formation</p>
            <button
              type="button"
              onClick={() => navigate(`/backoffice/formations/${session.formation_id}`)}
              className="mt-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              {session.formation?.titre || session.formation?.intitule || 'N/A'}
            </button>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtext">Places restantes</p>
            <p className="mt-1 text-sm text-text">
              {getCapacityStats(session.capacite, session._count?.dossiers ?? session.nb_inscrits ?? 0).remaining}
            </p>
          </div>
          {session.lieu && (
            <div className="md:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-subtext">Lieu</p>
              <p className="mt-1 text-sm text-text">{session.lieu}</p>
            </div>
          )}
        </div>
      </Card>

      <Card title="Dates">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtext">Ouverture</p>
            <p className="mt-1 text-sm text-text">{formatDate(session.date_ouverture)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtext">Clôture</p>
            <p className="mt-1 text-sm text-text">{formatDate(session.date_cloture)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtext">Début</p>
            <p className="mt-1 text-sm text-text">{formatDate(session.date_debut)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-subtext">Fin</p>
            <p className="mt-1 text-sm text-text">{formatDate(session.date_fin)}</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-subtext">
          Participants ({dossiers.length})
        </h3>
        {dossiers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Apprenant</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Statut dossier</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Source</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dossiers.map((dossier) => {
                  const meta = getDossierStatutMeta(dossier.statut);
                  const nom = dossier.apprenant
                    ? `${dossier.apprenant.prenoms || ''} ${dossier.apprenant.nom || ''}`.trim()
                    : '-';
                  return (
                    <tr key={dossier.id} className="hover:bg-bg">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-text">{nom}</p>
                        <p className="text-xs text-subtext">{dossier.apprenant?.email || '-'}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-subtext">
                        {dossier.source_financement || '-'}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/backoffice/dossiers/${dossier.id}`)}
                        >
                          Voir dossier
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Aucun participant"
            message="Aucun apprenant n'est encore inscrit à cette session."
          />
        )}
      </Card>
    </div>
  );
}
