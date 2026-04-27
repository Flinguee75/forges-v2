import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formationsApi } from '../../api/formations.api';
import apprenantApi from '../../api/espace-apprenant.api';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';

function formatMoney(amount) {
  return `${Math.round(Number(amount || 0)).toLocaleString('fr-FR')} FCFA`;
}

function formatDuration(hours) {
  return `${hours || 0} h`;
}

export default function CatalogueApprenantPage() {
  const navigate = useNavigate();
  const [formations, setFormations] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    limit: 12,
  });
  const { execute, isLoading } = useApi();

  const loadCatalogue = async (nextPage = filters.page) => {
    await execute(
      () => formationsApi.getCatalogue({
        page: nextPage,
        limit: filters.limit,
        search: filters.search || undefined,
      }),
      {
        onSuccess: (result) => {
          setFormations(result?.data || []);
          setMeta(result?.meta || { page: 1, totalPages: 1, total: 0 });
        },
      }
    );
  };

  const handleAccederFormation = async (formationId) => {
    await execute(
      () => apprenantApi.accederFormationDemande(formationId),
      {
        onSuccess: (acces) => {
          navigate(`/apprenant/formations-a-la-demande/${acces.id}`);
        },
        onError: (error) => {
          if (error?.statusCode === 402 || error?.code === 'PAYMENT_REQUIRED') {
            navigate('/apprenant/abonnement/souscrire');
          }
        },
      }
    );
  };

  useEffect(() => {
    loadCatalogue(filters.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.search]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setFilters((current) => ({ ...current, page: 1 }));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
          Catalogue apprenant
        </p>
        <h1 className="mt-3 text-3xl font-bold text-text">
          Formations disponibles
        </h1>
        <p className="mt-2 text-sm text-subtext">
          Les badges `Inclus` et `Premium` sont alimentés par le backend.
        </p>
      </div>

      <Card>
        <form className="flex flex-col gap-4 md:flex-row md:items-end" onSubmit={handleSubmit}>
          <div className="flex-1">
            <Input
              label="Recherche"
              placeholder="Rechercher une formation"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            />
          </div>
          <Button type="submit">Rechercher</Button>
        </form>
      </Card>

      {isLoading && formations.length === 0 ? (
        <div className="flex justify-center py-12">
          <Spinner size="large" />
        </div>
      ) : formations.length === 0 ? (
        <EmptyState
          title="Aucune formation trouvée"
          message="Aucun résultat ne correspond à votre recherche."
          action={(
            <Button variant="outline" onClick={() => setFilters({ search: '', page: 1, limit: 12 })}>
              Réinitialiser
            </Button>
          )}
        />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {formations.map((formation) => {
              const isALaDemande = formation.mode_formation === 'A_LA_DEMANDE';
              const bgGradient = `linear-gradient(135deg, ${['#667eea', '#764ba2', '#f093fb', '#4facfe'][formations.indexOf(formation) % 4]} 0%, ${['#764ba2', '#f093fb', '#4facfe', '#667eea'][(formations.indexOf(formation) + 1) % 4]} 100%)`;

              return (
                <div
                  key={formation.id}
                  onClick={() => navigate(`/catalogue/${formation.id}`)}
                  className="group h-full overflow-hidden rounded-lg border border-gray-200 hover:border-primary hover:shadow-lg transition-all duration-200 bg-white cursor-pointer"
                >
                  {/* Header avec gradient - CLIQUABLE */}
                  <div
                    className="h-40 relative overflow-hidden"
                    style={{ background: bgGradient }}
                  >
                    {/* Badges en haut à droite (RM-102, RM-127) */}
                    <div className="absolute top-3 right-3 flex gap-2">
                      {formation.inclus_abonnement && (
                        <span className="bg-success/90 px-2 py-1 rounded text-xs font-medium text-white">
                          Inclus
                        </span>
                      )}
                      {formation.type_formation === 'PREMIUM' && (
                        <span className="bg-white/90 px-2 py-1 rounded text-xs font-medium text-gray-900">
                          Premium
                        </span>
                      )}
                      {isALaDemande && (
                        <span className="bg-white/90 px-2 py-1 rounded text-xs font-medium text-gray-900">
                          À la demande
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contenu */}
                  <div className="p-4 flex flex-col gap-3">
                    {/* Titre */}
                    <h3 className="text-base font-semibold text-gray-900 line-clamp-2 min-h-[3rem]">
                      {formation.titre}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-gray-600 line-clamp-2 min-h-[2.5rem]">
                      {formation.description}
                    </p>

                    {/* Infos */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 py-2 border-t">
                      <span>{formatDuration(formation.duree)}</span>
                      <span>•</span>
                      <span>{formation.pilier_abonnement || 'TOUS'}</span>
                    </div>

                    {/* Prix et bouton */}
                    <div className="pt-2 border-t space-y-2">
                      <div className="text-2xl font-bold text-primary">
                        {formatMoney(formation.tarif)}
                      </div>
                      <Button
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isALaDemande) {
                            handleAccederFormation(formation.id);
                          } else {
                            navigate(`/catalogue/${formation.id}`);
                          }
                        }}
                      >
                        {isALaDemande ? 'Accéder maintenant' : 'Voir les sessions'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {meta.totalPages > 1 && (
            <Pagination
              currentPage={meta.page}
              totalPages={meta.totalPages}
              onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
            />
          )}
        </>
      )}
    </div>
  );
}
