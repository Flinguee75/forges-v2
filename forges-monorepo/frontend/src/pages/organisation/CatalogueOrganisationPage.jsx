import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formationsApi } from '../../api/formations.api';
import { organisationApi } from '../../api/espace-organisation.api';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';
import Pagination from '../../components/ui/Pagination';

const FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'B2B', label: 'Éligibles B2B' },
  { value: 'VOUCHERS', label: 'Avec vouchers' },
  { value: 'INSTITUTIONNEL', label: 'Institutionnelles' },
  { value: 'A_LA_DEMANDE', label: 'À la demande' },
  { value: 'PREMIUM', label: 'Premium' },
];

function formatMoney(amount) {
  return `${Math.round(Number(amount || 0) / 100).toLocaleString('fr-FR')} FCFA`;
}

function formatDuration(hours) {
  return `${hours || 0} h`;
}

function isB2BEligible(formation) {
  return ['B2B', 'TOUS'].includes(formation.pilier_abonnement);
}

function applyFilter(formations, filter) {
  if (!filter) return formations;
  if (filter === 'B2B') return formations.filter(isB2BEligible);
  if (filter === 'VOUCHERS') return formations.filter((formation) => formation.vouchers.length > 0);
  if (filter === 'INSTITUTIONNEL') {
    return formations.filter((formation) => ['INSTITUTIONNEL', 'TOUS'].includes(formation.pilier_abonnement));
  }
  if (filter === 'A_LA_DEMANDE') return formations.filter((formation) => formation.mode_formation === 'A_LA_DEMANDE');
  if (filter === 'PREMIUM') return formations.filter((formation) => formation.type_formation === 'PREMIUM');
  return formations;
}

function groupVouchersByFormation(vouchers) {
  return vouchers.reduce((acc, voucher) => {
    const formationId = voucher.formation?.id || voucher.formation_id;
    if (!formationId) return acc;
    if (!acc[formationId]) acc[formationId] = [];
    acc[formationId].push(voucher);
    return acc;
  }, {});
}

function getFormationBadges(formation) {
  const badges = [];
  if (isB2BEligible(formation)) badges.push({ label: 'B2B', className: 'bg-primary text-white' });
  if (formation.pilier_abonnement === 'INSTITUTIONNEL') badges.push({ label: 'Institutionnel', className: 'bg-warning text-white' });
  if (formation.pilier_abonnement === 'TOUS') badges.push({ label: 'Tous piliers', className: 'bg-secondary text-white' });
  if (formation.type_formation === 'PREMIUM') badges.push({ label: 'Premium', className: 'bg-info text-white' });
  if (formation.mode_formation === 'A_LA_DEMANDE') badges.push({ label: 'À la demande', className: 'bg-bg text-text border border-border' });
  return badges;
}

function FormationOrganisationCard({ formation, onOpen }) {
  const badges = getFormationBadges(formation);
  const activeVoucherCount = formation.vouchers.filter((voucher) => voucher.statut === 'ACTIF').length;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm">
      <div className="relative h-28 bg-primary">
        {formation.image_url ? (
          <img
            src={formation.image_url}
            alt={formation.titre}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#1B4F72_0%,#2E86C1_62%,#148F77_100%)]" />
        )}
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span key={badge.label} className={`rounded px-2 py-1 text-xs font-semibold ${badge.className}`}>
              {badge.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <h3 className="text-base font-semibold text-text">{formation.titre}</h3>
          <p className="mt-2 min-h-[2.5rem] text-sm leading-6 text-subtext">{formation.description}</p>
        </div>

        <dl className="grid grid-cols-3 gap-3 border-y border-border py-3 text-sm">
          <div>
            <dt className="text-xs uppercase text-subtext">Durée</dt>
            <dd className="mt-1 font-semibold text-text">{formatDuration(formation.duree)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-subtext">Tarif</dt>
            <dd className="mt-1 font-semibold text-text">{formatMoney(formation.tarif)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-subtext">Vouchers</dt>
            <dd className="mt-1 font-semibold text-text">{activeVoucherCount}</dd>
          </div>
        </dl>

        {formation.vouchers.length > 0 && (
          <div className="rounded-lg border border-border bg-bg p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-subtext">Vouchers liés</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {formation.vouchers.slice(0, 3).map((voucher) => (
                <span key={voucher.id || voucher.code} className="rounded border border-border bg-white px-2 py-1 text-xs font-medium text-primary">
                  {voucher.code}
                </span>
              ))}
              {formation.vouchers.length > 3 && (
                <span className="rounded border border-border bg-white px-2 py-1 text-xs text-subtext">
                  +{formation.vouchers.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-2">
          <Button className="flex-1" onClick={() => onOpen(formation.id)}>
            Voir la formation
          </Button>
          <Button variant="outline" onClick={() => onOpen(formation.id)}>
            Préparer inscription
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function CatalogueOrganisationPage() {
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const [formations, setFormations] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: '', page: 1, limit: 12 });
  const [typeFilter, setTypeFilter] = useState('');

  const loadCatalogue = async (nextPage = filters.page) => {
    const [catalogueResult, vouchersResult] = await Promise.all([
      execute(() => formationsApi.getCatalogue({
        page: nextPage,
        limit: filters.limit,
        search: filters.search || undefined,
      }), {}),
      execute(() => organisationApi.getVouchers(), {}).catch(() => ({ data: [] })),
    ]);

    const vouchers = Array.isArray(vouchersResult?.data)
      ? vouchersResult.data
      : Array.isArray(vouchersResult)
        ? vouchersResult
        : [];
    const vouchersByFormation = groupVouchersByFormation(vouchers);
    const data = Array.isArray(catalogueResult?.data) ? catalogueResult.data : [];

    setFormations(data.map((formation) => ({
      ...formation,
      vouchers: vouchersByFormation[formation.id] || [],
    })));
    setMeta(catalogueResult?.meta || { page: 1, totalPages: 1, total: 0 });
  };

  useEffect(() => {
    loadCatalogue(filters.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.search]);

  const displayed = useMemo(
    () => applyFilter(formations, typeFilter),
    [formations, typeFilter]
  );

  const stats = useMemo(() => ({
    total: formations.length,
    b2b: formations.filter(isB2BEligible).length,
    vouchers: formations.reduce((sum, formation) => sum + formation.vouchers.length, 0),
  }), [formations]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setFilters((current) => ({ ...current, page: 1 }));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-lg border border-border bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
          Catalogue organisation
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-text">Formations à planifier</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-subtext">
              Identifiez les formations ouvertes à vos collaborateurs, suivez les vouchers disponibles et préparez les inscriptions de votre organisation.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/organisation/vouchers')}>
            Gérer les vouchers
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-[0.22em] text-subtext">Catalogue</p>
          <p className="mt-2 text-2xl font-semibold text-text">{stats.total}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.22em] text-subtext">Éligibles B2B</p>
          <p className="mt-2 text-2xl font-semibold text-text">{stats.b2b}</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.22em] text-subtext">Vouchers disponibles</p>
          <p className="mt-2 text-2xl font-semibold text-text">{stats.vouchers}</p>
        </Card>
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

        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTypeFilter(value)}
              className={`rounded-full border px-4 py-1 text-sm font-medium transition-colors ${
                typeFilter === value
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-white text-subtext hover:border-primary hover:text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {isLoading && formations.length === 0 ? (
        <div className="flex justify-center py-12">
          <Spinner size="large" />
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          title="Aucune formation trouvée"
          message={typeFilter ? 'Aucune formation ne correspond à ce filtre.' : 'Aucun résultat ne correspond à votre recherche.'}
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
          <p className="text-sm text-subtext">
            {displayed.length} formation{displayed.length > 1 ? 's' : ''} affichée{displayed.length > 1 ? 's' : ''}
          </p>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {displayed.map((formation) => (
              <FormationOrganisationCard
                key={formation.id}
                formation={formation}
                onOpen={(id) => navigate(`/organisation/formations/${id}`)}
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
