import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getFormationDetail, soumettreFormationBrouillon } from '../../api/partenaires.api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import {
  FORMATION_STATUS_LABELS,
  FORMATION_VALIDATION_LABELS,
  PARTNER_DETAIL_COPY,
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

function FormationBadge({ statut, language, unknownLabel }) {
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

export default function FormationDetail() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { execute, isLoading } = useApi();
  const [payload, setPayload] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const language = resolvePartnerLanguage(user?.langue_preferee);
  const locale = getPartnerLocale(language);
  const copy = PARTNER_DETAIL_COPY[language] || PARTNER_DETAIL_COPY.FR;

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const result = await execute(() => getFormationDetail(id), { showErrorToast: false });
        if (isMounted) setPayload(result || null);
      } catch (error) {
        if (isMounted) showError(error?.message || copy.loadError);
      } finally {
        if (isMounted) setHasLoaded(true);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [copy.loadError, execute, id, showError]);

  const handleSubmitDraft = async () => {
    setLoadingSubmit(true);
    try {
      const result = await execute(() => soumettreFormationBrouillon(id), { showErrorToast: false });
      if (result) {
        showSuccess(copy.submitSuccess);
        const refreshed = await execute(() => getFormationDetail(id), { showErrorToast: false });
        setPayload(refreshed || null);
      }
    } catch (error) {
      showError(error?.message || copy.submitError);
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (!hasLoaded || isLoading) {
    return (
      <Card>
        <div className="space-y-3">
          <div className="h-5 w-64 animate-pulse rounded bg-[var(--color-border)]" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--color-border)]" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-border)]" />
        </div>
      </Card>
    );
  }

  if (!payload) {
    return (
      <Card>
        <p className="text-sm text-[var(--color-subtext)]">{copy.notFound}</p>
      </Card>
    );
  }

  const formation = payload.formation || payload;
  const history = payload.historique_versions || [];

  const statusMessage = (() => {
    if (formation.statut === 'EN_ATTENTE_VALIDATION') {
      return {
        tone: 'info',
        title: copy.pendingTitle,
        body: copy.pendingBody,
      };
    }

    if (formation.statut_validation === 'REJETEE') {
      return {
        tone: 'danger',
        title: copy.rejectedTitle,
        body: formation.motif_rejet || copy.rejectedBody,
      };
    }

    if (formation.statut_validation === 'VALIDEE') {
      return {
        tone: 'success',
        title: copy.validatedTitle,
        body: copy.validatedBody,
      };
    }

    return null;
  })();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-[var(--color-border)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Button variant="outline" onClick={() => navigate('/partenaire/formations')}>
              {copy.back}
            </Button>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--color-partenaire)]">
                {copy.eyebrow}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-[var(--color-text)]">{formation.titre}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ValidationBadge statut={formation.statut_validation} language={language} unknownLabel={copy.unknown} />
              <FormationBadge statut={formation.statut} language={language} unknownLabel={copy.unknown} />
              <span className="text-sm text-[var(--color-subtext)]">
                {copy.submittedOn} {formation.date_soumission ? new Date(formation.date_soumission).toLocaleDateString(locale) : '-'}
              </span>
            </div>
          </div>

          {formation.statut === 'BROUILLON' && (
            <Button variant="primary" onClick={handleSubmitDraft} loading={loadingSubmit}>
              {copy.submitForReview}
            </Button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div
          className={`rounded-lg border px-4 py-3 ${
            statusMessage.tone === 'danger'
              ? 'border-red-200 bg-red-50 text-red-800'
              : statusMessage.tone === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-blue-200 bg-blue-50 text-blue-800'
          }`}
        >
          <div className="font-semibold">{statusMessage.title}</div>
          <p className="mt-1 text-sm">{statusMessage.body}</p>
        </div>
      )}

      {formation.statut_validation === 'REJETEE' && (
        <Card title={copy.correctionsTitle}>
          <div className="space-y-3 text-sm text-[var(--color-text)]">
            <p className="text-[var(--color-subtext)]">
              {copy.correctionsLead}
            </p>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              <div className="font-semibold">{copy.rejectReason}</div>
              <p className="mt-1 whitespace-pre-line">{formation.motif_rejet || copy.notProvided}</p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <div className="font-semibold text-[var(--color-text)]">{copy.correctionsTitle}</div>
              <p className="mt-1 whitespace-pre-line text-[var(--color-subtext)]">
                {formation.corrections_suggerees || copy.noDetailedCorrection}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={copy.generalInfo}>
          <div className="space-y-4 text-sm">
            <div>
              <div className="font-semibold text-[var(--color-text)]">{copy.description}</div>
              <p className="mt-1 text-[var(--color-subtext)]">{formation.description}</p>
            </div>
            <div>
              <div className="font-semibold text-[var(--color-text)]">{copy.objectives}</div>
              <p className="mt-1 whitespace-pre-line text-[var(--color-subtext)]">{formation.objectifs}</p>
            </div>
            {formation.prerequis && (
              <div>
                <div className="font-semibold text-[var(--color-text)]">{copy.prerequisites}</div>
                <p className="mt-1 text-[var(--color-subtext)]">{formation.prerequis}</p>
              </div>
            )}
          </div>
        </Card>

        <Card title={copy.characteristics}>
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <div className="font-semibold text-[var(--color-text)]">{copy.domain}</div>
              <p className="mt-1 text-[var(--color-subtext)]">{formation.domaine}</p>
            </div>
            <div>
              <div className="font-semibold text-[var(--color-text)]">{copy.subdomain}</div>
              <p className="mt-1 text-[var(--color-subtext)]">{formation.sous_domaine || '-'}</p>
            </div>
            <div>
              <div className="font-semibold text-[var(--color-text)]">{copy.target}</div>
              <p className="mt-1 text-[var(--color-subtext)]">{formation.public_cible}</p>
            </div>
            <div>
              <div className="font-semibold text-[var(--color-text)]">{copy.level}</div>
              <p className="mt-1 text-[var(--color-subtext)]">{formation.niveau}</p>
            </div>
            <div>
              <div className="font-semibold text-[var(--color-text)]">{copy.language}</div>
              <p className="mt-1 text-[var(--color-subtext)]">{formation.langue}</p>
            </div>
            <div>
              <div className="font-semibold text-[var(--color-text)]">{copy.duration}</div>
              <p className="mt-1 text-[var(--color-subtext)]">{formation.duree} {copy.hours}</p>
            </div>
            <div>
              <div className="font-semibold text-[var(--color-text)]">{copy.modality}</div>
              <p className="mt-1 text-[var(--color-subtext)]">
                {formation.modalite === 'EN_LIGNE' ? copy.online : formation.modalite === 'HYBRIDE' ? copy.hybrid : copy.inPerson}
              </p>
            </div>
            <div>
              <div className="font-semibold text-[var(--color-text)]">{copy.mode}</div>
              <p className="mt-1 text-[var(--color-subtext)]">
                {formation.mode_formation === 'AVEC_SESSION' ? copy.withSession : copy.onDemand}
              </p>
            </div>
            <div>
              <div className="font-semibold text-[var(--color-text)]">{copy.capacity}</div>
              <p className="mt-1 text-[var(--color-subtext)]">{formation.capacite_max} {copy.learners}</p>
            </div>
            <div>
              <div className="font-semibold text-[var(--color-text)]">{copy.costPrice}</div>
              <p className="mt-1 text-[var(--color-subtext)]">{formatMoney(formation.prix_coutant)}</p>
            </div>
            {formation.lieu && (
              <div className="sm:col-span-2">
                <div className="font-semibold text-[var(--color-text)]">{copy.location}</div>
                <p className="mt-1 text-[var(--color-subtext)]">{formation.lieu}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card title={copy.historyTitle}>
        {history.length === 0 ? (
          <p className="text-sm text-[var(--color-subtext)]">{copy.noHistory}</p>
        ) : (
          <div className="space-y-3">
            {history.map((entry, index) => (
              <div key={entry.id || `${entry.action}-${index}`} className="rounded-lg border border-[var(--color-border)] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-semibold text-[var(--color-text)]">{entry.action || copy.defaultAction}</div>
                  <div className="text-sm text-[var(--color-subtext)]">
                    {entry.created_at ? new Date(entry.created_at).toLocaleString(locale) : ''}
                  </div>
                </div>
                {entry.payload_after && (
                  <p className="mt-2 text-sm text-[var(--color-subtext)]">
                    {entry.payload_after.message || entry.payload_after.motif_rejet || entry.payload_after.motif_suspension || copy.updateSaved}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
