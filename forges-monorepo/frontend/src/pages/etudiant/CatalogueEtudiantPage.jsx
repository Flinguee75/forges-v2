import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { formationsApi } from '../../api/formations.api';
import { etudiantApi } from '../../api/espace-etudiant.api';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';
import FormationMarketplaceCard from '../../components/catalogue/FormationMarketplaceCard';

/**
 * CatalogueEtudiantPage - Catalogue des formations pour l'espace apprenant
 * Route: /apprenant/catalogue
 * Référence: Section 17.3 migration apprenant
 */
export default function CatalogueEtudiantPage() {
  const [formations, setFormations] = useState([]);
  const [enrollments, setEnrollments] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    niveau: '',
    statut: 'PUBLIEE',
    page: 1,
    limit: 9,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
  });

  const { execute, isLoading } = useApi();

  const loadFormations = async () => {
    const result = await execute(async () => {
      const [formationsData, dossiersResponse] = await Promise.all([
        formationsApi.getCatalogue({
          page: filters.page,
          limit: filters.limit,
          search: filters.search || undefined,
        }),
        etudiantApi.getMesDossiers({ limit: 100 }).catch(() => ({ data: [] })),
      ]);

      return { formationsData, dossiersResponse };
    }, {
      onSuccess: ({ formationsData, dossiersResponse }) => {
        const dossiers = Array.isArray(dossiersResponse?.data)
          ? dossiersResponse.data
          : Array.isArray(dossiersResponse?.dossiers)
            ? dossiersResponse.dossiers
            : [];

        const enrollmentMap = dossiers.reduce((acc, dossier) => {
          if (!dossier?.formation?.id) return acc;

          const attestationAvailable = dossier.statut === 'PAYE' && dossier.session?.statut === 'CLOTUREE';
          acc[dossier.formation.id] = {
            dossierId: dossier.id,
            isEnrolled: true,
            attestationAvailable,
          };
          return acc;
        }, {});

        setEnrollments(enrollmentMap);
        setFormations(formationsData.data || []);
        setPagination({
          total: formationsData.meta?.total || 0,
          totalPages: formationsData.meta?.totalPages || 0,
          currentPage: formationsData.meta?.page || 1,
        });
      },
    });

    return result;
  };

  useEffect(() => {
    loadFormations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters({ ...filters, page: 1 });
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-primary">Catalogue des Formations</h1>
        <p className="mt-2 text-subtext">
          Découvrez nos formations et inscrivez-vous aux sessions disponibles
        </p>
      </div>

      <div className="mb-6 rounded-lg bg-white p-4 shadow">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[250px]">
            <input
              type="text"
              placeholder="Rechercher une formation..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full rounded-lg border border-border px-4 py-2 focus:border-primary focus:outline-none"
            />
          </div>
          <div className="min-w-[150px]">
            <select
              value={filters.niveau}
              onChange={(e) =>
                setFilters({ ...filters, niveau: e.target.value, page: 1 })
              }
              className="w-full rounded-lg border border-border px-3 py-2 focus:border-primary focus:outline-none"
            >
              <option value="">Tous les niveaux</option>
              <option value="DEBUTANT">Débutant</option>
              <option value="INTERMEDIAIRE">Intermédiaire</option>
              <option value="AVANCE">Avancé</option>
            </select>
          </div>
          <Button type="submit" variant="primary">
            Rechercher
          </Button>
        </form>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="large" />
        </div>
      ) : formations.length === 0 ? (
        <EmptyState
          title="Aucune formation trouvée"
          message="Aucune formation ne correspond à vos critères de recherche."
        />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {formations.map((formation) => (
              <FormationMarketplaceCard
                key={formation.id}
                formation={{
                  ...formation,
                  enrollment: enrollments[formation.id] || null,
                }}
                context="apprenant"
              />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={(page) => setFilters({ ...filters, page })}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
