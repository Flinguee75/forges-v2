import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import partenairesApi from '../../../api/partenaires.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/feedback/Spinner';
import Badge from '../../../components/ui/Badge';

export default function ApprobationPartenaire() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const { showToast } = useToast();
  const [partenaire, setPartenaire] = useState(null);
  const [responsableId, setResponsableId] = useState('');

  useEffect(() => {
    execute(() => partenairesApi.getPartenaireAdmin(id), {
      onSuccess: (data) => {
        setPartenaire(data);
        setResponsableId(data?.responsable_designe_id || '');
      },
      showErrorToast: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAction = async (action) => {
    const apiCall = {
      approve: () => partenairesApi.approuverPartenaire(id, { responsable_designe_id: responsableId || undefined }),
      reject: () => partenairesApi.refuserPartenaire(id),
      suspend: () => partenairesApi.suspendrePartenaire(id),
      reactivate: () => partenairesApi.reactiverPartenaire(id),
    }[action];

    await execute(apiCall, {
      onSuccess: (data) => {
        setPartenaire((current) => ({ ...current, statut: data?.statut || current.statut }));
        showToast('Action partenaire exécutée.', 'success');
      },
    });
  };

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
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">Approbation partenaire</p>
        <h2 className="mt-3 text-2xl font-semibold text-primary">{partenaire.raison_sociale}</h2>
        <div className="mt-3 flex gap-3">
          <Badge variant={partenaire.statut === 'ACTIF' ? 'success' : 'warning'}>{partenaire.statut}</Badge>
        </div>
      </div>

      <Card bodyClassName="space-y-4">
        <Input
          label="Responsable désigné"
          value={responsableId}
          onChange={(e) => setResponsableId(e.target.value)}
          placeholder="ID du responsable"
        />
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => handleAction('approve')} loading={isLoading}>
            Approuver
          </Button>
          <Button variant="outline" onClick={() => handleAction('reject')} loading={isLoading}>
            Refuser
          </Button>
          <Button variant="outline" onClick={() => handleAction('suspend')} loading={isLoading}>
            Suspendre
          </Button>
          <Button variant="outline" onClick={() => handleAction('reactivate')} loading={isLoading}>
            Réactiver
          </Button>
        </div>
      </Card>
    </div>
  );
}
