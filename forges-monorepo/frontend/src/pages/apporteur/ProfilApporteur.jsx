import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import apporteursApi from '../../api/apporteurs.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';

function getWorkflowConfig(statut) {
  const mapping = {
    EN_ATTENTE_VERIFICATION: { label: 'En attente', variant: 'gray' },
    ACTIF: { label: 'Actif', variant: 'success' },
    SUSPENDU: { label: 'Suspendu', variant: 'warning' },
    RESILIE: { label: 'Résilié', variant: 'danger' },
  };

  return mapping[statut] || { label: statut || 'Inconnu', variant: 'gray' };
}

function formatDate(dateString) {
  if (!dateString) {
    return 'N/A';
  }

  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ProfilApporteur() {
  const { showToast } = useToast();
  const { execute, isLoading, error } = useApi();
  const [profil, setProfil] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    pays: '',
  });

  const loadProfil = useCallback(async () => {
    await execute(
      () => apporteursApi.getMonProfil(),
      {
        onSuccess: (data) => {
          setProfil(data);
          setFormData({
            nom: data.nom || '',
            email: data.email || '',
            telephone: data.telephone || '',
            pays: data.pays || '',
          });
        },
      }
    );
  }, [execute]);

  useEffect(() => {
    loadProfil();
  }, [loadProfil]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      nom: formData.nom.trim(),
      email: formData.email.trim(),
      telephone: formData.telephone.trim() || undefined,
      pays: formData.pays.trim() || undefined,
    };

    await execute(
      () => apporteursApi.updateProfil(payload),
      {
        onSuccess: (data) => {
          setProfil(data);
          setFormData({
            nom: data.nom || '',
            email: data.email || '',
            telephone: data.telephone || '',
            pays: data.pays || '',
          });
          setIsEditing(false);
          showToast('Profil mis à jour avec succès.', 'success');
        },
      }
    );
  };

  const workflowConfig = useMemo(() => {
    return getWorkflowConfig(profil?.workflow_status || profil?.statut);
  }, [profil]);

  if (isLoading && !profil) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (!profil) {
    return (
      <EmptyState
        type={error ? 'error' : 'empty'}
        title="Profil indisponible"
        message={error || 'Impossible de charger votre profil.'}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-apporteur)]/70">
              Espace apporteur
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-text">Mon profil</h1>
            <p className="mt-2 text-sm text-subtext">
              Gérez vos informations de compte prises en charge par l’API apporteurs actuelle.
            </p>
          </div>
          <Badge variant={workflowConfig.variant} size="small">
            {workflowConfig.label}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <Card title="Informations générales">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="profil-type" className="mb-1.5 block text-sm font-medium text-text">
                Type
              </label>
              <input
                id="profil-type"
                value={profil.type === 'ORGANISATION' ? 'Organisation' : 'Individu'}
                disabled
                className="w-full rounded-lg border border-border bg-gray-50 px-4 py-2 text-sm text-subtext"
              />
            </div>
            <div>
              <label htmlFor="profil-taux" className="mb-1.5 block text-sm font-medium text-text">
                Taux de commission
              </label>
              <input
                id="profil-taux"
                value={`${profil.taux_commission_pct || 0}%`}
                disabled
                className="w-full rounded-lg border border-border bg-gray-50 px-4 py-2 text-sm text-subtext"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="profil-nom" className="mb-1.5 block text-sm font-medium text-text">
                Nom
              </label>
              <input
                id="profil-nom"
                value={formData.nom}
                onChange={(event) => setFormData((current) => ({ ...current, nom: event.target.value }))}
                disabled={!isEditing}
                className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:text-subtext"
              />
            </div>
            <div>
              <label htmlFor="profil-email" className="mb-1.5 block text-sm font-medium text-text">
                Email
              </label>
              <input
                id="profil-email"
                type="email"
                value={formData.email}
                onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                disabled={!isEditing}
                className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:text-subtext"
              />
            </div>
          </div>

            <div>
              <label htmlFor="profil-telephone" className="mb-1.5 block text-sm font-medium text-text">
                Téléphone
              </label>
              <input
                id="profil-telephone"
                value={formData.telephone}
                onChange={(event) => setFormData((current) => ({ ...current, telephone: event.target.value }))}
                disabled={!isEditing}
                className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:text-subtext"
              />
            </div>

            <div>
              <label htmlFor="profil-pays" className="mb-1.5 block text-sm font-medium text-text">
                Pays
              </label>
              <input
                id="profil-pays"
                value={formData.pays}
                onChange={(event) => setFormData((current) => ({ ...current, pays: event.target.value }))}
                disabled={!isEditing}
                className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50 disabled:text-subtext"
              />
            </div>

          <div className="flex gap-3 pt-2">
            {isEditing ? (
              <>
                <Button type="submit" loading={isLoading}>
                  Enregistrer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      nom: profil.nom || '',
                      email: profil.email || '',
                      telephone: profil.telephone || '',
                      pays: profil.pays || '',
                    });
                  }}
                >
                  Annuler
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
                Modifier
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Code de parrainage">
          <p className="font-mono text-sm text-text">{profil.code_apporteur || 'N/A'}</p>
        </Card>
        <Card title="Téléphone">
          <p className="text-sm text-text">{profil.telephone || 'N/A'}</p>
        </Card>
        <Card title="Pays">
          <p className="text-sm text-text">{profil.pays || 'N/A'}</p>
        </Card>
        <Card title="Date de création">
          <p className="text-sm text-text">{formatDate(profil.created_at)}</p>
        </Card>
      </div>
    </div>
  );
}
