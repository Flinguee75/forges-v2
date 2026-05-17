import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import devisApi from '../../../api/devis.api';
import { organisationsApi } from '../../../api/organisations.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/feedback/EmptyState';
import Spinner from '../../../components/feedback/Spinner';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : '-';
}

function formatMontant(value) {
  if (value === undefined || value === null) return '-';
  return Number(value).toLocaleString('fr-FR') + ' XOF';
}

const STATUT_CONFIG = {
  CREE:   { variant: 'warning', label: 'En attente de paiement' },
  PAYE:   { variant: 'success', label: 'Payé' },
  ANNULE: { variant: 'gray',    label: 'Annulé' },
};

export default function DevisList() {
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const [devisList, setDevisList] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [filters, setFilters] = useState({ organisation_id: '', statut: '' });

  const loadDevis = async () => {
    await execute(() => devisApi.getAll(filters), {
      onSuccess: (data) => {
        setDevisList(data?.data || []);
        setMeta(data?.meta || { total: 0 });
      },
    });
  };

  useEffect(() => {
    execute(() => organisationsApi.getAll({ limit: 200 }), {
      onSuccess: (data) => setOrganisations(Array.isArray(data?.data) ? data.data : []),
      showErrorToast: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDevis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.statut, filters.organisation_id]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">Gestion des devis</p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">Liste des devis</h2>
            <p className="mt-2 text-subtext">Devis institutionnels établis pour les organisations et contrats B2B.</p>
          </div>
          <Button data-testid="btn-nouveau-devis" onClick={() => navigate('/backoffice/devis/new')}>
            Nouveau devis
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <select
            value={filters.organisation_id}
            onChange={(e) => setFilters((f) => ({ ...f, organisation_id: e.target.value }))}
            className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text"
          >
            <option value="">Toutes les organisations</option>
            {organisations.map((org) => (
              <option key={org.id} value={org.id}>{org.raison_sociale}</option>
            ))}
          </select>
          <select
            value={filters.statut}
            onChange={(e) => setFilters((f) => ({ ...f, statut: e.target.value }))}
            className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text"
          >
            <option value="">Tous les statuts</option>
            <option value="CREE">En attente de paiement</option>
            <option value="PAYE">Payé</option>
            <option value="ANNULE">Annulé</option>
          </select>
        </div>

        {isLoading && devisList.length === 0 ? (
          <div className="py-12">
            <Spinner size="large" />
          </div>
        ) : devisList.length === 0 ? (
          <EmptyState title="Aucun devis" message="Aucun devis trouvé avec les filtres courants." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm font-semibold text-primary">
                  <th className="pb-4 pr-6">Numéro</th>
                  <th className="pb-4 pr-6">Organisation</th>
                  <th className="pb-4 pr-6">Formation</th>
                  <th className="pb-4 pr-6 text-right">Places</th>
                  <th className="pb-4 pr-6 text-right">Montant total</th>
                  <th className="pb-4 pr-6">Statut</th>
                  <th className="pb-4 pr-6">Créé le</th>
                  <th className="pb-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {devisList.map((devis) => (
                  <tr key={devis.id} className="border-b border-border hover:bg-gray-50">
                    <td className="py-5 pr-6 font-mono text-sm text-text">{devis.numero_devis}</td>
                    <td className="py-5 pr-6 text-sm text-text">
                      {devis.organisation_id ? (
                        <span>{devis.organisation?.raison_sociale || devis.organisation_id}</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            Individuel
                          </span>
                          <span>{devis.destinataire_nom || '-'}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-5 pr-6 text-sm text-text">
                      {devis.formation?.intitule || devis.formation_id}
                    </td>
                    <td className="py-5 pr-6 text-right text-sm text-text">{devis.nb_places}</td>
                    <td className="py-5 pr-6 text-right text-sm font-medium text-text">
                      {formatMontant(devis.montant_total_xof)}
                    </td>
                    <td className="py-5 pr-6">
                      <Badge variant={STATUT_CONFIG[devis.statut]?.variant || 'gray'}>
                        {STATUT_CONFIG[devis.statut]?.label || devis.statut}
                      </Badge>
                    </td>
                    <td className="py-5 pr-6 text-sm text-subtext">{formatDate(devis.created_at)}</td>
                    <td className="py-5 text-right">
                      <Button
                        size="small"
                        variant="outline"
                        onClick={() => navigate(`/backoffice/devis/${devis.id}`)}
                      >
                        Voir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="text-sm text-subtext">
        {meta.total} devis trouvé{meta.total > 1 ? 's' : ''}
      </div>
    </div>
  );
}
