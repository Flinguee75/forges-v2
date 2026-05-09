import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formationsApi } from '../../api/formations.api';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/ui/Button';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';
import FormationDetailView from '../../components/formations/FormationDetailView';

export default function FormationDetailApprenantPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { execute, isLoading, error } = useApi();
  const [formation, setFormation] = useState(null);

  useEffect(() => {
    execute(() => formationsApi.getFormationDetail(id), {
      onSuccess: (response) => setFormation(response?.data || response),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
            action={
              <Button onClick={() => navigate('/apprenant/catalogue')}>
                Retour au catalogue
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  if (!formation) return null;

  const apprenantActions = null;

  return (
    <div className="mx-auto max-w-5xl">
      <button
        type="button"
        onClick={() => navigate('/apprenant/catalogue')}
        className="mb-4 text-sm text-primary hover:underline"
      >
        &larr; Retour au catalogue
      </button>
      <FormationDetailView formation={formation} actions={apprenantActions} />
      <div className="mt-6 pb-6">
        <Button variant="outline" onClick={() => navigate('/apprenant/catalogue')}>
          Retour au catalogue
        </Button>
      </div>
    </div>
  );
}
