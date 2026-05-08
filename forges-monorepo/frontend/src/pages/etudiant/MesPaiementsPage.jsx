import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { etudiantApi } from '../../api/espace-etudiant.api';
import { formatCurrency } from '../../utils/currency';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';

/**
 * MesPaiementsPage - Gestion des paiements de l'apprenant
 * Route: /apprenant/paiements
 * Référence: MOD-06 Paiements
 */
export default function MesPaiementsPage() {
  const [dossiers, setDossiers] = useState([]);
  const [selectedDossier, setSelectedDossier] = useState(null);
  const [isPaiementModalOpen, setIsPaiementModalOpen] = useState(false);

  const { execute, isLoading } = useApi();
  const navigate = useNavigate();

  const loadDossiersEnAttentePaiement = async () => {
    await execute(() => etudiantApi.getMesDossiers({ statut: 'RETENU' }), {
      onSuccess: (data) => {
        setDossiers(Array.isArray(data) ? data : data?.data || data?.dossiers || []);
      },
    });
  };

  useEffect(() => {
    loadDossiersEnAttentePaiement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInitierPaiement = () => {
    if (!selectedDossier) return;
    setIsPaiementModalOpen(false);
    setSelectedDossier(null);
    navigate(`/apprenant/paiements/initier/${selectedDossier.id}`);
  };

  const openPaiementModal = (dossier) => {
    setSelectedDossier(dossier);
    setIsPaiementModalOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getFormation = (dossier) => dossier?.formation || dossier?.session?.formation;
  const getFormationTitre = (dossier) => {
    const formation = getFormation(dossier);
    return formation?.titre || formation?.intitule || 'N/A';
  };
  const getFormationTarif = (dossier) => {
    const formation = getFormation(dossier);
    return formation?.tarif || formation?.cout_catalogue || 0;
  };

  const calculateMontantFinal = (dossier) => {
    const tarif = getFormationTarif(dossier);
    const remise = dossier.montant_remise || 0;
    return tarif - remise;
  };

  const columns = [
    {
      key: 'formation',
      label: 'Formation',
      render: (_, dossier) => (
        <div>
          <div className="font-medium text-primary">
            {getFormationTitre(dossier)}
          </div>
          <div className="text-xs text-subtext">
            Session: {dossier.session?.titre || 'N/A'}
          </div>
        </div>
      ),
    },
    {
      key: 'montant',
      label: 'Montant à payer',
      render: (_, dossier) => {
        const montant = calculateMontantFinal(dossier);
        return (
          <div>
            <div className="font-semibold text-primary">
              {formatCurrency(montant)}
            </div>
            {dossier.montant_remise > 0 && (
              <div className="text-xs text-success">
                Remise: -{formatCurrency(dossier.montant_remise)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'date_limite',
      label: 'Date limite',
      render: (_, dossier) => {
        const dateRetenu = new Date(dossier.updated_at || dossier.updatedAt || dossier.created_at);
        const dateLimite = new Date(dateRetenu.getTime() + 72 * 60 * 60 * 1000);
        const isExpired = dateLimite < new Date();

        return (
          <div>
            <div className={isExpired ? 'text-danger' : 'text-text'}>
              {formatDate(dateLimite)}
            </div>
            {isExpired && (
              <Badge variant="danger" size="small">
                Expiré
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, dossier) => (
        <Button
          variant="primary"
          size="small"
          onClick={() => openPaiementModal(dossier)}
        >
          Payer maintenant
        </Button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-primary">Mes Paiements</h1>
        <p className="mt-2 text-subtext">
          Gérez vos paiements en attente et consultez votre historique
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-warning-soft bg-warning-soft p-4">
        <p className="text-sm text-warning">
          Vous disposez de 72 heures après la décision "Retenu" pour effectuer
          votre paiement. Passé ce délai, votre dossier sera annulé (RM-07).
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="large" />
        </div>
      ) : dossiers.length === 0 ? (
        <EmptyState
          title="Aucun paiement en attente"
          message="Vous n'avez pas de paiement en attente pour le moment."
          actionLabel="Voir mes dossiers"
          actionLink="/apprenant/dossiers"
        />
      ) : (
        <div className="rounded-lg bg-white shadow">
          <Table columns={columns} data={dossiers} />
        </div>
      )}

      <Modal
        isOpen={isPaiementModalOpen}
        onClose={() => {
          setIsPaiementModalOpen(false);
          setSelectedDossier(null);
        }}
        title="Effectuer le paiement"
      >
        {selectedDossier && (
          <div className="space-y-4">
            <div className="rounded-lg bg-bg p-4">
              <h4 className="mb-2 font-medium text-primary">Détails du paiement</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-subtext">Formation:</span>
                  <span className="font-medium">
                    {getFormationTitre(selectedDossier)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-subtext">Prix:</span>
                  <span>{formatCurrency(getFormationTarif(selectedDossier))}</span>
                </div>
                {selectedDossier.montant_remise > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Remise:</span>
                    <span>-{formatCurrency(selectedDossier.montant_remise)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 font-semibold text-primary">
                  <span>Montant à payer:</span>
                  <span>{formatCurrency(calculateMontantFinal(selectedDossier))}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-text">Moyen de paiement</label>
              <div className="rounded-lg border border-border bg-bg p-3 text-sm text-subtext">
                Vous serez redirigé vers une page de paiement sécurisée.
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsPaiementModalOpen(false);
                  setSelectedDossier(null);
                }}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                onClick={handleInitierPaiement}
                loading={isLoading}
                className="flex-1"
              >
                Confirmer le paiement
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
