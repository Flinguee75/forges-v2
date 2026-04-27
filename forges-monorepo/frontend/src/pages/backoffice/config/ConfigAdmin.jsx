import { useCallback, useEffect, useState } from 'react';
import { dashboardApi } from '../../../api/dashboard.api';
import Spinner from '../../../components/feedback/Spinner';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import { useApi } from '../../../hooks/useApi';

function formatFcfa(amount) {
  return `${Number(amount || 0).toLocaleString('fr-FR')} FCFA`;
}

function buildInitialForm(current = {}) {
  return {
    commission_forges_pct: String(current.default_commission_forges_pct ?? 20),
    taux_commission_apporteur_pct: String(current.default_commission_apporteur_pct ?? 5),
    seuil_reversement_partenaire_xof: String(current.seuil_reversement_partenaire_xof ?? 50000),
    seuil_reversement_apporteur_xof: String(current.seuil_reversement_apporteur_xof ?? 5000),
  };
}

export default function ConfigAdmin() {
  const { execute, isLoading, error } = useApi();
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(buildInitialForm());
  const [isSaving, setIsSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    await execute(
      () => dashboardApi.getAdminConfig(),
      {
        showErrorToast: false,
        onSuccess: (data) => {
          setConfig(data || null);
          setForm(buildInitialForm(data || null));
        },
      }
    );
  }, [execute]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleChange = (field) => (event) => {
    setForm((previous) => ({
      ...previous,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      await execute(
        () => dashboardApi.updateAdminConfig({
          DEFAULT_COMMISSION_FORGES_PCT: Number(form.commission_forges_pct),
          DEFAULT_COMMISSION_APPORTEUR_PCT: Number(form.taux_commission_apporteur_pct),
          seuil_reversement_partenaire_xof: Number(form.seuil_reversement_partenaire_xof),
          seuil_reversement_apporteur_xof: Number(form.seuil_reversement_apporteur_xof),
        }),
        {
          showSuccessToast: true,
          successMessage: 'Configuration globale mise à jour',
          onSuccess: (data) => {
            setConfig(data || null);
            setForm(buildInitialForm(data || null));
          },
        }
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !config) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
          UCS13
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-primary">
          Configuration globale
        </h1>
        <p className="mt-2 text-sm text-subtext">
          Les valeurs courantes sont affichées avant modification. Les seuils restent saisis en XOF et la grille tarifaire est fournie en lecture.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <Card title="Valeurs courantes" bodyClassName="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-subtext">Commission FORGES</p>
            <p className="mt-2 text-2xl font-semibold text-text">{config?.default_commission_forges_pct ?? 0}%</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-subtext">Taux apporteur</p>
            <p className="mt-2 text-2xl font-semibold text-text">{config?.default_commission_apporteur_pct ?? 0}%</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-subtext">Seuil partenaire</p>
            <p className="mt-2 text-2xl font-semibold text-text">{formatFcfa(config?.seuil_reversement_partenaire_xof)}</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-subtext">Seuil apporteur</p>
            <p className="mt-2 text-2xl font-semibold text-text">{formatFcfa(config?.seuil_reversement_apporteur_xof)}</p>
          </div>
        </div>
      </Card>

      <Card title="Modifier la configuration" bodyClassName="space-y-5">
        <div className="rounded-lg border border-warning/20 bg-warning/10 p-4 text-sm text-warning">
          S&apos;applique aux nouvelles souscriptions
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="number"
              label="Commission FORGES (%)"
              value={form.commission_forges_pct}
              onChange={handleChange('commission_forges_pct')}
              min="0"
              max="99"
              required
            />
            <Input
              type="number"
              label="Taux commission apporteur (%)"
              value={form.taux_commission_apporteur_pct}
              onChange={handleChange('taux_commission_apporteur_pct')}
              min="0"
              max="99"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="number"
              label="Seuil reversement partenaire (XOF)"
              value={form.seuil_reversement_partenaire_xof}
              onChange={handleChange('seuil_reversement_partenaire_xof')}
              min="0"
              required
            />
            <Input
              type="number"
              label="Seuil reversement apporteur (XOF)"
              value={form.seuil_reversement_apporteur_xof}
              onChange={handleChange('seuil_reversement_apporteur_xof')}
              min="0"
              required
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={isSaving}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Rappel runtime" bodyClassName="space-y-4">
        <p className="text-sm text-subtext">
          Le backend runtime n'expose que les valeurs globales ci-dessus. Les sections de tarification détaillée ne sont pas montées côté API.
        </p>
      </Card>
    </div>
  );
}
