import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMesFormations } from '../../api/partenaires.api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import {
  FORMATION_STATUS_LABELS,
  FORMATION_VALIDATION_LABELS,
  PARTNER_FORMATIONS_COPY,
  getPartnerLocale,
  resolvePartnerLanguage,
} from './i18n';

const formatMoney = (value) => `${Math.round(Number(value || 0) / 100).toLocaleString('fr-FR')} FCFA`;

function ValidationBadge({ statut, language, unknownLabel }) {
  const labels = FORMATION_VALIDATION_LABELS[language] || FORMATION_VALIDATION_LABELS.FR;
  const config = {
    EN_ATTENTE: { variant: 'warning', label: labels.EN_ATTENTE },
    VALIDEE: { variant: 'success', label: labels.VALIDEE },
    REJETEE: { variant: 'danger', label: labels.REJETEE },
    SUSPENDUE: { variant: 'warning', label: labels.SUSPENDUE },
  }[statut] || { variant: 'gray', label: statut || unknownLabel };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function FormationStatusBadge({ statut, language, unknownLabel }) {
  const labels = FORMATION_STATUS_LABELS[language] || FORMATION_STATUS_LABELS.FR;
  const config = {
    BROUILLON: { variant: 'gray', label: labels.BROUILLON },
    EN_ATTENTE_VALIDATION: { variant: 'warning', label: labels.EN_ATTENTE_VALIDATION },
    ACTIVE: { variant: 'success', label: labels.ACTIVE },
    REJETEE: { variant: 'danger', label: labels.REJETEE },
    SUSPENDUE: { variant: 'warning', label: labels.SUSPENDUE },
  }[statut] || { variant: 'gray', label: statut || unknownLabel };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function MesFormations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showError } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { execute, isLoading } = useApi();
  const language = resolvePartnerLanguage(user?.langue_preferee);
  const locale = getPartnerLocale(language);
  const copy = PARTNER_FORMATIONS_COPY[language] || PARTNER_FORMATIONS_COPY.FR;

  const [formations, setFormations] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [filtres, setFiltres] = useState({
    statut_validation: searchParams.get('statut_validation') || '',
    statut: searchParams.get('statut') || '',
    search: searchParams.get('search') || '',
  });

  useEffect(() => {
    let isMounted = true;

    const loadFormations = async () => {
      try {
        const result = await execute(
          () => getMesFormations(filtres),
          { showErrorToast: false }
        );

        if (!isMounted) return;

        setFormations(result?.data || []);
        setMeta(result?.meta || { total: 0, page: 1, limit: 20, totalPages: 0 });
      } catch (error) {
        if (isMounted) {
          showError(error?.message || copy.loadError);
        }
      }
    };

    loadFormations();
    return () => {
      isMounted = false;
    };
  }, [copy.loadError, execute, filtres, showError]);

  const updateFilter = (key, value) => {
    const next = { ...filtres, [key]: value };
    setFiltres(next);

    const params = {};
    if (next.statut_validation) params.statut_validation = next.statut_validation;
    if (next.statut) params.statut = next.statut;
    if (next.search) params.search = next.search;
    setSearchParams(params);
  };

  const getMessageStatut = (formation) => {
    if (formation.statut === 'EN_ATTENTE_VALIDATION') {
      return {
        type: 'info',
        title: copy.underReviewTitle,
        message: copy.underReviewBody,
      };
    }

    if (formation.statut_validation === 'REJETEE') {
      return {
        type: 'danger',
        title: copy.rejectedTitle,
        message: formation.motif_rejet || copy.rejectedBody,
      };
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-[var(--color-border)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--color-partenaire)]">
              {copy.eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[var(--color-text)]">
              {copy.title}
            </h1>
            <p className="mt-2 text-[var(--color-subtext)]">
              {meta.total} {meta.total > 1 ? copy.totalSuffixPlural : copy.totalSuffixSingle}
            </p>
          </div>

          <Button onClick={() => navigate('/partenaire/soumettre-formation')} variant="primary">
            {copy.submit}
          </Button>
        </div>
      </div>

      <Card title={copy.filtersTitle}>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.search}</label>
            <input
              type="text"
              value={filtres.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-partenaire)]"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.validation}</label>
            <select
              value={filtres.statut_validation}
              onChange={(e) => updateFilter('statut_validation', e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-partenaire)]"
            >
              <option value="">{copy.all}</option>
              <option value="EN_ATTENTE">{(FORMATION_VALIDATION_LABELS[language] || FORMATION_VALIDATION_LABELS.FR).EN_ATTENTE}</option>
              <option value="VALIDEE">{(FORMATION_VALIDATION_LABELS[language] || FORMATION_VALIDATION_LABELS.FR).VALIDEE}</option>
              <option value="REJETEE">{(FORMATION_VALIDATION_LABELS[language] || FORMATION_VALIDATION_LABELS.FR).REJETEE}</option>
              <option value="SUSPENDUE">{(FORMATION_VALIDATION_LABELS[language] || FORMATION_VALIDATION_LABELS.FR).SUSPENDUE}</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.status}</label>
            <select
              value={filtres.statut}
              onChange={(e) => updateFilter('statut', e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-partenaire)]"
            >
              <option value="">{copy.all}</option>
              <option value="BROUILLON">{(FORMATION_STATUS_LABELS[language] || FORMATION_STATUS_LABELS.FR).BROUILLON}</option>
              <option value="EN_ATTENTE_VALIDATION">{(FORMATION_STATUS_LABELS[language] || FORMATION_STATUS_LABELS.FR).EN_ATTENTE_VALIDATION}</option>
              <option value="ACTIVE">{(FORMATION_STATUS_LABELS[language] || FORMATION_STATUS_LABELS.FR).ACTIVE}</option>
              <option value="REJETEE">{(FORMATION_STATUS_LABELS[language] || FORMATION_STATUS_LABELS.FR).REJETEE}</option>
              <option value="SUSPENDUE">{(FORMATION_STATUS_LABELS[language] || FORMATION_STATUS_LABELS.FR).SUSPENDUE}</option>
            </select>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Card>
          <div className="space-y-3">
            <div className="h-5 w-48 animate-pulse rounded bg-[var(--color-border)]" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-border)]" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--color-border)]" />
          </div>
        </Card>
      ) : formations.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <h3 className="text-xl font-semibold text-[var(--color-text)]">{copy.emptyTitle}</h3>
            <p className="mt-2 text-sm text-[var(--color-subtext)]">
              {filtres.search || filtres.statut || filtres.statut_validation
                ? copy.emptyFiltered
                : copy.emptyDefault}
            </p>
            {!filtres.search && !filtres.statut && !filtres.statut_validation && (
              <Button className="mt-6" variant="outline" onClick={() => navigate('/partenaire/soumettre-formation')}>
                {copy.createFirst}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {formations.map((formation) => {
            const messageStatut = getMessageStatut(formation);

            return (
              <Card
                key={formation.id}
                className="transition hover:border-[var(--color-partenaire)]"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/partenaire/formations/${formation.id}`)}
                  className="w-full text-left"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-semibold text-[var(--color-text)]">{formation.titre}</h2>
                        <ValidationBadge statut={formation.statut_validation} language={language} unknownLabel={copy.unknown} />
                        <FormationStatusBadge statut={formation.statut} language={language} unknownLabel={copy.unknown} />
                      </div>

                      <p className="line-clamp-2 text-sm text-[var(--color-subtext)]">{formation.description}</p>

                      <div className="grid gap-3 text-sm text-[var(--color-subtext)] md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <span className="font-medium text-[var(--color-text)]">{copy.domain} :</span> {formation.domaine}
                        </div>
                        <div>
                          <span className="font-medium text-[var(--color-text)]">{copy.duration} :</span> {formation.duree} h
                        </div>
                        <div>
                          <span className="font-medium text-[var(--color-text)]">{copy.costPrice} :</span> {formatMoney(formation.prix_coutant)}
                        </div>
                        <div>
                          <span className="font-medium text-[var(--color-text)]">{copy.mode} :</span>{' '}
                          {formation.mode_formation === 'AVEC_SESSION' ? copy.withSession : copy.onDemand}
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-[var(--color-subtext)]">
                      <div>{copy.submittedOn}</div>
                      <div className="font-medium text-[var(--color-text)]">
                        {formation.date_soumission ? new Date(formation.date_soumission).toLocaleDateString(locale) : '-'}
                      </div>
                    </div>
                  </div>
                </button>

                {messageStatut && (
                  <div
                    className={`mt-4 rounded-lg border px-4 py-3 ${
                      messageStatut.type === 'danger'
                        ? 'border-red-200 bg-red-50 text-red-800'
                        : 'border-blue-200 bg-blue-50 text-blue-800'
                    }`}
                  >
                    <div className="font-semibold">{messageStatut.title}</div>
                    <p className="mt-1 text-sm">{messageStatut.message}</p>
                    {formation.statut_validation === 'REJETEE' && formation.corrections_suggerees && (
                      <p className="mt-2 whitespace-pre-line text-sm">
                        {copy.suggestedFixes} : {formation.corrections_suggerees}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
