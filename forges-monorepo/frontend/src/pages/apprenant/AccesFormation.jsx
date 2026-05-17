import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import apprenantApi from '../../api/espace-apprenant.api';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';

function formatDate(dateValue) {
  if (!dateValue) return '-';
  return new Date(dateValue).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getDaysRemaining(dateExpiration) {
  if (!dateExpiration) return null;
  return Math.ceil((new Date(dateExpiration) - new Date()) / 86400000);
}

function getBadgeVariant(status) {
  if (status === 'ACTIF') return 'success';
  if (status === 'SUSPENDU') return 'warning';
  if (status === 'EXPIRE') return 'danger';
  return 'gray';
}

function unwrapResponseData(payload) {
  return payload?.data ?? payload;
}

function ProgressBar({ value }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-subtext">
        <span>Progression</span>
        <span className="font-semibold text-text">{pct}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AccesFormation() {
  const { accesId } = useParams();
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const [acces, setAcces] = useState(null);
  const [progression, setProgression] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isAcceding, setIsAcceding] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [accesError, setAccesError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [paymentRequiredMessage, setPaymentRequiredMessage] = useState('');

  const loadAcces = async () => {
    setLoadError('');
    setPaymentRequiredMessage('');
    setSaveMessage('');
    setAccesError('');

    try {
      const result = await execute(
        () => apprenantApi.getAccesFormationDemande(accesId),
        { showErrorToast: false }
      );
      const accessData = unwrapResponseData(result);
      setAcces(accessData);
      setProgression(Number(accessData?.progression || 0));
    } catch (error) {
      if (error?.code === 'NOT_FOUND' || error?.statusCode === 404) {
        try {
          const createdAccess = await execute(
            () => apprenantApi.accederFormationDemande(accesId),
            { showErrorToast: false }
          );
          const createdAccessData = unwrapResponseData(createdAccess);
          const nextAccess = createdAccessData?.acces || createdAccessData;
          setAcces(nextAccess);
          setProgression(Number(nextAccess?.progression || 0));
          if (nextAccess?.id && nextAccess.id !== accesId) {
            navigate(`/apprenant/formations-a-la-demande/${nextAccess.id}`, { replace: true });
          }
          return;
        } catch (accessError) {
          if (accessError?.statusCode === 402 || accessError?.code === 'PAYMENT_REQUIRED') {
            setPaymentRequiredMessage(
              accessError?.message || 'Cette formation necessite un paiement ou un abonnement actif.'
            );
            return;
          }
          setLoadError(accessError?.message || 'Impossible de charger cet acces.');
          return;
        }
      }
      if (error?.statusCode === 402 || error?.code === 'PAYMENT_REQUIRED') {
        setPaymentRequiredMessage(
          error?.message || 'Cette formation necessite un paiement ou un abonnement actif.'
        );
        return;
      }
      setLoadError(error?.message || 'Impossible de charger cet acces.');
    }
  };

  const handleAccederFormation = async () => {
    setAccesError('');
    setIsAcceding(true);
    try {
      const finalUrl = await apprenantApi.proxyAccesFormation(accesId);
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      const code = error?.statusCode;
      if (code === 403) {
        setAccesError(
          error?.error === 'ACCES_EXPIRE'
            ? 'Cet acces a expire. Renouvelez votre abonnement pour continuer.'
            : 'Cet acces est suspendu. Reactivez votre abonnement.'
        );
      } else if (code === 503) {
        setAccesError('Le contenu de cette formation n\'est pas encore disponible. Reessayez plus tard.');
      } else {
        setAccesError(error?.message || 'Impossible d\'acceder a la formation.');
      }
    } finally {
      setIsAcceding(false);
    }
  };

  const handleSaveProgression = async () => {
    setSaveMessage('');
    setIsSaving(true);
    try {
      const result = await execute(
        () => apprenantApi.updateProgressionFormationDemande(accesId, progression),
        { showErrorToast: false }
      );
      if (result) {
        const nextProgression = Number(result?.progression ?? progression);
        setAcces((current) => (current ? { ...current, progression: nextProgression } : result));
        setProgression(nextProgression);
      }
      setSaveMessage('Progression enregistree.');
    } catch (error) {
      setSaveMessage(error?.message || 'Impossible d\'enregistrer la progression.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    loadAcces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accesId]);

  if (isLoading && !acces && !loadError) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="large" />
      </div>
    );
  }

  if (loadError) {
    return (
      <EmptyState
        type="error"
        title="Acces introuvable"
        message={loadError}
        action={
          <Link to="/apprenant/formations-a-la-demande">
            <Button variant="outline">Retour a la liste</Button>
          </Link>
        }
      />
    );
  }

  if (paymentRequiredMessage) {
    return (
      <EmptyState
        type="error"
        title="Acces non disponible"
        message={paymentRequiredMessage}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/apprenant/abonnement"><Button>Mon abonnement</Button></Link>
            <Link to="/apprenant/catalogue"><Button variant="outline">Retour au catalogue</Button></Link>
          </div>
        }
      />
    );
  }

  if (!acces) return null;

  const isActif = acces.statut === 'ACTIF';
  const isSuspended = acces.statut === 'SUSPENDU';
  const isExpired = acces.statut === 'EXPIRE';
  const daysLeft = getDaysRemaining(acces.date_expiration);
  const isExpiringSoon = isActif && daysLeft !== null && daysLeft <= 14;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
              Formations a la demande
            </p>
            <h1 className="mt-2 text-3xl font-bold text-text">
              {acces.formation?.intitule || acces.formation?.titre || 'Formation'}
            </h1>
            {acces.formation?.categorie && (
              <p className="mt-1 text-sm text-subtext">{acces.formation.categorie}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={getBadgeVariant(acces.statut)} size="small">{acces.statut}</Badge>
            {acces.source_financement && (
              <Badge variant="info" size="small">{acces.source_financement}</Badge>
            )}
          </div>
        </div>
      </div>

      {isSuspended && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          <strong>Acces suspendu.</strong> Reactivez votre abonnement pour acceder a cette formation.{' '}
          <Link to="/apprenant/abonnement" className="ml-2 font-semibold underline">Mon abonnement</Link>
        </div>
      )}

      {isExpired && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          <strong>Acces expire.</strong> Cet acces a expire le {formatDate(acces.date_expiration)}.{' '}
          <Link to="/apprenant/abonnement/souscrire" className="ml-2 font-semibold underline">Voir les offres</Link>
        </div>
      )}

      {isExpiringSoon && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          Expire dans <strong>{daysLeft} jour{daysLeft > 1 ? 's' : ''}</strong> — {formatDate(acces.date_expiration)}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <Card>
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-text">Description</p>
                <p className="mt-1 text-sm text-subtext">
                  {acces.formation?.description || 'Aucune description disponible.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <p className="text-xs text-subtext">Expiration</p>
                  <p className="font-medium text-text">{formatDate(acces.date_expiration)}</p>
                </div>
                <div>
                  <p className="text-xs text-subtext">Source</p>
                  <p className="font-medium text-text">{acces.source_financement || '-'}</p>
                </div>
                {acces.last_access_at && (
                  <div>
                    <p className="text-xs text-subtext">Dernier acces</p>
                    <p className="font-medium text-text">{formatDate(acces.last_access_at)}</p>
                  </div>
                )}
                {acces.formation?.duree_heures && (
                  <div>
                    <p className="text-xs text-subtext">Duree</p>
                    <p className="font-medium text-text">{acces.formation.duree_heures}h</p>
                  </div>
                )}
              </div>

              <ProgressBar value={acces.progression} />
            </div>
          </Card>

          {isActif && (
            <Card>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-text">Mettre a jour la progression</p>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progression}
                    onChange={(e) => setProgression(Number(e.target.value))}
                    className="flex-1"
                    data-testid="progression-slider"
                  />
                  <span className="w-10 text-right text-sm font-semibold text-text">{progression}%</span>
                </div>
                {saveMessage && (
                  <p className="text-sm text-subtext">{saveMessage}</p>
                )}
                <Button
                  size="small"
                  variant="outline"
                  onClick={handleSaveProgression}
                  disabled={isSaving || isLoading}
                >
                  {isSaving ? 'Enregistrement...' : 'Enregistrer la progression'}
                </Button>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {isActif && (
            <Card>
              <div className="space-y-3 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-text">Acceder a la formation</p>
                  <p className="mt-0.5 text-xs text-subtext">Ouverture dans un nouvel onglet</p>
                </div>

                {accesError && (
                  <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                    {accesError}
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleAccederFormation}
                  disabled={isAcceding}
                  data-testid="btn-acceder-formation"
                >
                  {isAcceding ? 'Ouverture...' : 'Acceder'}
                </Button>
              </div>
            </Card>
          )}

          <Card>
            <div className="space-y-2 text-sm text-subtext">
              <p className="font-semibold text-text">Informations acces</p>
              <p>Mode : A la demande</p>
              {acces.formation?.niveau && <p>Niveau : {acces.formation.niveau}</p>}
              {acces.formation?.langue && <p>Langue : {acces.formation.langue}</p>}
            </div>
          </Card>

          <Link to="/apprenant/formations-a-la-demande">
            <Button variant="outline" className="w-full">
              Retour a la liste
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
