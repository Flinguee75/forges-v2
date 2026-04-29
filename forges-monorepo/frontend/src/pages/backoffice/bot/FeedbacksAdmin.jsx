import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../../hooks/useApi';
import botApi from '../../../api/bot.api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/feedback/Spinner';
import EmptyState from '../../../components/feedback/EmptyState';

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

  const renderStars = (note) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= note ? 'text-yellow-500' : 'text-gray-300'}
          >
            ★
          </span>
        ))}
        <span className="ml-2 text-sm text-gray-600">({note}/5)</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (!data) return null;

  const { feedbacks, meta } = data;

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
          Retours d'expérience des apprenants sur les formations
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
          <h2 className="text-lg font-semibold text-primary">Feedbacks collectés ({feedbacks.length})</h2>
        </div>
        {feedbacks.length === 0 ? (
          <EmptyState title="Aucun feedback" message="Aucun retour n'a été collecté pour le moment." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Apprenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Formation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Note globale
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Recommande
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Canal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {feedbacks.map((fb) => (
                  <tr key={fb.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {fb.apprenant?.nom} {fb.apprenant?.prenoms}
                      </div>
                      <div className="text-sm text-gray-500">{fb.apprenant?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {fb.formation?.intitule}
                      </div>
                      <div className="text-sm text-gray-500">
                        {fb.formation?.partenaire?.raison_sociale}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {renderStars(fb.note_globale)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {fb.recommande ? (
                        <Badge variant="success" size="small">Oui</Badge>
                      ) : (
                        <Badge variant="gray" size="small">Non</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {getCanalBadge(fb.canal)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(fb.date_saisie).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
