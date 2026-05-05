import { useCallback, useEffect, useState } from 'react';
import abonnementsApi from '../../../api/abonnements.api';
import { useApi } from '../../../hooks/useApi';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/feedback/Spinner';
import EmptyState from '../../../components/feedback/EmptyState';

export default function ContratInstitutionnel() {
  const [data, setData] = useState(null);
  const { execute, isLoading } = useApi();

  const loadData = useCallback(async () => {
    await execute(
      () => abonnementsApi.getContratsInstitutionnels(),
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

  const contrats = data?.contrats || [];
  const stats = data?.stats || { actifs: 0, brouillons: 0, expires: 0 };
  const total = data?.meta?.total || 0;

  const formatDate = (date) => (date ? new Date(date).toLocaleDateString('fr-FR') : 'Non renseigné');
  const formatMoney = (amount) => `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;

  const getStatutBadge = (statut) => {
    const mapping = {
      ACTIF: { variant: 'success', label: 'Actif' },
      BROUILLON: { variant: 'gray', label: 'Brouillon' },
      EXPIRE: { variant: 'danger', label: 'Expiré' },
      SUSPENDU: { variant: 'warning', label: 'Suspendu' },
    };
    const config = mapping[statut] || { variant: 'gray', label: statut || 'Non renseigné' };
    return <Badge variant={config.variant} size="small">{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
          Contrats institutionnels
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-primary">
          Contrat institutionnel
        </h1>
        <p className="mt-2 text-sm text-subtext">
          Suivi des contrats institutionnels, des seuils de facturation et des gestionnaires rattachés.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <div className="text-center">
            <p className="text-sm text-subtext">Contrats</p>
            <p className="mt-2 text-3xl font-bold text-primary">{total}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-subtext">Actifs</p>
            <p className="mt-2 text-3xl font-bold text-success">{stats.actifs}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-subtext">Brouillons</p>
            <p className="mt-2 text-3xl font-bold text-subtext">{stats.brouillons}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-subtext">Expirés</p>
            <p className="mt-2 text-3xl font-bold text-danger">{stats.expires}</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-primary">Contrats institutionnels ({contrats.length})</h2>
        </div>
        {contrats.length === 0 ? (
          <EmptyState
            title="Aucun contrat institutionnel"
            message="Aucun contrat institutionnel n'est disponible pour le moment."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Contrat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Institution
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Facturation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Gestionnaires
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
                {contrats.map((contrat) => (
                  <tr key={contrat.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{contrat.numero_contrat}</div>
                      <div className="text-sm text-gray-500">{contrat.programme_id}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{contrat.institution_nom}</div>
                      <div className="text-sm text-gray-500">{contrat.bailleur || 'Bailleur non renseigné'}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <div>SaaS annuel: {formatMoney(contrat.montant_saas_annuel)}</div>
                      <div>Fee certifié: {formatMoney(contrat.fee_par_certifie)}</div>
                      <div>Report: {formatMoney(contrat.cumul_fees_reportes)}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {(contrat.gestionnaires_ids || []).length}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {getStatutBadge(contrat.statut)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(contrat.date_debut)} - {formatDate(contrat.date_fin)}
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
