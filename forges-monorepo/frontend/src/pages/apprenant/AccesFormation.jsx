import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import apprenantApi from '../../api/espace-apprenant.api';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';

function formatDate(dateValue) {
  if (!dateValue) return '-';
  return new Date(dateValue).toLocaleDateString('fr-FR');
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

export default function AccesFormation() {
  const { accesId } = useParams();
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const [acces, setAcces] = useState(null);
  const [progression, setProgression] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [paymentRequiredMessage, setPaymentRequiredMessage] = useState('');

  const loadAcces = async () => {
    setLoadError('');
    setPaymentRequiredMessage('');
    setSaveMessage('');

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
              accessError?.message || 'Cette formation nécessite un paiement ou un abonnement actif.'
            );
            return;
          }

          setLoadError(accessError?.message || 'Impossible de charger cet accès.');
          return;
        }
      }

      if (error?.statusCode === 402 || error?.code === 'PAYMENT_REQUIRED') {
        setPaymentRequiredMessage(
          error?.message || 'Cette formation nécessite un paiement ou un abonnement actif.'
        );
        return;
      }

      setLoadError(error?.message || 'Impossible de charger cet accès.');
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

      setSaveMessage('Progression enregistrée.');
    } catch (error) {
      setSaveMessage(error?.message || 'Impossible d’enregistrer la progression.');
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
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (loadError) {
    return (
      <EmptyState
        type="error"
        title="Accès introuvable"
        message={loadError}
        action={(
          <Link to="/apprenant/formations-a-la-demande">
            <Button variant="outline">Retour à la liste</Button>
          </Link>
        )}
      />
    );
  }

  if (paymentRequiredMessage) {
    return (
      <EmptyState
        type="error"
        title="Accès non disponible"
        message={paymentRequiredMessage}
        action={(
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/apprenant/abonnement">
              <Button>Mon abonnement</Button>
            </Link>
            <Link to="/apprenant/catalogue">
              <Button variant="outline">Retour au catalogue</Button>
            </Link>
          </div>
        )}
      />
    );
  }

  if (!acces) {
    return null;
  }

  const isSuspended = acces.statut === 'SUSPENDU';
  const isExpired = acces.statut === 'EXPIRE';
  const canEditProgression = acces.statut === 'ACTIF';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
          Détail de l&apos;accès
        </p>
        <h1 className="mt-3 text-3xl font-bold text-text">
          {acces.formation?.titre || 'Formation'}
        </h1>
        <p className="mt-2 text-sm text-subtext">
          Consultez le statut d&apos;accès, la progression et la date d&apos;expiration.
        </p>
      </div>

      {isSuspended && (
        <EmptyState
          type="error"
          title="Accès suspendu"
          message="Réactivez votre abonnement pour accéder"
          action={(
            <Link to="/apprenant/abonnement">
              <Button>Mon abonnement</Button>
            </Link>
          )}
        />
      )}

      {isExpired && (
        <EmptyState
          type="error"
          title="Accès expiré"
          message="Cet accès a expiré. Vous pouvez réactiver ou souscrire à nouveau selon le contrat."
          action={(
            <Link to="/apprenant/abonnement/souscrire">
              <Button>Voir les offres</Button>
            </Link>
          )}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={getBadgeVariant(acces.statut)} size="small">
                {acces.statut}
              </Badge>
              {acces.source_financement && (
                <Badge variant="info" size="small">
                  {acces.source_financement}
                </Badge>
              )}
            </div>

            <p className="text-sm text-subtext">
              {acces.formation?.description || 'Aucune description disponible.'}
            </p>

            <div className="grid gap-3 text-sm text-subtext md:grid-cols-2">
              <p>Expiration: {formatDate(acces.date_expiration)}</p>
              <p>Source: {acces.source_financement || '-'}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-text">Progression</p>
              <p className="mt-1 text-sm text-subtext">
                {Number(progression || 0)}%
              </p>
            </div>

            <Input
              type="range"
              min="0"
              max="100"
              value={progression}
              onChange={(event) => setProgression(event.target.value)}
              disabled={!canEditProgression}
              className="px-0"
            />

            {canEditProgression ? (
              <div className="rounded-lg border border-success/20 bg-success/10 p-4 text-sm text-success">
                La progression peut être mise à jour depuis cet écran.
              </div>
            ) : (
              <div className="rounded-lg border border-warning/20 bg-warning/10 p-4 text-sm text-warning">
                La progression est affichée en lecture seule pour cet accès.
              </div>
            )}

            {saveMessage && (
              <div className="rounded-lg border border-border bg-bg px-4 py-3 text-sm text-text">
                {saveMessage}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {canEditProgression && (
                <Button onClick={handleSaveProgression} disabled={isLoading || isSaving}>
                  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              )}
              <Link to="/apprenant/formations-a-la-demande">
                <Button variant="outline" disabled={isLoading}>
                  Retour
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
