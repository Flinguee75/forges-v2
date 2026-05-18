import { useEffect, useState } from 'react';
import { getMesReversements } from '../../api/partenaires.api';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import {
  PARTNER_PAYOUTS_COPY,
  REVERSEMENT_STATUS_LABELS,
  getPartnerLocale,
  resolvePartnerLanguage,
} from './i18n';

const formatMoney = (value) => `${Math.round(Number(value || 0) / 100).toLocaleString('fr-FR')} FCFA`;

function ReversementBadge({ statut, language, unknownLabel }) {
  const labels = REVERSEMENT_STATUS_LABELS[language] || REVERSEMENT_STATUS_LABELS.FR;
  const config = {
    VALIDEE: { variant: 'info', label: labels.VALIDEE },
    EN_ATTENTE: { variant: 'warning', label: labels.EN_ATTENTE },
    REVERSEE: { variant: 'success', label: labels.REVERSEE },
  }[statut] || { variant: 'gray', label: statut || unknownLabel };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function MesReversements() {
  const { user } = useAuth();
  const { execute, isLoading } = useApi();
  const { showError } = useToast();
  const [reversements, setReversements] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [filtres, setFiltres] = useState({ mois: '', statut_validation: '' });
  const language = resolvePartnerLanguage(user?.langue_preferee);
  const locale = getPartnerLocale(language);
  const copy = PARTNER_PAYOUTS_COPY[language] || PARTNER_PAYOUTS_COPY.FR;

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const result = await execute(
          () => getMesReversements(filtres),
          { showErrorToast: false }
        );

        if (!isMounted) return;

        setReversements(result?.data || []);
        setMeta(result?.meta || { total: 0, page: 1, limit: 20, totalPages: 0 });
      } catch (error) {
        if (isMounted) {
          showError(error?.message || copy.loadError);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [copy.loadError, execute, filtres, showError]);

  const monthOptions = () => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return {
        value,
        label: date.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
      };
    });
  };

  const visibleTotal = reversements.reduce((acc, item) => acc + Number(item.montant_net || 0), 0);
  const visibleValidee = reversements
    .filter((item) => item.statut_validation === 'VALIDEE')
    .reduce((acc, item) => acc + Number(item.montant_net || 0), 0);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-[var(--color-border)]">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--color-partenaire)]">
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--color-text)]">{copy.title}</h1>
        <p className="mt-2 text-[var(--color-subtext)]">
          {meta.total} {meta.total > 1 ? copy.totalPlural : copy.totalSingle}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-[var(--color-warning)]">
          <div className="text-sm font-medium text-[var(--color-subtext)]">{copy.validatedAmount}</div>
          <div className="mt-3 text-3xl font-bold text-[var(--color-warning)]">{formatMoney(visibleValidee)}</div>
        </Card>
        <Card className="border-l-4 border-[var(--color-partenaire)]">
          <div className="text-sm font-medium text-[var(--color-subtext)]">{copy.visibleTotal}</div>
          <div className="mt-3 text-3xl font-bold text-[var(--color-partenaire)]">{formatMoney(visibleTotal)}</div>
        </Card>
        <Card className="border-l-4 border-[var(--color-success)]">
          <div className="text-sm font-medium text-[var(--color-subtext)]">{copy.visibleRows}</div>
          <div className="mt-3 text-3xl font-bold text-[var(--color-success)]">{reversements.length}</div>
        </Card>
      </div>

      <Card title={copy.filtersTitle}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="partenaire-reversements-mois" className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.month}</label>
            <select
              id="partenaire-reversements-mois"
              value={filtres.mois}
              onChange={(e) => setFiltres((prev) => ({ ...prev, mois: e.target.value }))}
              className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-partenaire)]"
            >
              <option value="">{copy.allMonths}</option>
              {monthOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="partenaire-reversements-statut" className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.status}</label>
            <select
              id="partenaire-reversements-statut"
              value={filtres.statut_validation}
              onChange={(e) => setFiltres((prev) => ({ ...prev, statut_validation: e.target.value }))}
              className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-partenaire)]"
            >
              <option value="">{copy.all}</option>
              <option value="VALIDEE">{(REVERSEMENT_STATUS_LABELS[language] || REVERSEMENT_STATUS_LABELS.FR).VALIDEE}</option>
            </select>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Card>
          <div className="space-y-3">
            <div className="h-5 w-48 animate-pulse rounded bg-[var(--color-border)]" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-border)]" />
          </div>
        </Card>
      ) : reversements.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <h3 className="text-xl font-semibold text-[var(--color-text)]">{copy.emptyTitle}</h3>
            <p className="mt-2 text-sm text-[var(--color-subtext)]">
              {filtres.mois || filtres.statut_validation
                ? copy.emptyFiltered
                : copy.emptyDefault}
            </p>
          </div>
        </Card>
      ) : (
        <Card title={copy.historyTitle}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-border)]">
              <thead className="bg-[var(--color-bg)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-subtext)]">{copy.period}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-subtext)]">{copy.formation}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-subtext)]">{copy.status}</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--color-subtext)]">{copy.netAmount}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-subtext)]">{copy.date}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] bg-white">
                {reversements.map((reversement) => (
                  <tr key={reversement.id} className="hover:bg-[var(--color-bg)]">
                    <td className="px-4 py-3 text-sm text-[var(--color-text)]">
                      {reversement.date_validation
                        ? new Date(reversement.date_validation).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-subtext)]">
                      {reversement.formation?.titre || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <ReversementBadge statut={reversement.statut_validation} language={language} unknownLabel={copy.unknown} />
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
        </Card>
      )}
    </div>
  );
}
