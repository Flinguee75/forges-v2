import { useEffect, useMemo, useState, useCallback } from 'react';
import { useApi } from '../../../hooks/useApi';
import botApi from '../../../api/bot.api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/feedback/Spinner';
import EmptyState from '../../../components/feedback/EmptyState';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('fr-FR');
}

function formatSessionLabel(session) {
  if (!session) return 'Session non renseignée';
  const start = formatDate(session.date_debut);
  const end = formatDate(session.date_fin);
  return `${session.id} · ${start} → ${end} · ${session.statut}`;
}

function groupFeedbacksByFormation(feedbacks = []) {
  const groups = new Map();

  feedbacks.forEach((feedback) => {
    const key = feedback.formation?.id || feedback.formation_id || 'unknown';
    const current = groups.get(key) || {
      formation: feedback.formation || { id: key, intitule: 'Formation inconnue' },
      feedbacks: [],
    };

    current.feedbacks.push(feedback);
    groups.set(key, current);
  });

  return Array.from(groups.values()).map((group) => {
    const total = group.feedbacks.length;
    const moyenne_globale = total > 0
      ? Math.round(
          (group.feedbacks.reduce((sum, feedback) => sum + Number(feedback.note_globale || 0), 0) / total) * 10,
        ) / 10
      : 0;
    const taux_recommandation = total > 0
      ? Math.round((group.feedbacks.filter((feedback) => feedback.recommande).length / total) * 100)
      : 0;

    return {
      ...group,
      meta: {
        total,
        moyenne_globale,
        taux_recommandation,
      },
    };
  }).sort((a, b) => {
    const aDate = new Date(a.feedbacks[0]?.date_saisie || 0).getTime();
    const bDate = new Date(b.feedbacks[0]?.date_saisie || 0).getTime();
    return bDate - aDate;
  });
}

export default function FeedbacksAdmin() {
  const [data, setData] = useState(null);
  const { execute, isLoading } = useApi();

  const loadData = useCallback(async () => {
    await execute(
      () => botApi.getFeedbacksFormations(),
      {
        onSuccess: (response) => {
          setData(response.data);
        },
      }
    );
  }, [execute]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getCanalBadge = (canal) => {
    const mapping = {
      BOT: { variant: 'info', label: 'Bot' },
      WEB: { variant: 'success', label: 'Web' },
      EMAIL: { variant: 'warning', label: 'Email' },
    };
    const config = mapping[canal] || { variant: 'gray', label: canal };
    return <Badge variant={config.variant} size="small">{config.label}</Badge>;
  };

  const groupedFeedbacks = useMemo(() => {
    if (Array.isArray(data?.grouped_feedbacks) && data.grouped_feedbacks.length > 0) {
      return data.grouped_feedbacks;
    }

    return groupFeedbacksByFormation(Array.isArray(data?.feedbacks) ? data.feedbacks : []);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (!data) return null;

  const { meta } = data;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
          Bot admin
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-primary">
          Feedbacks formations
        </h1>
        <p className="mt-2 text-sm text-subtext">
          Retours d'expérience des apprenants regroupés par formation avec la session associée.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-center">
            <p className="text-sm text-subtext">Total feedbacks</p>
            <p className="mt-2 text-3xl font-bold text-primary">{meta.total}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-subtext">Moyenne globale</p>
            <p className="mt-2 text-3xl font-bold text-primary">{meta.moyenne_globale}/5</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-subtext">Taux de recommandation</p>
            <p className="mt-2 text-3xl font-bold text-primary">{meta.taux_recommandation}%</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-primary">
            Feedbacks par formation ({groupedFeedbacks.length})
          </h2>
        </div>
        {groupedFeedbacks.length === 0 ? (
          <EmptyState title="Aucun feedback" message="Aucun retour n'a été collecté pour le moment." />
        ) : (
          <div className="space-y-4 p-4">
            {groupedFeedbacks.map((group) => (
              <div key={group.formation?.id || group.formation?.intitule} className="rounded-lg border border-border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text">
                      {group.formation?.intitule || 'Formation inconnue'}
                    </p>
                    <p className="mt-1 text-xs text-subtext">
                      {group.formation?.partenaire?.raison_sociale || 'Partenaire non renseigné'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="info" size="small">{group.meta.total} feedbacks</Badge>
                    <Badge variant="success" size="small">{group.meta.moyenne_globale}/5</Badge>
                    <Badge variant="gray" size="small">{group.meta.taux_recommandation}% recommandent</Badge>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {group.feedbacks
                    .map((feedback) => feedback.session)
                    .filter(Boolean)
                    .slice(0, 3)
                    .map((session) => (
                      <Badge key={session.id} variant="gray" size="small">
                        Session {session.id.slice(0, 8)}
                      </Badge>
                    ))}
                </div>

                <div className="mt-4 space-y-3">
                  {group.feedbacks.map((feedback) => {
                    const author = feedback.apprenant
                      ? `${feedback.apprenant.prenoms} ${feedback.apprenant.nom}`
                      : feedback.organisation?.raison_sociale || 'Auteur inconnu';

                    return (
                      <div key={feedback.id} className="rounded-lg border border-border bg-bg px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-text">{author}</p>
                            <p className="mt-1 text-xs text-subtext">{feedback.apprenant?.email || feedback.organisation?.email}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {getCanalBadge(feedback.canal)}
                            {feedback.recommande ? (
                              <Badge variant="success" size="small">Recommandé</Badge>
                            ) : (
                              <Badge variant="gray" size="small">Non recommandé</Badge>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 grid gap-2 text-sm text-text sm:grid-cols-3">
                          <p><span className="font-semibold">Note</span> {feedback.note_globale}/5</p>
                          <p><span className="font-semibold">Date</span> {formatDate(feedback.date_saisie)}</p>
                          <p><span className="font-semibold">Session</span> {formatSessionLabel(feedback.session)}</p>
                        </div>

                        {feedback.commentaire_libre ? (
                          <p className="mt-3 text-sm text-text">
                            {feedback.commentaire_libre}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
