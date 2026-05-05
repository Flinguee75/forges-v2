import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import devisApi from '../../../api/devis.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/feedback/EmptyState';
import Spinner from '../../../components/feedback/Spinner';
import Input from '../../../components/ui/Input';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : '-';
}

function formatMontant(value) {
  if (value === undefined || value === null) return '-';
  return Number(value).toLocaleString('fr-FR') + ' XOF';
}

const STATUT_VARIANT = {
  CREE: 'warning',
  PAYE: 'success',
  ANNULE: 'gray',
};

export default function DevisList() {
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const [devisList, setDevisList] = useState([]);
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
    loadDevis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.statut]);

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
          <Input
            placeholder="ID organisation"
            value={filters.organisation_id}
            onChange={(e) => setFilters((f) => ({ ...f, organisation_id: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && loadDevis()}
          />
          <select
            value={filters.statut}
            onChange={(e) => setFilters((f) => ({ ...f, statut: e.target.value }))}
            className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text"
          >
            <option value="">Tous les statuts</option>
            <option value="CREE">Créé</option>
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
                  <th className="pb-3">Numéro</th>
                  <th className="pb-3">Organisation</th>
                  <th className="pb-3">Formation</th>
                  <th className="pb-3 text-right">Places</th>
                  <th className="pb-3 text-right">Montant total</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3">Créé le</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {devisList.map((devis) => (
                  <tr key={devis.id} className="border-b border-border hover:bg-gray-50">
                    <td className="py-4 font-mono text-sm text-text">{devis.numero_devis}</td>
                    <td className="py-4 text-sm text-text">
                      {devis.organisation?.raison_sociale || devis.organisation_id}
                    </td>
                    <td className="py-4 text-sm text-text">
                      {devis.formation?.intitule || devis.formation_id}
                    </td>
                    <td className="py-4 text-right text-sm text-text">{devis.nb_places}</td>
                    <td className="py-4 text-right text-sm font-medium text-text">
                      {formatMontant(devis.montant_total_xof)}
                    </td>
                    <td className="py-4">
                      <Badge variant={STATUT_VARIANT[devis.statut] || 'gray'}>
                        {devis.statut}
                      </Badge>
                    </td>
                    <td className="py-4 text-sm text-text">{formatDate(devis.created_at)}</td>
                    <td className="py-4 text-right">
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
