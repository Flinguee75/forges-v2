import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useAuth } from '../../../hooks/useAuth';
import responsableApi from '../../../api/responsable.api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/feedback/Spinner';
import Pagination from '../../../components/ui/Pagination';

/**
 * FormationsPartenaire - Liste des formations partenaires à valider
 * Route: /backoffice/formations-partenaires
 * Accessible à: RESPONSABLE, ADMIN
 * Affiche uniquement les formations assignées au RESPONSABLE connecté (backend filtre)
 * Référence: F-14 Backoffice Partenaires - RM-134 (ForgesTODO v2.md)
 */
export default function FormationsPartenaire() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formations, setFormations] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    statut: '',
    search: '',
  });

  const { execute, isLoading } = useApi();

  const loadFormations = async (page = 1) => {
    await execute(
      () =>
        responsableApi.getFormationsEnAttente({
          page,
          limit: 10,
          ...filters,
        }),
      {
        onSuccess: (data) => {
          setFormations(data.data || []);
          setMeta(data.meta || { page: 1, totalPages: 1, total: 0 });
        },
      }
    );
  };

  useEffect(() => {
    loadFormations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleSearchChange = (e) => {
    setFilters({ ...filters, search: e.target.value });
  };

  const handleStatutChange = (e) => {
    setFilters({ ...filters, statut: e.target.value });
  };

  const getStatutBadge = (statut) => {
    const mapping = {
      BROUILLON: { variant: 'gray', label: 'Brouillon' },
      EN_ATTENTE_VALIDATION: { variant: 'warning', label: 'En attente validation' },
      ACTIVE: { variant: 'success', label: 'Validée' },
      REJETEE: { variant: 'danger', label: 'Rejetée' },
      SUSPENDUE: { variant: 'warning', label: 'Suspendue' },
    };

    const config = mapping[statut] || { variant: 'gray', label: statut };
    return <Badge variant={config.variant} size="small">{config.label}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calcul du délai depuis soumission (RM-134)
  const calculateDelai = (createdAt) => {
    if (!createdAt) return { jours: 0, badge: null };
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = now - created;
    const jours = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (jours >= 5) {
      return {
        jours,
        badge: <Badge variant="danger" size="small">J+{jours} dépassé</Badge>,
      };
    } else if (jours >= 3) {
      return {
        jours,
        badge: <Badge variant="warning" size="small">J+{jours}</Badge>,
      };
    }
    return { jours, badge: null };
  };

  if (isLoading && formations.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
              Validation formations
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">
              Formations partenaires à valider
            </h2>
            <p className="mt-2 text-subtext">
              {user?.role === 'RESPONSABLE'
                ? 'Validez les formations des partenaires qui vous sont assignés.'
                : 'Gérez les formations soumises par les partenaires.'}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Rechercher par titre de formation..."
              value={filters.search}
              onChange={handleSearchChange}
            />
          </div>
          <div className="w-64">
            <select
              value={filters.statut}
              onChange={handleStatutChange}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none"
            >
              <option value="">Tous les statuts</option>
              <option value="EN_ATTENTE_VALIDATION">En attente validation</option>
              <option value="ACTIVE">Validée</option>
              <option value="REJETEE">Rejetée</option>
              <option value="SUSPENDUE">Suspendue</option>
            </select>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-primary">
            {meta.total} formation{meta.total > 1 ? 's' : ''}
          </h3>
        </div>

        {formations.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-subtext">Aucune formation trouvée.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm font-semibold text-primary">
                    <th className="pb-3">Titre</th>
                    <th className="pb-3">Partenaire</th>
                    <th className="pb-3">Type partenaire</th>
                    <th className="pb-3">Date soumission</th>
                    <th className="pb-3">Délai</th>
                    <th className="pb-3">Statut</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {formations.map((formation) => {
                    const delai = calculateDelai(formation.created_at);
                    return (
                      <tr
                        key={formation.id}
                        className="border-b border-border transition-colors hover:bg-gray-50"
                      >
                        <td className="py-4">
                          <button
                            onClick={() => navigate(`/backoffice/formations-partenaires/${formation.id}/valider`)}
                            className="font-medium text-primary hover:text-secondary hover:underline"
                          >
                            {formation.titre}
                          </button>
                          {formation.statut === 'EN_ATTENTE_VALIDATION' && delai.jours >= 5 && (
                            <div className="mt-1">
                              <Badge variant="danger" size="small">Prioritaire</Badge>
                            </div>
                          )}
                        </td>
                        <td className="py-4 text-sm text-subtext">
                          {formation.partenaire?.raison_sociale || 'N/A'}
                        </td>
                        <td className="py-4 text-sm text-subtext">
                          {formation.partenaire?.type || 'N/A'}
                        </td>
                        <td className="py-4 text-sm text-subtext">
                          {formatDate(formation.created_at)}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-subtext">J+{delai.jours}</span>
                            {delai.badge}
                          </div>
                        </td>
                        <td className="py-4">
                          {getStatutBadge(formation.statut)}
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant={formation.statut === 'EN_ATTENTE_VALIDATION' ? 'primary' : 'outline'}
                              size="small"
                              onClick={() => navigate(`/backoffice/formations-partenaires/${formation.id}/valider`)}
                            >
                              {formation.statut === 'EN_ATTENTE_VALIDATION' ? 'Valider' : 'Voir'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {meta.totalPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={meta.page}
                  totalPages={meta.totalPages}
                  onPageChange={loadFormations}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
