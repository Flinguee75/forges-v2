import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { etudiantApi } from '../../api/espace-etudiant.api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';

/**
 * MesAttestationsPage - Téléchargement des attestations de formation apprenant
 * Route: /apprenant/attestations
 * Référence: MOD-09 Espace Apprenant
 */
export default function MesAttestationsPage() {
  const [dossiers, setDossiers] = useState([]);
  const [searchParams] = useSearchParams();

  const { execute, isLoading } = useApi();
  const { showToast } = useToast();

  const loadAttestations = async () => {
    await execute(() => etudiantApi.getMesAttestations(), {
      onSuccess: (data) => {
        setDossiers(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
      },
    });
  };

  useEffect(() => {
    loadAttestations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownloadAttestation = async (dossierId, formationTitre) => {
    try {
      const response = await etudiantApi.getAttestation(dossierId);
      const blob = response instanceof Blob
        ? response
        : new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attestation-${formationTitre.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('Attestation téléchargée avec succès', 'success');
    } catch (error) {
      showToast(
        error.message || 'Erreur lors du téléchargement de l\'attestation',
        'error'
      );
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getFormationTitre = (dossier) =>
    (typeof dossier?.formation === 'string' ? dossier.formation : null) ||
    dossier?.formation?.titre ||
    dossier?.formation?.intitule ||
    dossier?.formation_titre ||
    dossier?.session?.formation?.titre ||
    dossier?.session?.formation?.intitule ||
    'N/A';
  const getSessionLabel = (dossier) => dossier?.session?.titre || 'Attestation disponible';
  const getDateDebut = (dossier) => dossier?.date_debut || dossier?.session?.date_debut;
  const getDateFin = (dossier) => dossier?.date_fin || dossier?.session?.date_fin;
  const getDossierId = (dossier) => dossier?.dossier_id || dossier?.id;

  const columns = [
    {
      key: 'formation',
      label: 'Formation',
      render: (_value, dossier) => (
        <div>
          <div className="font-medium text-primary">
            {getFormationTitre(dossier)}
          </div>
          <div className="text-xs text-subtext">
            Session: {getSessionLabel(dossier)}
          </div>
        </div>
      ),
    },
    {
      key: 'dates',
      label: 'Dates de la session',
      render: (_value, dossier) => (
        <div className="text-sm">
          <div>Début: {formatDate(getDateDebut(dossier))}</div>
          <div>Fin: {formatDate(getDateFin(dossier))}</div>
        </div>
      ),
    },
    {
      key: 'statut',
      label: 'Statut',
      render: () => <Badge variant="success">Confirmé</Badge>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_value, dossier) => (
        <Button
          variant="primary"
          size="small"
          onClick={() =>
            handleDownloadAttestation(
              getDossierId(dossier),
              getFormationTitre(dossier) || 'formation'
            )
          }
        >
          Télécharger l'attestation
        </Button>
      ),
    },
  ];

  // Highlight du dossier si passé en paramètre
  const highlightedDossierId = searchParams.get('dossier');

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-primary">Mes Attestations</h1>
        <p className="mt-2 text-subtext">
          Téléchargez vos attestations de formation confirmées
        </p>
      </div>

      {highlightedDossierId && (
        <div className="mb-6 rounded-lg border border-success-soft bg-success-soft p-4">
          <p className="text-sm text-success">
            Votre dossier a été confirmé. Vous pouvez maintenant télécharger votre
            attestation.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="large" />
        </div>
      ) : dossiers.length === 0 ? (
        <EmptyState
          title="Aucune attestation disponible"
          message="Vous n'avez pas encore de formation confirmée. Une fois votre paiement validé, vous pourrez télécharger votre attestation ici."
          actionLabel="Voir mes dossiers"
          actionLink="/apprenant/dossiers"
        />
      ) : (
        <div className="rounded-lg bg-white shadow">
          <Table
            columns={columns}
            data={dossiers}
            highlightedId={highlightedDossierId}
          />
        </div>
      )}

      <div className="mt-6 rounded-lg bg-bg p-4">
        <h3 className="mb-2 text-sm font-semibold text-primary">
          À propos des attestations
        </h3>
        <ul className="space-y-1 text-sm text-subtext">
          <li>
            • Les attestations sont générées automatiquement après la confirmation du
            paiement
          </li>
          <li>
            • Chaque attestation est un document PDF officiel signé par FORGES
          </li>
          <li>
            • Vous pouvez télécharger vos attestations autant de fois que nécessaire
          </li>
          <li>
            • En cas de problème, contactez le support à{' '}
            <a href="mailto:contact@forges.ci" className="text-primary hover:underline">
              contact@forges.ci
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
