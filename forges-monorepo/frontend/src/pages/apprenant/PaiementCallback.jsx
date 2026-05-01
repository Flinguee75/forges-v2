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

export default function PaiementCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paiementId = searchParams.get('paiement_id');
  const orderNgser = searchParams.get('order_ngser') || searchParams.get('order');
  const [paiement, setPaiement] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const title = useMemo(() => {
    if (paiement?.statut === 'CONFIRME') return 'Paiement confirmé';
    if (paiement?.statut === 'ECHOUE') return 'Paiement échoué';
    return 'Confirmation du paiement';
  }, [paiement?.statut]);

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

    return () => {
      isMounted = false;
    };
  }, [paiementId]);

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-primary">{title}</h1>
          <p className="mt-2 text-sm text-subtext">
            Le statut définitif est confirmé par webhook NGSER. Cette page affiche le dernier
            état connu par FORGES.
          </p>
        </div>

        {status === 'loading' && (
          <div className="flex justify-center py-8">
            <Spinner size="large" />
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-lg border border-danger bg-danger-soft p-4 text-sm text-danger">
            {error}
          </div>
        )}

        {status === 'ready' && (
          <div className="space-y-3 rounded-lg border border-border bg-bg p-4">
            <div className="flex items-center justify-between">
              <span className="text-subtext">Statut</span>
              <span>{getStatutBadge(paiement?.statut || 'PENDING')}</span>
            </div>
            {orderNgser && (
              <div className="flex items-center justify-between">
                <span className="text-subtext">Commande NGSER</span>
                <span className="font-medium text-text">{orderNgser}</span>
              </div>
            )}
            {paiement?.montant_final && (
              <div className="flex items-center justify-between">
                <span className="text-subtext">Montant</span>
                <span className="font-semibold text-primary">
                  {(paiement.montant_final / 100).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="primary" onClick={() => navigate('/apprenant/paiements')}>
            Voir mes paiements
          </Button>
          <Button variant="outline" onClick={() => navigate('/apprenant/dossiers')}>
            Voir mes dossiers
          </Button>
        </div>
      </Card>
    </div>
  );
}
