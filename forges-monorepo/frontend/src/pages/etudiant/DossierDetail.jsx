import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { etudiantApi } from '../../api/espace-etudiant.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/feedback/Spinner';

/**
 * DossierDetail - Détail d'un dossier d'inscription apprenant
 * Route: /apprenant/dossiers/:id
 * Référence: migration apprenant
 */
export default function DossierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dossier, setDossier] = useState(null);

  const { execute, isLoading } = useApi();

  const loadDossier = async () => {
    await execute(() => etudiantApi.getDossierDetail(id), {
      onSuccess: (data) => {
        setDossier(data?.data || data);
      },
    });
  };

  useEffect(() => {
    loadDossier();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const getStatutBadge = (statut) => {
    const mapping = {
      EN_ATTENTE: { variant: 'gray', label: 'En attente' },
      EN_ATTENTE_VERIFICATION: { variant: 'warning', label: 'En attente de vérification' },
      EN_ATTENTE_PAIEMENT: { variant: 'warning', label: 'Paiement à effectuer' },
      RETENU: { variant: 'success', label: 'Retenu' },
      PAYE_DIRECTEMENT: { variant: 'warning', label: 'Paiement à effectuer' },
      PAYE: { variant: 'success', label: 'Payé' },
      CONFIRME: { variant: 'success', label: 'Confirmé' },
      REJETE: { variant: 'danger', label: 'Rejeté' },
      REFUSE: { variant: 'danger', label: 'Refusé' },
      GRIS: { variant: 'warning', label: 'Liste grise' },
      EXCEPTION: { variant: 'warning', label: 'Exception' },
      ARCHIVE: { variant: 'gray', label: 'Archivé' },
      ANNULE: { variant: 'danger', label: 'Annulé' },
    };
    const config = mapping[statut] || { variant: 'gray', label: statut };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatMontant = (centimes) => {
    if (!centimes) return '0 FCFA';
    const montantXOF = Math.round(Number(centimes) / 100);
    return `${montantXOF.toLocaleString('fr-FR')} FCFA`;
  };

  const getFormation = () => dossier?.formation || dossier?.session?.formation;
  const getFormationTitre = () =>
    getFormation()?.titre || getFormation()?.intitule || 'N/A';
  const getFormationCode = () =>
    getFormation()?.code || getFormation()?.code_formation || 'N/A';
  const getFormationTarif = () =>
    getFormation()?.tarif || getFormation()?.cout_catalogue || 0;

  const calculateDelai72h = () => {
    if (!dossier || dossier.statut !== 'RETENU') return null;
    const dateRetenu = new Date(dossier.updated_at || dossier.created_at);
    const dateLimite = new Date(dateRetenu.getTime() + 72 * 60 * 60 * 1000);
    const now = new Date();
    const heuresRestantes = Math.ceil((dateLimite - now) / (1000 * 60 * 60));
    return { dateLimite, heuresRestantes, isExpired: heuresRestantes <= 0 };
  };

  const isPaiementConfirme = (dossier) =>
    dossier?.paiement?.statut === 'CONFIRME' || dossier?.statut === 'PAYE';

  const needsPayment = (dossier) =>
    ['RETENU', 'PAYE_DIRECTEMENT'].includes(dossier?.statut) && !isPaiementConfirme(dossier);

  const getPaiementLabel = (paiement) => {
    const mapping = {
      CONFIRME: { variant: 'success', label: 'Paiement confirmé' },
      PENDING: { variant: 'warning', label: 'Paiement en cours' },
      EN_ATTENTE: { variant: 'warning', label: 'Paiement initié' },
      ECHOUE: { variant: 'danger', label: 'Paiement échoué' },
      EXPIRE: { variant: 'danger', label: 'Paiement expiré' },
    };
    const config = mapping[paiement?.statut] || { variant: 'gray', label: 'Aucun paiement initié' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading || !dossier) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  const delai = calculateDelai72h();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Détail du dossier</h1>
          <p className="mt-2 text-subtext">
            Référence : {dossier.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/apprenant/dossiers')}>
          Retour à la liste
        </Button>
      </div>

      {dossier.statut === 'RETENU' && delai && !delai.isExpired && (
        <div className="mb-6 rounded-lg border border-warning-soft bg-warning-soft p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-warning">Action requise : Paiement</h3>
              <p className="mt-1 text-sm text-warning">
                Vous avez {delai.heuresRestantes}h pour effectuer votre paiement avant le{' '}
                {formatDate(delai.dateLimite)} à{' '}
                {delai.dateLimite.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                . (RM-07)
              </p>
            </div>
            <Link to="/apprenant/paiements">
              <Button variant="warning" size="small">
                Payer maintenant
              </Button>
            </Link>
          </div>
        </div>
      )}

      {dossier.statut === 'PAYE_DIRECTEMENT' && needsPayment(dossier) && (
        <div className="mb-6 rounded-lg border border-warning-soft bg-warning-soft p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-warning">Action requise : paiement à effectuer</h3>
              <p className="mt-1 text-sm text-warning">
                Votre dossier est accepté sans vérification manuelle. Il reste à régler le montant pour confirmer définitivement votre inscription.
              </p>
            </div>
            <Link to="/apprenant/paiements">
              <Button variant="warning" size="small">
                Payer maintenant
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-primary">Informations du dossier</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-subtext">Statut</span>
              <div>{getStatutBadge(dossier.statut)}</div>
            </div>
            <div className="flex justify-between">
              <span className="text-subtext">Date de soumission</span>
              <span className="font-medium">{formatDate(dossier.created_at)}</span>
            </div>
            {dossier.updated_at && dossier.updated_at !== dossier.created_at && (
              <div className="flex justify-between">
                <span className="text-subtext">Dernière mise à jour</span>
                <span className="font-medium">{formatDate(dossier.updated_at)}</span>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-primary">Formation et session</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-subtext">Formation</span>
              <p className="font-medium text-text">{getFormationTitre()}</p>
            </div>
            <div>
              <span className="text-sm text-subtext">Code formation</span>
              <p className="font-medium text-text">{getFormationCode()}</p>
            </div>
            <div>
              <span className="text-sm text-subtext">Session</span>
              <p className="font-medium text-text">
                Du {formatDate(dossier.session?.date_debut)} au{' '}
                {formatDate(dossier.session?.date_fin)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-primary">Informations financières</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-subtext">Paiement</span>
              <div>{getPaiementLabel(dossier.paiement)}</div>
            </div>
            <div className="flex justify-between">
              <span className="text-subtext">Prix de la formation</span>
              <span className="font-medium">{formatMontant(getFormationTarif())}</span>
            </div>
            {dossier.montant_remise > 0 && (
              <div className="flex justify-between text-success">
                <span>Remise appliquée</span>
                <span className="font-medium">
                  -{formatMontant(dossier.montant_remise)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3">
              <span className="font-semibold text-primary">Montant à payer</span>
              <span className="text-lg font-bold text-primary">
                {formatMontant(getFormationTarif() - (dossier.montant_remise || 0))}
              </span>
            </div>
          </div>
        </Card>

        {needsPayment(dossier) && (
          <div className="flex justify-center">
            <Link to="/apprenant/paiements">
              <Button variant="primary" size="large">
                Procéder au paiement
              </Button>
            </Link>
          </div>
        )}

        {isPaiementConfirme(dossier) && (
          <div className="flex justify-center">
            <Link to={`/apprenant/attestations?dossier=${dossier.id}`}>
              <Button variant="primary" size="large">
                Télécharger l'attestation
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
