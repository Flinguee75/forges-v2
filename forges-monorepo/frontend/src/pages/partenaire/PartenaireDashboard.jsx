import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMesFormations, getPartenaireStats } from '../../api/partenaires.api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
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

function KpiCard({ title, value, hint, tone = 'primary', actionLabel, onAction }) {
  const toneClasses = {
    primary: 'border-[var(--color-partenaire)] text-[var(--color-partenaire)]',
    warning: 'border-[var(--color-warning)] text-[var(--color-warning)]',
    success: 'border-[var(--color-success)] text-[var(--color-success)]',
    neutral: 'border-[var(--color-border)] text-[var(--color-text)]',
  };

  return (
    <Card className={`border-l-4 ${toneClasses[tone]}`}>
      <div className="text-sm font-medium text-[var(--color-subtext)]">{title}</div>
      <div className="mt-3 text-3xl font-bold">{value}</div>
      {hint && <p className="mt-2 text-sm text-[var(--color-subtext)]">{hint}</p>}
      {onAction && (
        <div className="mt-4">
          <Button variant="outline" size="small" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </Card>
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
          execute(() => getMesFormations({ statut_validation: 'EN_ATTENTE', page: 1, limit: 1 }), {
            showErrorToast: false,
          }),
        ]);

        if (!isMounted) return;

        setDashboard(dashboardResult);
        setPendingCount(pendingResult?.meta?.total || 0);
      } catch (error) {
        if (isMounted) {
          showError(error?.message || copy.loadError);
        }
      } finally {
        if (isMounted) setLoadingState(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [copy.loadError, execute, showError]);

  if (loadingState || isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-[var(--color-border)]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="h-32 animate-pulse rounded-lg bg-white" />
          <div className="h-32 animate-pulse rounded-lg bg-white" />
          <div className="h-32 animate-pulse rounded-lg bg-white" />
          <div className="h-32 animate-pulse rounded-lg bg-white" />
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <Card>
        <p className="text-[var(--color-subtext)]">
          {copy.empty}
        </p>
      </Card>
    );
  }

  const totalFormations = Number(dashboard.stats?.total_formations || 0);
  const validatedFormations = Number(dashboard.stats?.formations_validees || 0);
  const rejectedFormations = Number(dashboard.stats?.formations_rejetees || 0);
  const suspendedFormations = Number(dashboard.stats?.formations_suspendues || 0);
  const waitingFormations = Math.max(0, pendingCount || totalFormations - validatedFormations - rejectedFormations - suspendedFormations);

  const formations = dashboard.formations || [];
  const reversements = dashboard.reversements || [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-[#fff6ef] via-white to-[#fff2e7] p-6 border border-[#f3d0b9]">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--color-partenaire)]">
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--color-text)]">
          {copy.title}
        </h1>
        <p className="mt-2 max-w-3xl text-[var(--color-subtext)]">
          {copy.description}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={copy.kpiActiveTitle}
          value={validatedFormations}
          hint={copy.kpiActiveHint}
          tone="primary"
          actionLabel={copy.kpiActiveAction}
          onAction={() => navigate('/partenaire/formations?statut_validation=VALIDEE')}
        />
        <KpiCard
          title={copy.kpiPendingTitle}
          value={waitingFormations}
          hint={copy.kpiPendingHint}
          tone="warning"
          actionLabel={copy.kpiPendingAction}
          onAction={() => navigate('/partenaire/formations?statut_validation=EN_ATTENTE')}
        />
        <KpiCard
          title={copy.kpiDraftTitle}
          value={Math.max(0, totalFormations - validatedFormations - waitingFormations - rejectedFormations - suspendedFormations)}
          hint={copy.kpiDraftHint}
          tone="neutral"
          actionLabel={copy.kpiDraftAction}
          onAction={() => navigate('/partenaire/formations?statut=BROUILLON')}
        />
        <KpiCard
          title={copy.kpiPayoutTitle}
          value={formatMoney(dashboard.stats?.reversements_nets_mois)}
          hint={copy.kpiPayoutHint}
          tone="success"
          actionLabel={copy.kpiPayoutAction}
          onAction={() => navigate('/partenaire/reversements')}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card title={copy.validationsTitle} bodyClassName="space-y-3">
          {Object.entries({
            EN_ATTENTE: waitingFormations,
            VALIDEE: validatedFormations,
            REJETEE: rejectedFormations,
            SUSPENDUE: suspendedFormations,
          }).map(([statut, count]) => (
            <div key={statut} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-3">
              <div className="flex items-center gap-3">
                <ValidationBadge statut={statut} language={language} unknownLabel={copy.unknown} />
                <span className="font-medium text-[var(--color-text)]">
                  {(FORMATION_VALIDATION_LABELS[language] || FORMATION_VALIDATION_LABELS.FR)[statut] || copy.unknown}
                </span>
              </div>
              <span className="font-semibold text-[var(--color-text)]">{count}</span>
            </div>
          ))}
        </Card>

        <Card title={copy.quickActionsTitle} bodyClassName="space-y-3">
          <Button className="w-full" variant="outline" onClick={() => navigate('/partenaire/soumettre-formation')}>
            {copy.quickSubmit}
          </Button>
          <Button className="w-full" variant="outline" onClick={() => navigate('/partenaire/formations')}>
            {copy.quickList}
          </Button>
          <Button className="w-full" variant="outline" onClick={() => navigate('/partenaire/reversements')}>
            {copy.quickPayouts}
          </Button>
        </Card>
      </div>

      <Card title={copy.recentFormationsTitle}>
        {formations.length === 0 ? (
          <p className="text-sm text-[var(--color-subtext)]">{copy.noFormation}</p>
        ) : (
          <div className="space-y-3">
            {formations.slice(0, 5).map((formation) => (
              <button
                key={formation.id}
                type="button"
                onClick={() => navigate(`/partenaire/formations/${formation.id}`)}
                className="flex w-full items-center justify-between rounded-lg border border-[var(--color-border)] px-4 py-3 text-left transition hover:border-[var(--color-partenaire)] hover:bg-[var(--color-bg)]"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-[var(--color-text)]">{formation.titre}</div>
                  <div className="mt-1 text-sm text-[var(--color-subtext)]">
                    {copy.submittedOn} {formation.date_soumission ? new Date(formation.date_soumission).toLocaleDateString(locale) : '-'}
                  </div>
                </div>
                <ValidationBadge statut={formation.statut_validation} language={language} unknownLabel={copy.unknown} />
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card title={copy.recentPayoutsTitle}>
        {reversements.length === 0 ? (
          <p className="text-sm text-[var(--color-subtext)]">{copy.noPayout}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-border)]">
              <thead className="bg-[var(--color-bg)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-subtext)]">{copy.formationColumn}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-subtext)]">{copy.statusColumn}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-subtext)]">{copy.netAmountColumn}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-subtext)]">{copy.dateColumn}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] bg-white">
                {reversements.slice(0, 5).map((reversement) => (
                  <tr key={reversement.id}>
                    <td className="px-4 py-3 text-sm text-[var(--color-text)]">
                      {reversement.formation?.titre || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={reversement.statut_validation === 'REVERSEE' ? 'success' : 'info'}>
                        {(REVERSEMENT_STATUS_LABELS[language] || REVERSEMENT_STATUS_LABELS.FR)[reversement.statut_validation] || copy.unknown}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-[var(--color-partenaire)]">
                      {formatMoney(reversement.montant_net)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-subtext)]">
                      {reversement.date_validation ? new Date(reversement.date_validation).toLocaleDateString(locale) : '-'}
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
