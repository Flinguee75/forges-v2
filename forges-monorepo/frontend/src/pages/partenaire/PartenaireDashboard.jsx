import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMesFormations, getPartenaireStats } from '../../api/partenaires.api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Icon from '../../components/ui/Icon';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import {
  FORMATION_VALIDATION_LABELS,
  PARTNER_DASHBOARD_COPY,
  REVERSEMENT_STATUS_LABELS,
  getPartnerLocale,
  resolvePartnerLanguage,
} from './i18n';

const formatMoney = (value) =>
  `${Math.round(Number(value || 0) / 100).toLocaleString('fr-FR')} FCFA`;

function ValidationBadge({ statut, language, unknownLabel }) {
  const labels = FORMATION_VALIDATION_LABELS[language] || FORMATION_VALIDATION_LABELS.FR;
  const config = {
    EN_ATTENTE: { variant: 'warning', label: labels.EN_ATTENTE },
    VALIDEE:    { variant: 'success', label: labels.VALIDEE },
    REJETEE:    { variant: 'danger',  label: labels.REJETEE },
    SUSPENDUE:  { variant: 'warning', label: labels.SUSPENDUE },
  }[statut] || { variant: 'gray', label: statut || unknownLabel };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

const STATUS_META = {
  VALIDEE:   { icon: 'checkCircle', color: 'text-green-600',  bg: 'bg-green-50',  bar: 'bg-green-500' },
  EN_ATTENTE:{ icon: 'clock',       color: 'text-amber-600',  bg: 'bg-amber-50',  bar: 'bg-amber-400' },
  REJETEE:   { icon: 'exclamationCircle', color: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-500' },
  SUSPENDUE: { icon: 'exclamationTriangle', color: 'text-gray-500', bg: 'bg-gray-50', bar: 'bg-gray-400' },
};

function KpiCard({ icon, title, value, hint, color, bg, onClick, actionLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-white p-5 text-left shadow-sm transition-all duration-200 hover:border-[var(--color-primary)] hover:shadow-md cursor-pointer w-full"
    >
      <div className="flex items-start justify-between">
        <div className={`rounded-lg p-2 ${bg}`}>
          <Icon name={icon} size={20} className={color} />
        </div>
        <Icon name="arrowRight" size={16} className="text-[var(--color-border)] transition-colors group-hover:text-[var(--color-primary)]" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-subtext)]">{title}</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-[var(--color-text)]">{value}</p>
      </div>
      {hint && <p className="text-xs text-[var(--color-subtext)]">{hint}</p>}
      {actionLabel && (
        <p className={`mt-auto text-xs font-medium ${color}`}>{actionLabel} →</p>
      )}
    </button>
  );
}

export default function PartenaireDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showError } = useToast();
  const { execute, isLoading } = useApi();
  const [dashboard, setDashboard] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loadingState, setLoadingState] = useState(true);
  const language = resolvePartnerLanguage(user?.langue_preferee);
  const locale = getPartnerLocale(language);
  const copy = PARTNER_DASHBOARD_COPY[language] || PARTNER_DASHBOARD_COPY.FR;

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoadingState(true);
      try {
        const [dashboardResult, pendingResult] = await Promise.all([
          execute(() => getPartenaireStats(), { showErrorToast: false }),
          execute(() => getMesFormations({ statut_validation: 'EN_ATTENTE', page: 1, limit: 1 }), { showErrorToast: false }),
        ]);
        if (!isMounted) return;
        setDashboard(dashboardResult);
        setPendingCount(pendingResult?.meta?.total || 0);
      } catch (error) {
        if (isMounted) showError(error?.message || copy.loadError);
      } finally {
        if (isMounted) setLoadingState(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [copy.loadError, execute, showError]);

  if (loadingState || isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-xl bg-white" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="h-48 animate-pulse rounded-xl bg-white" />
          <div className="h-48 animate-pulse rounded-xl bg-white" />
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <Card>
        <p className="text-[var(--color-subtext)]">{copy.empty}</p>
      </Card>
    );
  }

  const totalFormations      = Number(dashboard.stats?.total_formations || 0);
  const validatedFormations  = Number(dashboard.stats?.formations_validees || 0);
  const rejectedFormations   = Number(dashboard.stats?.formations_rejetees || 0);
  const suspendedFormations  = Number(dashboard.stats?.formations_suspendues || 0);
  const waitingFormations    = Math.max(0, pendingCount || totalFormations - validatedFormations - rejectedFormations - suspendedFormations);

  const formations   = dashboard.formations || [];
  const reversements = dashboard.reversements || [];

  const statusCounts = {
    VALIDEE:    validatedFormations,
    EN_ATTENTE: waitingFormations,
    REJETEE:    rejectedFormations,
    SUSPENDUE:  suspendedFormations,
  };
  const maxCount = Math.max(1, ...Object.values(statusCounts));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-primary)]/60">{copy.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--color-text)]">{copy.title}</h1>
        </div>
        <Button onClick={() => navigate('/partenaire/soumettre-formation')} className="shrink-0">
          {copy.quickSubmit}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon="checkCircle"
          title={copy.kpiActiveTitle}
          value={validatedFormations}
          hint={copy.kpiActiveHint}
          color="text-green-600"
          bg="bg-green-50"
          actionLabel={copy.kpiActiveAction}
          onClick={() => navigate('/partenaire/formations?statut_validation=VALIDEE')}
        />
        <KpiCard
          icon="clock"
          title={copy.kpiPendingTitle}
          value={waitingFormations}
          hint={copy.kpiPendingHint}
          color="text-amber-600"
          bg="bg-amber-50"
          actionLabel={copy.kpiPendingAction}
          onClick={() => navigate('/partenaire/formations?statut_validation=EN_ATTENTE')}
        />
        <KpiCard
          icon="document"
          title={copy.kpiDraftTitle}
          value={Math.max(0, totalFormations - validatedFormations - waitingFormations - rejectedFormations - suspendedFormations)}
          hint={copy.kpiDraftHint}
          color="text-[var(--color-subtext)]"
          bg="bg-gray-50"
          actionLabel={copy.kpiDraftAction}
          onClick={() => navigate('/partenaire/formations?statut=BROUILLON')}
        />
        <KpiCard
          icon="cash"
          title={copy.kpiPayoutTitle}
          value={formatMoney(dashboard.stats?.reversements_nets_mois)}
          hint={copy.kpiPayoutHint}
          color="text-[var(--color-primary)]"
          bg="bg-blue-50"
          actionLabel={copy.kpiPayoutAction}
          onClick={() => navigate('/partenaire/reversements')}
        />
      </div>

      {/* Répartition + Actions rapides */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">

        {/* Répartition validations */}
        <Card title={copy.validationsTitle}>
          <div className="space-y-3">
            {Object.entries(statusCounts).map(([statut, count]) => {
              const meta = STATUS_META[statut] || { icon: 'informationCircle', color: 'text-gray-500', bg: 'bg-gray-50', bar: 'bg-gray-300' };
              const labels = FORMATION_VALIDATION_LABELS[language] || FORMATION_VALIDATION_LABELS.FR;
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={statut} className="flex items-center gap-4">
                  <div className={`rounded-md p-1.5 ${meta.bg}`}>
                    <Icon name={meta.icon} size={16} className={meta.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[var(--color-text)]">
                        {labels[statut] || statut}
                      </span>
                      <span className="text-sm font-bold tabular-nums text-[var(--color-text)]">{count}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--color-border)]">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${meta.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Actions rapides */}
        <Card title={copy.quickActionsTitle}>
          <div className="space-y-2">
            <button
              data-testid="quick-action-submit"
              onClick={() => navigate('/partenaire/soumettre-formation')}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-primary)] bg-blue-50 px-4 py-3 text-left text-sm font-medium text-[var(--color-primary)] transition hover:bg-blue-100"
            >
              <Icon name="document" size={16} />
              {copy.quickSubmit}
            </button>
            <button
              onClick={() => navigate('/partenaire/formations')}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-border)] px-4 py-3 text-left text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-bg)]"
            >
              <Icon name="folder" size={16} />
              {copy.quickList}
            </button>
            <button
              onClick={() => navigate('/partenaire/reversements')}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-border)] px-4 py-3 text-left text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-bg)]"
            >
              <Icon name="cash" size={16} />
              {copy.quickPayouts}
            </button>
          </div>
        </Card>
      </div>

      {/* Formations récentes */}
      <Card title={copy.recentFormationsTitle}>
        {formations.length === 0 ? (
          <p className="text-sm text-[var(--color-subtext)]">{copy.noFormation}</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {formations.slice(0, 5).map((formation) => (
              <button
                key={formation.id}
                type="button"
                onClick={() => navigate(`/partenaire/formations/${formation.id}`)}
                className="flex w-full cursor-pointer items-center justify-between py-3 text-left transition hover:bg-[var(--color-bg)] px-2 -mx-2 rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--color-text)]">{formation.titre}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-subtext)]">
                    {copy.submittedOn}{' '}
                    {formation.date_soumission
                      ? new Date(formation.date_soumission).toLocaleDateString(locale)
                      : '-'}
                  </p>
                </div>
                <div className="ml-4 shrink-0">
                  <ValidationBadge statut={formation.statut_validation} language={language} unknownLabel={copy.unknown} />
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Reversements récents */}
      <Card title={copy.recentPayoutsTitle}>
        {reversements.length === 0 ? (
          <p className="text-sm text-[var(--color-subtext)]">{copy.noPayout}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-subtext)]">{copy.formationColumn}</th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-subtext)]">{copy.statusColumn}</th>
                  <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--color-subtext)]">{copy.netAmountColumn}</th>
                  <th className="pb-3 pl-4 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-subtext)]">{copy.dateColumn}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {reversements.slice(0, 5).map((reversement) => (
                  <tr key={reversement.id} className="hover:bg-[var(--color-bg)]">
                    <td className="py-3 pr-4 text-sm text-[var(--color-text)]">
                      {reversement.formation?.titre || '-'}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={reversement.statut_validation === 'REVERSEE' ? 'success' : 'info'}>
                        {(REVERSEMENT_STATUS_LABELS[language] || REVERSEMENT_STATUS_LABELS.FR)[reversement.statut_validation] || copy.unknown}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-right text-sm font-bold tabular-nums text-[var(--color-primary)]">
                      {formatMoney(reversement.montant_net)}
                    </td>
                    <td className="py-3 pl-4 text-sm text-[var(--color-subtext)]">
                      {reversement.date_validation
                        ? new Date(reversement.date_validation).toLocaleDateString(locale)
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
