import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../../hooks/useApi';
import botApi from '../../../api/bot.api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/feedback/Spinner';
import EmptyState from '../../../components/feedback/EmptyState';

export default function EnquetesCatalogue() {
  const [data, setData] = useState(null);
  const { execute, isLoading } = useApi();

  const loadData = useCallback(async () => {
    await execute(
      () => botApi.getEnquetesCatalogue(),
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

  const getStatutBadge = (statut) => {
    const mapping = {
      NOUVEAU: { variant: 'info', label: 'Nouveau' },
      EN_COURS: { variant: 'warning', label: 'En cours' },
      TRAITE: { variant: 'success', label: 'Traité' },
      ARCHIVE: { variant: 'gray', label: 'Archivé' },
    };
    const config = mapping[statut] || { variant: 'gray', label: statut };
    return <Badge variant={config.variant} size="small">{config.label}</Badge>;
  };

  const getNiveauLabel = (niveau) => {
    const mapping = {
      DEBUTANT: 'Débutant',
      INTERMEDIAIRE: 'Intermédiaire',
      AVANCE: 'Avancé',
    };
    return mapping[niveau] || niveau;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (!data) return null;

  const { enquetes, meta } = data;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
          Bot admin
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-primary">
          Enquêtes formations
        </h1>
        <p className="mt-2 text-sm text-subtext">
          Enquêtes de catalogue collectées via le Bot Conseiller
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <div className="text-center">
            <p className="text-sm text-subtext">Total enquêtes</p>
            <p className="mt-2 text-3xl font-bold text-primary">{meta.total}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-subtext">Page {meta.page} / {meta.totalPages}</p>
            <p className="mt-2 text-sm text-subtext">Limite: {meta.limit} par page</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-primary">Enquêtes catalogue ({enquetes.length})</h2>
        </div>
        {enquetes.length === 0 ? (
          <EmptyState title="Aucune enquête" message="Aucune enquête n'a été collectée pour le moment." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Domaine
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Niveau
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Niveau cible
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Type utilisateur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {enquetes.map((enq) => (
                  <tr key={enq.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {enq.domaine}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {getNiveauLabel(enq.niveau)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {getNiveauLabel(enq.niveau_cible)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {enq.type_utilisateur}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {getStatutBadge(enq.statut)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(enq.date_saisie).toLocaleDateString()}
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
