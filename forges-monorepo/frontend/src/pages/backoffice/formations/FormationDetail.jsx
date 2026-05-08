import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { formationsApi } from '../../../api/formations.api';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/feedback/Spinner';
import EmptyState from '../../../components/feedback/EmptyState';
import FormationDetailView from '../../../components/formations/FormationDetailView';

export default function FormationDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { execute, isLoading, error } = useApi();
  const [formation, setFormation] = useState(null);

  const loadFormation = async () => {
    await execute(() => formationsApi.getByIdBackoffice(id), {
      onSuccess: (response) => {
        setFormation(response?.data || response);
      },
    });
  };

  useEffect(() => {
    loadFormation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleArchive = async () => {
    await execute(
      () => formationsApi.archiver(id),
      {
        onSuccess: () => loadFormation(),
      }
    );
  };

  const handlePublish = async () => {
    await execute(
      () => formationsApi.publier(id),
      {
        onSuccess: () => loadFormation(),
      }
    );
  };

  if (isLoading && !formation) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (error && !formation) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card>
          <EmptyState
            title="Formation indisponible"
            message={error}
            action={(
              <Button onClick={() => navigate('/backoffice/formations')}>
                Retour aux formations
              </Button>
            )}
          />
        </Card>
      </div>
    );
  }

  if (!formation) {
    return null;
  }

  const adminActions = (
    <>
      {formation.statut !== 'ACTIVE' && formation.statut !== 'ARCHIVEE' && (
        <Button variant="primary" onClick={handlePublish} loading={isLoading}>Publier</Button>
      )}
      <Button variant="outline" onClick={() => navigate(`/backoffice/formations/${formation.id}/edit`)}>Modifier</Button>
      {formation.statut !== 'ARCHIVEE' && (
        <Button variant="danger" onClick={handleArchive} loading={isLoading}>Archiver</Button>
      )}
    </>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <FormationDetailView formation={formation} showStatut actions={adminActions} />
      <div className="mt-4 flex justify-start">
        <Button variant="outline" onClick={() => navigate('/backoffice/formations')}>Retour aux formations</Button>
      </div>
    </div>
  );
}
