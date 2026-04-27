import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { paiementsApi } from '../../api/paiements.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/feedback/Spinner';

/**
 * PaiementDetail - Détail d'un paiement apprenant
 * Route: /apprenant/paiements/:id
 * Référence: migration apprenant
 */
export default function PaiementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paiement, setPaiement] = useState(null);

  const { execute, isLoading } = useApi();

  const loadPaiement = async () => {
    await execute(() => paiementsApi.getById(id), {
      onSuccess: (data) => {
        setPaiement(data);
      },
    });
  };

  useEffect(() => {
    loadPaiement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const getStatutBadge = (statut) => {
    const mapping = {
      EN_ATTENTE: { variant: 'gray', label: 'En attente' },
      INITIE: { variant: 'info', label: 'Initié' },
      CONFIRME: { variant: 'success', label: 'Confirmé' },
      ECHOUE: { variant: 'danger', label: 'Échoué' },
      EXPIRE: { variant: 'warning', label: 'Expiré' },
      REMBOURSE: { variant: 'gray', label: 'Remboursé' },
    };
    const config = mapping[statut] || { variant: 'gray', label: statut };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getMethodeLabel = (methode) => {
    const mapping = {
      MOBILE_MONEY: 'Mobile Money',
      CARTE: 'Carte bancaire',
      VIREMENT: 'Virement bancaire',
      VOUCHER_ORG: 'Voucher Organisation',
    };
    return mapping[methode] || methode;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  const formatMontant = (centimes) => {
    if (!centimes) return '0 FCFA';
    return `${(centimes / 100).toLocaleString('fr-FR')} FCFA`;
  };

  const formation = paiement?.dossier?.formation || paiement?.dossier?.session?.formation;
  const formationTitre = formation?.titre || formation?.intitule || 'N/A';

  if (isLoading || !paiement) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">Détail du paiement</h1>
          <p className="mt-2 text-subtext">
            Référence : {paiement.reference || paiement.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/apprenant/paiements')}>
          Retour à la liste
        </Button>
      </div>

      {paiement.statut === 'ECHOUE' && (
        <div className="mb-6 rounded-lg border border-danger-soft bg-danger-soft p-4">
          <h3 className="font-semibold text-danger">Paiement échoué</h3>
          <p className="mt-1 text-sm text-danger">
            Votre paiement n'a pas pu être traité. Veuillez réessayer ou utiliser une autre
            méthode de paiement.
          </p>
          {paiement.tentatives_echouees >= 3 && (
            <p className="mt-2 text-sm text-danger font-semibold">
              Nombre maximum de tentatives atteint (3/3). Contactez le support. (RM-08)
            </p>
          )}
        </div>
      )}

      {paiement.statut === 'CONFIRME' && (
        <div className="mb-6 rounded-lg border border-success-soft bg-success-soft p-4">
          <h3 className="font-semibold text-success">Paiement confirmé</h3>
          <p className="mt-1 text-sm text-success">
            Votre paiement a été validé avec succès. Votre inscription est maintenant confirmée.
          </p>
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-primary">Informations du paiement</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-subtext">Statut</span>
              <div>{getStatutBadge(paiement.statut)}</div>
            </div>
            <div className="flex justify-between">
              <span className="text-subtext">Montant</span>
              <span className="text-lg font-bold text-primary">
                {formatMontant(paiement.montant)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-subtext">Méthode de paiement</span>
              <span className="font-medium">{getMethodeLabel(paiement.methode_paiement)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-subtext">Date d'initialisation</span>
              <span className="font-medium">{formatDate(paiement.created_at)}</span>
            </div>
            {paiement.date_confirmation && (
              <div className="flex justify-between">
                <span className="text-subtext">Date de confirmation</span>
                <span className="font-medium">{formatDate(paiement.date_confirmation)}</span>
              </div>
            )}
            {paiement.tentatives_echouees > 0 && (
              <div className="flex justify-between">
                <span className="text-subtext">Tentatives échouées</span>
                <Badge variant="warning" size="small">
                  {paiement.tentatives_echouees} / 3
                </Badge>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold text-primary">
            Formation et dossier associés
          </h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-subtext">Formation</span>
              <p className="font-medium text-text">{formationTitre}</p>
            </div>
            <div>
              <span className="text-sm text-subtext">Session</span>
              <p className="font-medium text-text">
                Du {formatDate(paiement.dossier?.session?.date_debut)} au{' '}
                {formatDate(paiement.dossier?.session?.date_fin)}
              </p>
            </div>
            <div>
              <span className="text-sm text-subtext">Référence du dossier</span>
              <p className="font-medium text-text">
                {paiement.dossier?.id?.slice(0, 8).toUpperCase() || 'N/A'}
              </p>
            </div>
          </div>
        </Card>

        {paiement.statut === 'ECHOUE' && paiement.tentatives_echouees < 3 && (
          <div className="flex justify-center">
            <Button
              variant="primary"
              size="large"
              onClick={() => navigate('/apprenant/paiements')}
            >
              Réessayer le paiement
            </Button>
          </div>
        )}

        {paiement.statut === 'CONFIRME' && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="large"
              onClick={() => navigate('/apprenant/attestations')}
            >
              Voir mes attestations
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
