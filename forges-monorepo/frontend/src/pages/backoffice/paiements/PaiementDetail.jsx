import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { paiementsApi } from '../../../api/paiements.api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/feedback/Spinner';

/**
 * PaiementDetail - Détail d'un paiement
 * Route: /backoffice/paiements/:id
 * Accessible à: ADMIN, AGENT
 * Affiche tous les détails du paiement y compris l'historique
 * Référence: F-9 Backoffice Paiements (Todo_front.pdf)
 */
export default function PaiementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paiement, setPaiement] = useState(null);

  const { execute, isLoading } = useApi();

  useEffect(() => {
    loadPaiement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadPaiement = async () => {
    await execute(() => paiementsApi.getBackofficeById(id), {
      onSuccess: (data) => {
        setPaiement(data);
      },
    });
  };

  const getStatutBadge = (statut) => {
    const mapping = {
      EN_ATTENTE: { variant: 'gray', label: 'En attente' },
      PENDING: { variant: 'warning', label: 'En attente' },
      INITIE: { variant: 'gray', label: 'Initié' },
      CONFIRME: { variant: 'success', label: 'Confirmé' },
      ECHOUE: { variant: 'danger', label: 'Échoué' },
      EXPIRE: { variant: 'warning', label: 'Expiré' },
      REMBOURSE: { variant: 'gray', label: 'Remboursé' },
    };

    const config = mapping[statut] || { variant: 'gray', label: statut };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getMethodeBadge = (methode) => {
    const mapping = {
      MOBILE_MONEY: { label: 'Mobile Money' },
      CARTE: { label: 'Carte bancaire' },
      VIREMENT: { label: 'Virement' },
      VOUCHER_ORG: { label: 'Voucher Organisation' },
    };

    const config = mapping[methode] || { label: methode };
    return <Badge variant="info">{config.label}</Badge>;
  };

  if (isLoading && !paiement) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (!paiement) {
    return null;
  }

  const montant =
    paiement.montant_final ?? paiement.montant_initie ?? paiement.montant ?? paiement.montant_catalogue ?? 0;
  const montantFCFA = montant / 100;
  const etudiant = paiement.dossier?.apprenant || paiement.dossier?.etudiant || {};
  const session = paiement.dossier?.session || {};
  const formation = paiement.dossier?.formation || session.formation || {};
  const methodePaiement = paiement.methode || paiement.methode_paiement || paiement.provider || 'NGSER';

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
                Détail paiement
              </p>
              {getStatutBadge(paiement.statut)}
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-primary">
              Paiement {paiement.reference || paiement.id.slice(0, 8)}
            </h2>
            <p className="mt-1 text-sm text-subtext">
              Montant: {montantFCFA.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/backoffice/paiements')}
            >
              Retour à la liste
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <Card title="Informations générales">
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Référence
              </dt>
              <dd className="mt-1 text-sm text-text">
                {paiement.reference || paiement.id}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Statut
              </dt>
              <dd className="mt-1 text-sm text-text">
                {getStatutBadge(paiement.statut)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Montant
              </dt>
              <dd className="mt-1 text-sm font-semibold text-text">
                {montantFCFA.toLocaleString('fr-FR')} FCFA
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Méthode de paiement
              </dt>
              <dd className="mt-1 text-sm text-text">
                {getMethodeBadge(methodePaiement)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Date de création
              </dt>
              <dd className="mt-1 text-sm text-text">
                {new Date(paiement.created_at).toLocaleString('fr-FR')}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Date de confirmation
              </dt>
              <dd className="mt-1 text-sm text-text">
                {paiement.confirmed_at
                  ? new Date(paiement.confirmed_at).toLocaleString('fr-FR')
                  : 'Non confirmé'}
              </dd>
            </div>
          </dl>

          {(paiement.order_ngser || paiement.transaction_id || paiement.status_ngser) && (
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-4">
              {paiement.order_ngser && (
                <div>
                  <dt className="text-xs font-medium uppercase text-subtext">
                    Commande NGSER
                  </dt>
                  <dd className="mt-1 text-sm text-text">{paiement.order_ngser}</dd>
                </div>
              )}
              {paiement.transaction_id && (
                <div>
                  <dt className="text-xs font-medium uppercase text-subtext">
                    Transaction NGSER
                  </dt>
                  <dd className="mt-1 text-sm text-text">{paiement.transaction_id}</dd>
                </div>
              )}
              {paiement.status_ngser && (
                <div>
                  <dt className="text-xs font-medium uppercase text-subtext">
                    Statut NGSER
                  </dt>
                  <dd className="mt-1 text-sm text-text">{paiement.status_ngser}</dd>
                </div>
              )}
              {paiement.reconciled_at && (
                <div>
                  <dt className="text-xs font-medium uppercase text-subtext">
                    Réconcilié le
                  </dt>
                  <dd className="mt-1 text-sm text-text">
                    {new Date(paiement.reconciled_at).toLocaleString('fr-FR')}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {paiement.external_id && (
            <div className="mt-6">
              <dt className="text-xs font-medium uppercase text-subtext">
                ID externe (agrégateur)
              </dt>
              <dd className="mt-2 text-sm text-text">{paiement.external_id}</dd>
            </div>
          )}

          {paiement.echec_raison && (
            <div className="mt-6">
              <dt className="text-xs font-medium uppercase text-subtext">
                Raison de l'échec
              </dt>
              <dd className="mt-2 text-sm text-danger">{paiement.echec_raison}</dd>
            </div>
          )}
        </Card>

        <Card title="Informations étudiant">
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Nom complet
              </dt>
              <dd className="mt-1 text-sm text-text">
                {etudiant.nom} {etudiant.prenom}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Email
              </dt>
              <dd className="mt-1 text-sm text-text">{etudiant.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Téléphone
              </dt>
              <dd className="mt-1 text-sm text-text">
                {etudiant.telephone || 'Non renseigné'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Dossier
              </dt>
              <dd className="mt-1 text-sm text-text">
                <button
                  onClick={() =>
                    navigate(`/backoffice/dossiers/${paiement.dossier_id}`)
                  }
                  className="text-primary hover:underline"
                >
                  Voir le dossier
                </button>
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="Formation et session">
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Formation
              </dt>
              <dd className="mt-1 text-sm text-text">{formation.titre || formation.intitule || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Code formation
              </dt>
              <dd className="mt-1 text-sm text-text">{formation.code}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Prix formation
              </dt>
              <dd className="mt-1 text-sm text-text">
                {Math.round((formation.prix || formation.cout_catalogue || 0) / 100).toLocaleString('fr-FR')} FCFA
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-subtext">
                Dates de session
              </dt>
              <dd className="mt-1 text-sm text-text">
                {session.date_debut && session.date_fin
                  ? `${new Date(session.date_debut).toLocaleDateString('fr-FR')} - ${new Date(session.date_fin).toLocaleDateString('fr-FR')}`
                  : 'Non disponible'}
              </dd>
            </div>
          </dl>
        </Card>

        {paiement.tentatives > 0 && (
          <Card title="Historique des tentatives">
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-subtext">
                  Nombre de tentatives
                </span>
                <span className="text-sm font-medium text-text">
                  {paiement.tentatives} / 3
                </span>
              </div>
              {paiement.tentatives >= 3 && (
                <p className="mt-2 text-xs text-warning">
                  Maximum de tentatives atteint. Aucun nouveau paiement
                  ne peut être initié pour ce dossier.
                </p>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
