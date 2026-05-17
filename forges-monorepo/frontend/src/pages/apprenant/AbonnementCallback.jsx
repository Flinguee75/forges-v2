import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apprenantApi from '../../api/espace-apprenant.api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Spinner from '../../components/feedback/Spinner';

// status_id NGSER : 1=Succes, 0/2/4/5=Echec
function resolveStatus(statusId, statusParam) {
  if (statusParam === 'success') return 'SUCCESS';
  if (statusParam === 'fail') return 'FAIL';
  const id = parseInt(statusId, 10);
  if (id === 1) return 'SUCCESS';
  return 'FAIL';
}

export default function AbonnementCallback() {
  const [searchParams] = useSearchParams();

  const orderId = searchParams.get('order_id');
  const statusId = searchParams.get('status_id');
  const statusParam = searchParams.get('status');
  const transactionId = searchParams.get('transaction_id');

  const status = resolveStatus(statusId, statusParam);
  const succes = status === 'SUCCESS';
  const echec = status === 'FAIL';

  const [abonnement, setAbonnement] = useState(null);
  const [checking, setChecking] = useState(succes);

  useEffect(() => {
    if (!succes) return;

    let attempts = 0;
    const MAX = 6;

    async function pollAbonnement() {
      try {
        const data = await apprenantApi.getMonAbonnementRetail();
        if (data?.statut === 'ACTIF') {
          setAbonnement(data);
          setChecking(false);
          return;
        }
      } catch {
        // pas encore actif
      }

      attempts += 1;
      if (attempts < MAX) {
        setTimeout(pollAbonnement, 2000);
      } else {
        setChecking(false);
      }
    }

    pollAbonnement();
  }, [succes]);

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="space-y-5">

        <div>
          <h1 className="text-2xl font-semibold text-primary">
            {succes ? 'Abonnement confirme' : 'Paiement non abouti'}
          </h1>
          <p className="mt-2 text-sm text-subtext">
            {succes
              ? "Votre premier prelevement a ete pris en compte. Votre abonnement est en cours d'activation."
              : "Le paiement n'a pas pu etre traite. Votre abonnement n'a pas ete active."}
          </p>
        </div>

        {succes && checking && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-bg p-4">
            <Spinner size="small" />
            <span className="text-sm text-subtext">Verification de l'activation en cours...</span>
          </div>
        )}

        {succes && !checking && abonnement && (
          <div className="space-y-3 rounded-lg border border-success bg-success/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-subtext text-sm">Statut</span>
              <Badge variant="success">Actif</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-subtext text-sm">Offre</span>
              <span className="font-semibold text-text">{abonnement.offre}</span>
            </div>
            {orderId && (
              <div className="flex items-center justify-between">
                <span className="text-subtext text-sm">Reference NGSER</span>
                <span className="font-medium text-text text-sm">{orderId}</span>
              </div>
            )}
            {transactionId && (
              <div className="flex items-center justify-between">
                <span className="text-subtext text-sm">Transaction</span>
                <span className="font-medium text-text text-sm">{transactionId}</span>
              </div>
            )}
          </div>
        )}

        {succes && !checking && !abonnement && (
          <div className="rounded-lg border border-warning bg-warning/5 p-4 text-sm text-warning">
            La confirmation est en cours de traitement. Votre abonnement sera active sous quelques minutes.
            Consultez votre espace abonnement pour verifier le statut.
          </div>
        )}

        {echec && (
          <div className="rounded-lg border border-danger bg-danger/5 p-4 text-sm text-danger">
            Le paiement a echoue ou a ete annule. Aucun prelevement n'a ete effectue.
            Vous pouvez reessayer depuis la page de souscription.
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {succes ? (
            <Link to="/apprenant/abonnement">
              <Button variant="primary" data-testid="btn-voir-abonnement">
                Voir mon abonnement
              </Button>
            </Link>
          ) : (
            <Link to="/apprenant/abonnement/souscrire">
              <Button variant="primary" data-testid="btn-reessayer">
                Reessayer
              </Button>
            </Link>
          )}
          <Link to="/apprenant">
            <Button variant="outline">Tableau de bord</Button>
          </Link>
        </div>

      </Card>
    </div>
  );
}
