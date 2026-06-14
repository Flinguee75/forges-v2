import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formationsApi } from '../../api/formations.api';
import { useApi } from '../../hooks/useApi';
import EmptyState from '../../components/feedback/EmptyState';
import Spinner from '../../components/feedback/Spinner';
import Pagination from '../../components/ui/Pagination';
import FormationMarketplaceCard from '../../components/catalogue/FormationMarketplaceCard';
import { useSEO, getCatalogSchema } from '../../hooks/useSEO';

const MODE_FILTERS = [
  { value: '', label: 'Tous les formats' },
  { value: 'EN_LIGNE', label: 'En ligne' },
  { value: 'PRESENTIEL', label: 'Presentiel' },
  { value: 'A_LA_DEMANDE', label: 'A la demande' },
];

function applyFilters(formations, { mode, certOnly }) {
  return formations.filter((f) => {
    if (mode && f.mode_formation !== mode) return false;
    if (certOnly && !f.certification_delivree) return false;
    return true;
  });
}

export default function CataloguePage() {
  const [search, setSearch] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [formations, setFormations] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [modeFilter, setModeFilter] = useState('');
  const [certOnly, setCertOnly] = useState(false);

  const { execute, isLoading, error } = useApi();

  useSEO({
    title: 'Catalogue des formations certifiantes — FORGES',
    description: "Toutes les formations certifiantes en cybersecurite, IA, data science et transformation digitale. Filtrez par format, duree et prix. Abidjan, Cote d'Ivoire.",
    keywords: 'catalogue formations certifiantes, cybersecurite, intelligence artificielle, data science, bootcamp Abidjan, formation en ligne Afrique',
    canonical: 'https://edu.forges-group.com/catalogue',
    ogImage: 'https://edu.forges-group.com/logo_forges.png',
    schema: getCatalogSchema(formations),
  });

  const loadFormations = useCallback(async (page = 1, searchTerm = '') => {
    await execute(
      () => formationsApi.getCatalogue({ page, limit: 24, search: searchTerm || undefined }),
      {
        onSuccess: (data) => {
          setFormations(data.data || []);
          setPagination(data.meta || null);
          document.dispatchEvent(new Event('prerender-ready'));
        },
        onError: () => {
          document.dispatchEvent(new Event('prerender-ready'));
        },
      }
    );
  }, [execute]);

  useEffect(() => {
    loadFormations(currentPage, search);
  }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    setSearch(draftSearch);
    loadFormations(1, draftSearch);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const displayed = applyFilters(formations, { mode: modeFilter, certOnly });
  const activeFiltersCount = (modeFilter ? 1 : 0) + (certOnly ? 1 : 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── Hero avec recherche intégrée ─────────────────────────────────── */}
      <div className="bg-primary">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/50 mb-3">
            Catalogue FORGES
          </p>
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl leading-tight">
            Formations certifiantes
          </h1>
          <p className="mt-3 text-base text-white/70 max-w-xl mx-auto">
            Trouvez la formation qui correspond a vos objectifs professionnels.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="mt-8 flex gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={draftSearch}
                onChange={(e) => setDraftSearch(e.target.value)}
                placeholder="Cybersecurite, IA, Data Science..."
                className="w-full rounded-lg border-0 bg-white py-3 pl-9 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-shrink-0 rounded-lg bg-secondary px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1a6fa8] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary disabled:opacity-60"
            >
              {isLoading ? 'Recherche...' : 'Rechercher'}
            </button>
          </form>
        </div>
      </div>

      {/* ── Barre de filtres ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3 py-3">

            {/* Mode filter chips */}
            <div className="flex flex-wrap gap-2">
              {MODE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setModeFilter(f.value)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-1 ${
                    modeFilter === f.value
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="hidden h-5 w-px bg-gray-200 sm:block" />

            {/* Certifiantes toggle */}
            <button
              type="button"
              onClick={() => setCertOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-1 ${
                certOnly
                  ? 'border-secondary bg-secondary/10 text-secondary'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-secondary hover:text-secondary'
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Certifiantes uniquement
            </button>

            {/* Reset filters */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={() => { setModeFilter(''); setCertOnly(false); }}
                className="ml-auto text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
              >
                Reinitialiser ({activeFiltersCount})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Contenu principal ────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Loader initial */}
        {isLoading && formations.length === 0 && (
          <div className="flex justify-center py-20">
            <Spinner size="large" />
          </div>
        )}

        {/* Erreur */}
        {error && !isLoading && (
          <EmptyState
            type="error"
            title="Erreur de chargement"
            message={error}
            action={
              <button
                type="button"
                onClick={() => loadFormations(currentPage, search)}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-[#154360]"
              >
                Reessayer
              </button>
            }
          />
        )}

        {/* Résultats */}
        {!error && formations.length > 0 && (
          <>
            {/* Compteur + breadcrumb de recherche */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {isLoading ? (
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                ) : (
                  <p className="text-sm font-medium text-gray-600">
                    <span className="font-bold text-gray-900">{displayed.length}</span>
                    {' '}formation{displayed.length > 1 ? 's' : ''}
                    {search && (
                      <span className="text-gray-400"> pour &ldquo;{search}&rdquo;</span>
                    )}
                  </p>
                )}
                {search && (
                  <button
                    type="button"
                    onClick={() => { setDraftSearch(''); setSearch(''); setCurrentPage(1); loadFormations(1, ''); }}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500 hover:bg-gray-200 transition-colors"
                  >
                    {search}
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <Link
                to="/register/etudiant"
                className="hidden text-xs font-semibold text-secondary hover:underline sm:block"
              >
                Creer un compte gratuit &rarr;
              </Link>
            </div>

            {/* Grille formations */}
            {displayed.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {displayed.map((formation) => (
                  <FormationMarketplaceCard key={formation.id} formation={formation} />
                ))}
              </div>
            ) : (
              /* Empty state après filtre */
              <div className="rounded-xl border border-gray-200 bg-white py-14 text-center">
                <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-4 text-sm font-medium text-gray-500">
                  Aucune formation ne correspond a ces filtres.
                </p>
                <button
                  type="button"
                  onClick={() => { setModeFilter(''); setCertOnly(false); }}
                  className="mt-3 text-sm font-semibold text-secondary hover:underline"
                >
                  Supprimer les filtres
                </button>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-10 flex justify-center">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}

        {/* Empty state sans résultat du tout */}
        {!isLoading && !error && formations.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="mt-4 font-semibold text-gray-600">
              {search
                ? `Aucune formation pour "${search}".`
                : 'Aucune formation disponible pour le moment.'}
            </p>
            {search && (
              <button
                type="button"
                onClick={() => { setDraftSearch(''); setSearch(''); setCurrentPage(1); loadFormations(1, ''); }}
                className="mt-3 text-sm font-semibold text-secondary hover:underline"
              >
                Reinitialiser la recherche
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
