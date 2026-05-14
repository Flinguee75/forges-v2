import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { formationsApi } from '../../../api/formations.api';
import { getAllPartenaires } from '../../../api/partenaires.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/feedback/Spinner';
import EmptyState from '../../../components/feedback/EmptyState';
import FormationDetailView from '../../../components/formations/FormationDetailView';

export default function FormationDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { execute, isLoading, error } = useApi();
  const [formation, setFormation] = useState(null);
  const [partenaires, setPartenaires] = useState([]);
  const [partenaireId, setPartenaireId] = useState('');
  const [prixCoutantSoumis, setPrixCoutantSoumis] = useState('');

  const loadFormation = async () => {
    await execute(() => formationsApi.getByIdBackoffice(id), {
      onSuccess: (response) => {
        const data = response?.data || response;
        setFormation(data);
        if (data?.partenaire_id) {
          setPartenaireId(data.partenaire_id);
        }
      },
    });
  };

  const loadPartenaires = async () => {
    const fetcher = user?.role === 'SUPERVISEUR'
      ? formationsApi.getBackofficePartenaires
      : getAllPartenaires;
    await execute(() => fetcher(), {
      onSuccess: (response) => {
        setPartenaires(response?.data || []);
      },
    });
  };

  useEffect(() => {
    loadFormation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (formation && ['ADMIN', 'SUPERVISEUR'].includes(user?.role) && !formation.partenaire_id) {
      loadPartenaires();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formation, user?.role]);

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

  const handleLinkPartenaire = async () => {
    if (!partenaireId) {
      showToast('Sélectionnez un partenaire.', 'error');
      return;
    }

    const payload = {
      partenaire_id: partenaireId,
    };

    if (prixCoutantSoumis.trim() !== '') {
      payload.prix_coutant_soumis = Number(prixCoutantSoumis);
    }

    await execute(
      () => formationsApi.lierPartenaireBackoffice(id, payload),
      {
        onSuccess: async () => {
          showToast('Formation liée au partenaire avec succès.', 'success');
          setPrixCoutantSoumis('');
          await loadFormation();
        },
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
      {['ADMIN', 'SUPERVISEUR'].includes(user?.role) && !formation.partenaire_id && (
        <Card title="Lier à un partenaire" className="mt-5">
          <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
            <div>
              <label className="mb-2 block text-sm font-medium text-text" htmlFor="partenaire-select">
                Partenaire
              </label>
              <select
                id="partenaire-select"
                value={partenaireId}
                onChange={(event) => setPartenaireId(event.target.value)}
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-text focus:border-primary focus:outline-none"
              >
                <option value="">Sélectionner un partenaire</option>
                {partenaires.map((partenaire) => (
                  <option key={partenaire.id} value={partenaire.id}>
                    {partenaire.raison_sociale}{partenaire.statut ? ` (${partenaire.statut})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-text" htmlFor="prix-coutant-soumis">
                Prix coûtant proposé
              </label>
              <Input
                id="prix-coutant-soumis"
                type="number"
                min="0"
                placeholder={`Ex: ${formation.cout_catalogue}`}
                value={prixCoutantSoumis}
                onChange={(event) => setPrixCoutantSoumis(event.target.value)}
              />
            </div>
          </div>

          <p className="mt-3 text-sm text-subtext">
            Laisser le prix vide pour reprendre le tarif actuel de la formation.
          </p>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={handleLinkPartenaire} loading={isLoading}>
              Lier la formation
            </Button>
            <Button variant="outline" onClick={() => navigate('/backoffice/formations')}>
              Retour à la liste
            </Button>
          </div>
        </Card>
      )}
      {['ADMIN', 'SUPERVISEUR'].includes(user?.role) && formation.partenaire_id && (
        <Card title="Partenaire lié" className="mt-5">
          <div className="rounded-lg border border-border bg-[var(--color-bg)] p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-subtext">Partenaire actuel</p>
            <p className="mt-2 text-base font-semibold text-text">
              {formation.partenaire?.raison_sociale || formation.partenaire_id}
            </p>
          </div>
        </Card>
      )}
      <div className="mt-4 flex justify-start">
        <Button variant="outline" onClick={() => navigate('/backoffice/formations')}>Retour aux formations</Button>
      </div>
    </div>
  );
}
