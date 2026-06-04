import { useState, useEffect } from 'react';
import { formationsApi } from '../../api/formations.api';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/feedback/EmptyState';
import Spinner from '../../components/feedback/Spinner';
import Pagination from '../../components/ui/Pagination';
import FormationMarketplaceCard from '../../components/catalogue/FormationMarketplaceCard';
import { useSEO, getCatalogSchema } from '../../hooks/useSEO';

/**
 * CataloguePage - Page publique affichant le catalogue des formations
 * Référence: CLAUDE.md section 17 - Étape F-5
 */
export default function CataloguePage() {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [formations, setFormations] = useState([]);
  const [pagination, setPagination] = useState(null);

  const { execute, isLoading, error } = useApi();

  useSEO({
    title: 'Catalogue des formations certifiantes — FORGES',
    description: 'Toutes les formations certifiantes en cybersecurite, IA, data science et transformation digitale. Filtrez par format, duree et prix. Abidjan, Cote d\'Ivoire.',
    keywords: 'catalogue formations certifiantes, cybersecurite, intelligence artificielle, data science, bootcamp Abidjan, formation en ligne Afrique',
    canonical: 'https://edu.forges-group.com/catalogue',
    ogImage: 'https://edu.forges-group.com/logo_forges.png',
    schema: getCatalogSchema(formations),
  });

  const loadFormations = async (page = 1, searchTerm = '') => {
    await execute(
      () =>
        formationsApi.getCatalogue({
          page,
          limit: 12,
          search: searchTerm || undefined,
        }),
      {
        onSuccess: (data) => {
          setFormations(data.data || []);
          setPagination(data.meta || null);
          document.dispatchEvent(new Event('prerender-ready'));
        },
      }
    );
  };

  useEffect(() => {
    loadFormations(currentPage, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadFormations(1, search);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-bg py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Catalogue des formations
          </h1>
          <p className="text-subtext">
            Découvrez nos formations et inscrivez-vous dès maintenant
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Rechercher une formation par titre ou description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" variant="primary" loading={isLoading}>
              Rechercher
            </Button>
          </form>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Spinner size="large" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <EmptyState
            type="error"
            title="Erreur de chargement"
            message={error}
            action={
              <Button
                variant="primary"
                onClick={() => loadFormations(currentPage, search)}
              >
                Réessayer
              </Button>
            }
          />
        )}

        {/* Empty State */}
        {!isLoading && !error && formations.length === 0 && (
          <EmptyState
            type="empty"
            title="Aucune formation disponible"
            message={
              search
                ? `Aucune formation ne correspond à votre recherche "${search}".`
                : "Aucune formation n'est actuellement disponible dans le catalogue."
            }
            action={
              search && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch('');
                    setCurrentPage(1);
                    loadFormations(1, '');
                  }}
                >
                  Réinitialiser la recherche
                </Button>
              )
            }
          />
        )}

        {/* Formations Grid */}
        {!isLoading && !error && formations.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4 mb-8">
              {formations.map((formation) => (
                <FormationMarketplaceCard key={formation.id} formation={formation} />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
