import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { paiementsApi } from '../../api/paiements.api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Spinner from '../../components/feedback/Spinner';

function getStatutBadge(statut) {
  const mapping = {
    CONFIRME: { variant: 'success', label: 'Confirmé' },
    PENDING: { variant: 'warning', label: 'En attente' },
    EN_ATTENTE: { variant: 'gray', label: 'En attente' },
    ECHOUE: { variant: 'danger', label: 'Échoué' },
    EXPIRE: { variant: 'danger', label: 'Expiré' },
  };
  const config = mapping[statut] || { variant: 'gray', label: statut || 'Inconnu' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// status_id NGSER : 1=Succès, 0=Échec, 2=Échec montant insuffisant
function resolveNgserStatus(statusId) {
  const id = parseInt(statusId, 10);
  if (id === 1) return 'CONFIRME';
  if (id === 2) return 'ECHOUE'; // montant insuffisant
  return 'ECHOUE';
}

export default function PaiementCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Params legacy (depuis PaiementInitiation interne)
  const paiementId = searchParams.get('paiement_id');
  const orderNgser = searchParams.get('order_ngser') || searchParams.get('order');

  // Params NGSER Payment Data Transfer (redirection post-paiement réel)
  const orderId = searchParams.get('order_id');
  const statusId = searchParams.get('status_id');
  const statusParam = searchParams.get('status'); // 'success' | 'fail'
  const transactionId = searchParams.get('transaction_id');
  const transactionAmount = searchParams.get('transaction_amount');

  const isNgserRedirect = Boolean(orderId && statusId !== null);

  const [paiement, setPaiement] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const ngserStatut = isNgserRedirect ? resolveNgserStatus(statusId) : null;

  const title = useMemo(() => {
    const statut = paiement?.statut || ngserStatut;
    if (statut === 'CONFIRME') return 'Paiement confirmé';
    if (statut === 'ECHOUE') return 'Paiement échoué';
    if (statusParam === 'success') return 'Paiement confirmé';
    if (statusParam === 'fail') return 'Paiement échoué';
    return 'Confirmation du paiement';
  }, [paiement?.statut, ngserStatut, statusParam]);

  useEffect(() => {
    let isMounted = true;

    async function loadPaiement() {
      if (!paiementId) {
        setStatus('ready');
        return;
      }
      try {
        const data = await paiementsApi.getById(paiementId);
        if (!isMounted) return;
        setPaiement(data);
        setStatus('ready');
      } catch (loadError) {
        if (!isMounted) return;
        setError(loadError?.message || 'Statut paiement indisponible.');
        setStatus('error');
      }
    }

    loadPaiement();
    return () => { isMounted = false; };
  }, [paiementId]);

  const statutAffiche = paiement?.statut || ngserStatut || 'PENDING';
  const succes = statutAffiche === 'CONFIRME' || statusParam === 'success';
  const echec = statutAffiche === 'ECHOUE' || statusParam === 'fail';

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{title}</h1>
          <p className="mt-2 text-sm text-subtext">
            Le statut définitif est confirmé par notification NGSER. Cette page affiche le dernier
            état connu par FORGES.
          </p>
        </div>

        {status === 'loading' && !isNgserRedirect && (
          <div className="flex justify-center py-8">
            <Spinner size="large" />
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-lg border border-danger bg-danger-soft p-4 text-sm text-danger">
            {error}
          </div>
        )}

        {(status === 'ready' || isNgserRedirect) && (
          <div className="space-y-3 rounded-lg border border-border bg-bg p-4">

            <div className="flex items-center justify-between">
              <span className="text-subtext">Statut</span>
              <span>{getStatutBadge(statutAffiche)}</span>
            </div>

            {(orderId || orderNgser) && (
              <div className="flex items-center justify-between">
                <span className="text-subtext">Commande NGSER</span>
                <span className="font-medium text-text">{orderId || orderNgser}</span>
              </div>
            )}

            {transactionId && (
              <div className="flex items-center justify-between">
                <span className="text-subtext">Transaction</span>
                <span className="font-medium text-text">{transactionId}</span>
              </div>
            )}

            {(transactionAmount || paiement?.montant_final) && (
              <div className="flex items-center justify-between">
                <span className="text-subtext">Montant</span>
                <span className="font-semibold text-primary">
                  {transactionAmount
                    ? Number(transactionAmount).toLocaleString('fr-FR')
                    : (paiement.montant_final / 100).toLocaleString('fr-FR')
                  } FCFA
                </span>
              </div>
            )}

            {/* Détails de la formation */}
            {paiement?.dossier?.formation && (
              <>
                <div className="my-3 border-t border-border" />
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-primary">Formation</div>
                  <div className="rounded-lg bg-white p-3">
                    <div className="font-medium text-text">
                      {paiement.dossier.formation.intitule}
                    </div>
                    {paiement.dossier.formation.type_formation && (
                      <div className="mt-1 text-xs text-subtext">
                        Type : {paiement.dossier.formation.type_formation}
                      </div>
                    )}
                    {paiement.dossier.session && (
                      <div className="mt-2 text-xs text-subtext">
                        <span className="font-medium">Session :</span>{' '}
                        {new Date(paiement.dossier.session.date_debut).toLocaleDateString('fr-FR')} —{' '}
                        {new Date(paiement.dossier.session.date_fin).toLocaleDateString('fr-FR')}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {echec && parseInt(statusId, 10) === 2 && (
              <div className="rounded-lg border border-warning bg-warning-soft p-3 text-sm text-warning">
                Le paiement a échoué en raison d'un montant insuffisant sur votre compte.
              </div>
            )}
          </div>
        )}

        {succes && (
          <div className="rounded-lg border border-success bg-success-soft p-3 text-sm text-success">
            Votre paiement a été confirmé. Votre accès à la formation est maintenant actif.
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          {succes && paiement?.dossier?.formation?.mode_formation === 'A_LA_DEMANDE' && (
            <Button
              variant="primary"
              onClick={() => navigate('/apprenant/formations-a-la-demande')}
            >
              Accéder à la formation
            </Button>
          )}
          {succes && paiement?.dossier?.formation?.mode_formation === 'AVEC_SESSION' && (
            <Button
              variant="primary"
              onClick={() => navigate(`/apprenant/dossiers/${paiement.dossier.id}`)}
            >
              Voir mon dossier
            </Button>
          )}
          <Button variant={succes ? 'outline' : 'primary'} onClick={() => navigate('/apprenant/dossiers')}>
            Voir mes dossiers
          </Button>
          <Button variant="outline" onClick={() => navigate('/apprenant/paiements')}>
            Voir mes paiements
          </Button>
        </div>
      </Card>
    </div>
  );
}
