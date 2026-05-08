import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formationsApi } from '../../api/formations.api';
import apprenantApi from '../../api/espace-apprenant.api';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';

function formatMoney(amount) {
  return `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;
}

function formatDuration(hours) {
  return `${hours || 0} h`;
}

// Pilier → badge affiché sur la carte
const PILIER_BADGE = {
  B2B: { label: 'Employeur', className: 'bg-blue-600/90 text-white' },
  INSTITUTIONNEL: { label: 'Institution', className: 'bg-amber-500/90 text-white' },
};

// Filtres en haut du catalogue
const TYPE_FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'INCLUS', label: 'Incluses abonnement' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'A_LA_DEMANDE', label: 'À la demande' },
  { value: 'B2B', label: 'Via employeur' },
  { value: 'INSTITUTIONNEL', label: 'Institutionnelles' },
];

function applyTypeFilter(formations, typeFilter) {
  if (!typeFilter) return formations;
  if (typeFilter === 'A_LA_DEMANDE') return formations.filter((f) => f.mode_formation === 'A_LA_DEMANDE');
  if (typeFilter === 'INCLUS') return formations.filter((f) => f.inclus_abonnement);
  if (typeFilter === 'PREMIUM') return formations.filter((f) => f.type_formation === 'PREMIUM');
  if (typeFilter === 'B2B') return formations.filter((f) => ['B2B', 'TOUS'].includes(f.pilier_abonnement));
  if (typeFilter === 'INSTITUTIONNEL') return formations.filter((f) => ['INSTITUTIONNEL', 'TOUS'].includes(f.pilier_abonnement));
  return formations;
}

function FormationCard({ formation, index, onAcceder, onInscrire }) {
  const isALaDemande = formation.mode_formation === 'A_LA_DEMANDE';
  const pilierBadge = PILIER_BADGE[formation.pilier_abonnement];
  const isOrgFunded = ['B2B', 'INSTITUTIONNEL'].includes(formation.pilier_abonnement)
    || (formation.pilier_abonnement === 'TOUS');
  const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe'];
  const bgGradient = `linear-gradient(135deg, ${colors[index % 4]} 0%, ${colors[(index + 1) % 4]} 100%)`;

  return (
    <div
      onClick={() => isALaDemande ? onAcceder(formation.id) : onInscrire(formation.id)}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white cursor-pointer transition-all duration-200 hover:border-primary hover:shadow-lg"
    >
      {/* Header image ou gradient */}
      <div className="relative h-40 overflow-hidden flex-shrink-0" style={formation.image_url ? {} : { background: bgGradient }}>
        {formation.image_url && (
          <img
            src={formation.image_url}
            alt={formation.titre}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {!formation.image_url && (
          <div className="absolute inset-0" style={{ background: bgGradient }} />
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {/* Pilier badge — mis en avant à gauche */}
          {pilierBadge && (
            <span className={`px-2 py-1 rounded text-xs font-semibold ${pilierBadge.className}`}>
              {pilierBadge.label}
            </span>
          )}
          {formation.pilier_abonnement === 'TOUS' && (
            <span className="bg-blue-600/90 px-2 py-1 rounded text-xs font-semibold text-white">
              Employeur
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3 flex flex-wrap gap-1.5 justify-end">
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

        {/* Bandeau "gratuit via org" en bas du header */}
        {isOrgFunded && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-3 py-1.5">
            <p className="text-xs font-semibold text-white">
              Gratuit si votre organisation est partenaire FORGES
            </p>
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="text-base font-semibold text-gray-900 line-clamp-2 min-h-[3rem]">
          {formation.titre}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-2 min-h-[2.5rem]">
          {formation.description}
        </p>
        <div className="flex items-center gap-3 border-t py-2 text-xs text-gray-500">
          <span>{formatDuration(formation.duree)}</span>
          <span>•</span>
          <span>{formation.categorie || formation.pilier_abonnement || 'Tous publics'}</span>
        </div>
        <div className="mt-auto space-y-2 border-t pt-2">
          <div className="text-2xl font-bold text-primary">
            {isOrgFunded
              ? <span className="text-success text-lg font-bold">Gratuit via organisation</span>
              : formatMoney(formation.tarif)
            }
          </div>
          <Button
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              if (isALaDemande) onAcceder(formation.id);
              else onInscrire(formation.id);
            }}
          >
            {isALaDemande ? 'Accéder maintenant' : 'Voir les sessions'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CatalogueApprenantPage() {
  const navigate = useNavigate();
  const [formations, setFormations] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', page: 1, limit: 12 });
  const [typeFilter, setTypeFilter] = useState('');
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
        onSuccess: (acces) => navigate(`/apprenant/formations-a-la-demande/${acces.id}`),
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

  const displayed = applyTypeFilter(formations, typeFilter);

  // Formations organismes (B2B + INSTITUTIONNEL + TOUS) pour le callout
  const orgFormations = formations.filter((f) =>
    ['B2B', 'INSTITUTIONNEL', 'TOUS'].includes(f.pilier_abonnement)
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">

      {/* Header */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
          Catalogue apprenant
        </p>
        <h1 className="mt-3 text-3xl font-bold text-text">
          Formations disponibles
        </h1>
        <p className="mt-2 text-sm text-subtext">
          Parcourez les formations certifiantes et inscrivez-vous aux sessions disponibles.
        </p>
      </div>

      {/* Callout organisations — affiché seulement si des formations B2B/institutionnelles existent */}
      {orgFormations.length > 0 && !typeFilter && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
              <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-blue-900">
                {orgFormations.length} formation{orgFormations.length > 1 ? 's' : ''} potentiellement gratuites pour vous
              </p>
              <p className="mt-0.5 text-sm text-blue-700">
                Votre employeur ou votre institution est peut-être partenaire FORGES.
                Si c'est le cas, ces formations sont prises en charge — aucun paiement de votre part.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTypeFilter('B2B')}
            className="flex-shrink-0 rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors"
          >
            Voir ces formations
          </button>
        </div>
      )}

      {/* Filtres */}
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
        <div className="mt-4 flex flex-wrap gap-2">
          {TYPE_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTypeFilter(value)}
              className={`rounded-full border px-4 py-1 text-sm font-medium transition-colors ${
                typeFilter === value
                  ? value === 'B2B' || value === 'INSTITUTIONNEL'
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-primary bg-primary text-white'
                  : 'border-border bg-white text-subtext hover:border-primary hover:text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Grille */}
      {isLoading && formations.length === 0 ? (
        <div className="flex justify-center py-12">
          <Spinner size="large" />
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          title="Aucune formation trouvée"
          message={typeFilter ? 'Aucune formation dans cette catégorie.' : 'Aucun résultat ne correspond à votre recherche.'}
          action={(
            <Button variant="outline" onClick={() => {
              setTypeFilter('');
              setFilters({ search: '', page: 1, limit: 12 });
            }}>
              Réinitialiser les filtres
            </Button>
          )}
        />
      ) : (
        <>
          {/* Compteur contextuel */}
          <p className="text-sm text-subtext">
            {displayed.length} formation{displayed.length > 1 ? 's' : ''}
            {typeFilter === 'B2B' && ' couvertes par votre employeur'}
            {typeFilter === 'INSTITUTIONNEL' && ' institutionnelles'}
            {typeFilter === 'INCLUS' && ' incluses dans votre abonnement'}
            {typeFilter === 'PREMIUM' && ' Premium exclusives'}
          </p>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {displayed.map((formation, index) => (
              <FormationCard
                key={formation.id}
                formation={formation}
                index={index}
                onAcceder={handleAccederFormation}
                onInscrire={(id) => navigate(`/apprenant/inscrire/${id}`)}
              />
            ))}
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
