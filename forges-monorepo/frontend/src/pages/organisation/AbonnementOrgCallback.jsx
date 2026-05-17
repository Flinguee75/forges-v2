import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { organisationApi } from '../../api/espace-organisation.api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Spinner from '../../components/feedback/Spinner';

function resolveStatus(statusId, statusParam) {
  if (statusParam === 'success') return 'SUCCESS';
  if (statusParam === 'fail') return 'FAIL';
  const id = parseInt(statusId, 10);
  if (id === 1) return 'SUCCESS';
  return 'FAIL';
}

export default function AbonnementOrgCallback() {
  const [searchParams] = useSearchParams();

  const orderId = searchParams.get('order_id');
  const statusId = searchParams.get('status_id');
  const statusParam = searchParams.get('status');
  const transactionId = searchParams.get('transaction_id');

  const status = resolveStatus(statusId, statusParam);
  const succes = status === 'SUCCESS';

  const [abonnement, setAbonnement] = useState(null);
  const [checking, setChecking] = useState(succes);

  useEffect(() => {
    if (!succes) return;

    let attempts = 0;
    const MAX = 8;

    async function poll() {
      try {
        const data = await organisationApi.getAbonnementOrganisation();
        if (data?.statut === 'ACTIF') {
          setAbonnement(data);
          setChecking(false);
          return;
        }
      } catch {
        // IPN pas encore traité
      }

      attempts += 1;
      if (attempts < MAX) {
        setTimeout(poll, 2000);
      } else {
        setChecking(false);
      }
    }

    poll();
  }, [succes]);

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold text-primary">
            {succes ? 'Paiement reçu' : 'Paiement non abouti'}
          </h1>
          <p className="mt-2 text-sm text-subtext">
            {succes
              ? "Votre paiement a été transmis. L'abonnement organisation est en cours d'activation."
              : "Le paiement n'a pas pu être traité. Votre abonnement n'a pas été activé."}
          </p>
        </div>

        {succes && checking && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-bg p-4">
            <Spinner size="small" />
            <span className="text-sm text-subtext">Vérification de l&apos;activation en cours...</span>
          </div>
        )}

        {succes && !checking && abonnement && (
          <div className="space-y-3 rounded-lg border border-success bg-success/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-subtext">Statut</span>
              <Badge variant="success" size="small">Actif</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-subtext">Offre</span>
              <span className="font-semibold text-text">{abonnement.offre}</span>
            </div>
            {orderId && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-subtext">Référence NGSER</span>
                <span className="font-medium text-sm text-text">{orderId}</span>
              </div>
            )}
            {transactionId && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-subtext">Transaction</span>
                <span className="font-medium text-sm text-text">{transactionId}</span>
              </div>
            )}
          </div>
        )}

        {succes && !checking && !abonnement && (
          <div className="rounded-lg border border-warning bg-warning/5 p-4 text-sm text-warning">
            La confirmation est en cours de traitement. Votre abonnement sera activé sous quelques minutes.
            Consultez votre espace abonnement pour vérifier le statut.
          </div>
        )}

        {!succes && (
          <div className="rounded-lg border border-danger bg-danger/5 p-4 text-sm text-danger">
            Le paiement a échoué ou a été annulé. Aucun prélèvement n&apos;a été effectué.
            Vous pouvez réessayer depuis la page de souscription.
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {succes ? (
            <Link to="/organisation/abonnement">
              <Button variant="primary" data-testid="btn-voir-abonnement-org">
                Voir mon abonnement
              </Button>
            </Link>
          ) : (
            <Link to="/organisation/abonnement/souscrire">
              <Button variant="primary" data-testid="btn-reessayer-org">
                Réessayer
              </Button>
            </Link>
          )}
          <Link to="/organisation/dashboard">
            <Button variant="outline">Tableau de bord</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
