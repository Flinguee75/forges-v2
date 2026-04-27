import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import partenairesApi from '../../../api/partenaires.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/feedback/Spinner';

export default function PartenaireDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const [partenaire, setPartenaire] = useState(null);

  useEffect(() => {
    execute(() => partenairesApi.getPartenaireAdmin(id), {
      onSuccess: setPartenaire,
      showErrorToast: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading && !partenaire) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (!partenaire) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <p className="text-subtext">Partenaire introuvable.</p>
        <Button className="mt-4" onClick={() => navigate('/backoffice/partenaires')}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">Détail partenaire</p>
        <h2 className="mt-3 text-2xl font-semibold text-primary">{partenaire.raison_sociale}</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Badge variant={partenaire.statut === 'ACTIF' ? 'success' : 'warning'}>{partenaire.statut}</Badge>
          <Badge variant="info">{partenaire.type}</Badge>
        </div>
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <div><p className="text-xs uppercase tracking-[0.2em] text-subtext">Email</p><p className="mt-2">{partenaire.email_principal}</p></div>
          <div><p className="text-xs uppercase tracking-[0.2em] text-subtext">Commission FORGES</p><p className="mt-2">{partenaire.commission_forges_pct}%</p></div>
          <div><p className="text-xs uppercase tracking-[0.2em] text-subtext">Formations</p><p className="mt-2">{partenaire.formations?.length || 0}</p></div>
          <div><p className="text-xs uppercase tracking-[0.2em] text-subtext">Reversements</p><p className="mt-2">{(partenaire.commissions_partenaires?.length || 0) + (partenaire.commissions_partenaires_abonnement?.length || 0)}</p></div>
        </div>
      </Card>

      <Card title="Actions">
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate(`/backoffice/partenaires/${partenaire.id}/approuver`)}>
            Traiter
          </Button>
          <Button variant="outline" onClick={() => navigate('/backoffice/partenaires')}>
            Retour
          </Button>
        </div>
      </Card>
    </div>
  );
}
