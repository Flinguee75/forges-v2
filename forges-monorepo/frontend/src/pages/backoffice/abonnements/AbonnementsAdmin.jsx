import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../../hooks/useApi';
import abonnementsApi from '../../../api/abonnements.api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/feedback/Spinner';
import EmptyState from '../../../components/feedback/EmptyState';

export default function AbonnementsAdmin() {
  const [data, setData] = useState(null);
  const { execute, isLoading } = useApi();

  const loadData = useCallback(async () => {
    await execute(
      () => abonnementsApi.getAllBackoffice(),
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
      ACTIF: { variant: 'success', label: 'Actif' },
      ESSAI: { variant: 'warning', label: 'Essai' },
      SUSPENDU: { variant: 'danger', label: 'Suspendu' },
      RESILIÉ: { variant: 'gray', label: 'Résilié' },
      GRACE: { variant: 'warning', label: 'Période de grâce' },
    };
    const config = mapping[statut] || { variant: 'gray', label: statut };
    return <Badge variant={config.variant} size="small">{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (!data) return null;

  const { retail, organisation, b2b, meta } = data;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
          Backoffice abonnements
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-primary">
          Vue consolidée des abonnements
        </h1>
        <p className="mt-2 text-sm text-subtext">
          Gestion centralisée des abonnements Retail, Organisation et B2B
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-center">
            <p className="text-sm text-subtext">Abonnements Retail</p>
            <p className="mt-2 text-3xl font-bold text-primary">{meta.total_retail}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-subtext">Abonnements Organisation</p>
            <p className="mt-2 text-3xl font-bold text-primary">{meta.total_organisation}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-subtext">Abonnements B2B</p>
            <p className="mt-2 text-3xl font-bold text-primary">{meta.total_b2b}</p>
          </div>
        </Card>
      </div>

      {/* Abonnements Retail */}
      <Card>
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-primary">Abonnements Retail ({retail.length})</h2>
        </div>
        {retail.length === 0 ? (
          <EmptyState title="Aucun abonnement retail" message="Aucun apprenant n'a souscrit d'abonnement." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Apprenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Offre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Dates
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {retail.map((abo) => (
                  <tr key={abo.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {abo.apprenant?.nom} {abo.apprenant?.prenoms}
                      </div>
                      <div className="text-sm text-gray-500">{abo.apprenant?.email}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {abo.offre}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {getStatutBadge(abo.statut)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(abo.date_debut).toLocaleDateString()} - {new Date(abo.date_fin).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Abonnements Organisation */}
      <Card>
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-primary">Abonnements Organisation ({organisation.length})</h2>
        </div>
        {organisation.length === 0 ? (
          <EmptyState title="Aucun abonnement organisation" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Organisation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Dates
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {organisation.map((abo) => (
                  <tr key={abo.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {abo.organisation?.raison_sociale}
                      </div>
                      <div className="text-sm text-gray-500">{abo.organisation?.email}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {getStatutBadge(abo.statut)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(abo.date_debut).toLocaleDateString()} - {new Date(abo.date_fin).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Abonnements B2B */}
      <Card>
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-primary">Abonnements B2B ({b2b.length})</h2>
        </div>
        {b2b.length === 0 ? (
          <EmptyState title="Aucun abonnement B2B" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Organisation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Palier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Quota
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Dates
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {b2b.map((abo) => (
                  <tr key={abo.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {abo.organisation?.raison_sociale}
                      </div>
                      <div className="text-sm text-gray-500">{abo.organisation?.email}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {abo.palier}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {abo.consomme} / {abo.quota}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {getStatutBadge(abo.statut)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(abo.date_debut).toLocaleDateString()} - {new Date(abo.date_fin).toLocaleDateString()}
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
