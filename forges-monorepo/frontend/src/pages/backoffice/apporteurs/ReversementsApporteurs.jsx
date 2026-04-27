import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import apporteursApi from '../../../api/apporteurs.api';
import agentApi from '../../../api/agent.api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/feedback/Spinner';
import EmptyState from '../../../components/feedback/EmptyState';
import Modal from '../../../components/ui/Modal';

function getPreviousMonth() {
  const currentDate = new Date();
  currentDate.setMonth(currentDate.getMonth() - 1);
  return currentDate.toISOString().slice(0, 7);
}

function formatMontant(centimes) {
  const montantXOF = Math.round(Number(centimes || 0) / 100);
  return `${montantXOF.toLocaleString('fr-FR')} FCFA`;
}

function formatMonthLabel(month) {
  if (!month) {
    return 'N/A';
  }

  const [year, monthNumber] = month.split('-');
  return new Date(Number(year), Number(monthNumber) - 1, 1).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
  });
}

export default function ReversementsApporteurs() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { execute, isLoading, error } = useApi();

  const [selectedMonth, setSelectedMonth] = useState(getPreviousMonth());
  const [rapport, setRapport] = useState(null);
  const [reversements, setReversements] = useState([]);
  const [selectedReversement, setSelectedReversement] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isValidationLoading, setIsValidationLoading] = useState(false);

  const isAgentMode = user?.role === 'AGENT';
  const isConsolidatedMode = user?.role === 'SUPERVISEUR' || user?.role === 'ADMIN';
  const isAdminMode = user?.role === 'ADMIN';

  const loadData = useCallback(async () => {
    if (isAgentMode) {
      await execute(
        () => agentApi.getReversementsApporteurs(),
        {
          showErrorToast: false,
          onSuccess: (data) => {
            setReversements(data?.data || data?.reversements || []);
          },
        }
      );
      return;
    }

    if (isConsolidatedMode) {
      await execute(
        () => apporteursApi.getRapportMensuel({ mois: selectedMonth }),
        {
          showErrorToast: false,
          onSuccess: (data) => {
            setRapport(data);
          },
        }
      );
    }
  }, [execute, isAgentMode, isConsolidatedMode, selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const agentTotals = useMemo(() => {
    return reversements.reduce(
      (acc, item) => {
        acc.totalDue += Number(item.montant_total_xof || 0);
        acc.totalTransactions += Number(item.nb_commissions || 0);
        return acc;
      },
      { totalDue: 0, totalTransactions: 0 }
    );
  }, [reversements]);

  const supervisorRows = useMemo(() => {
    return Array.isArray(rapport?.top_apporteurs) ? rapport.top_apporteurs : [];
  }, [rapport]);

  const supervisorTotals = useMemo(() => {
    return {
      nbApporteursActifs: Number(rapport?.nb_apporteurs_actifs || 0),
      commissionsTotales: Number(rapport?.commissions_totales_dues_xof || 0),
      topCount: supervisorRows.length,
    };
  }, [rapport, supervisorRows.length]);

  const handleOpenValidation = (reversement) => {
    setSelectedReversement(reversement);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmValidation = async () => {
    if (!selectedReversement?.apporteur_id) {
      return;
    }

    setIsValidationLoading(true);

    try {
      await execute(
        () => agentApi.effectuerReversementApporteur(selectedReversement.apporteur_id),
        {
          showSuccessToast: false,
          showErrorToast: false,
        }
      );
      showToast('Reversement effectué avec succès.', 'success');
      setIsConfirmModalOpen(false);
      setSelectedReversement(null);
      await loadData();
    } catch (requestError) {
      showToast(requestError?.message || 'Erreur lors de la validation du reversement.', 'error');
    } finally {
      setIsValidationLoading(false);
    }
  };

  if (!isAgentMode && !isConsolidatedMode) {
    return (
      <EmptyState
        type="error"
        title="Vue reversements indisponible"
        message="Cette vue n'est exposée que pour les rôles Agent, Admin et Superviseur."
      />
    );
  }

  if (isLoading && !reversements.length && !rapport) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
              Reversements apporteurs
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">
              {isAgentMode ? 'File des reversements à effectuer' : 'Tableau mensuel apporteurs'}
            </h2>
            <p className="mt-2 text-subtext">
              {isAgentMode
                ? 'Consultez les reversements apporteurs validés en attente de paiement et déclenchez la validation depuis le runtime.'
                : isAdminMode
                  ? 'Consultez le résumé mensuel consolidé depuis le runtime. Le détail individuel reste figé volontairement.'
                  : 'Consultez le résumé mensuel superviseur. Le détail individuel reste figé volontairement.'}
            </p>
          </div>

          {isConsolidatedMode && (
            <div className="w-full md:w-56">
              <label className="mb-1.5 block text-sm font-medium text-text">
                Mois
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {isAgentMode && (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <Card title="Apporteurs à payer">
              <p className="text-2xl font-semibold text-primary">{reversements.length}</p>
            </Card>
            <Card title="Commissions à reverser">
              <p className="text-2xl font-semibold text-warning">
                {formatMontant(agentTotals.totalDue)}
              </p>
            </Card>
            <Card title="Transactions concernées">
              <p className="text-2xl font-semibold text-text">{agentTotals.totalTransactions}</p>
            </Card>
          </div>

          <Card>
            {reversements.length === 0 ? (
              <EmptyState
                title="Aucun reversement en attente"
                message="Le backend ne renvoie aucun apporteur éligible au reversement pour le moment."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-sm font-semibold text-primary">
                      <th className="pb-3">Apporteur</th>
                      <th className="pb-3">Code</th>
                      <th className="pb-3 text-right">Commissions</th>
                      <th className="pb-3 text-right">Montant</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reversements.map((reversement) => (
                      <tr key={reversement.apporteur_id} className="border-b border-border">
                        <td className="py-4">
                          <div>
                            <p className="font-medium text-text">{reversement.nom}</p>
                            <p className="text-sm text-subtext">{reversement.email}</p>
                          </div>
                        </td>
                        <td className="py-4 text-sm text-subtext">
                          <span className="font-mono">{reversement.code_apporteur || 'N/A'}</span>
                        </td>
                        <td className="py-4 text-right text-sm text-text">
                          {reversement.nb_commissions || 0}
                        </td>
                        <td className="py-4 text-right text-sm font-medium text-text">
                          {formatMontant(reversement.montant_total_xof)}
                        </td>
                        <td className="py-4 text-right">
                          <Button
                            size="small"
                            onClick={() => handleOpenValidation(reversement)}
                          >
                            Effectuer le reversement
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {isConsolidatedMode && (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <Card title="Apporteurs actifs">
              <p className="text-2xl font-semibold text-primary">
                {supervisorTotals.nbApporteursActifs}
              </p>
            </Card>
            <Card title="Commissions dues">
              <p className="text-2xl font-semibold text-warning">
                {formatMontant(supervisorTotals.commissionsTotales)}
              </p>
            </Card>
            <Card title="Top apporteurs">
              <p className="text-2xl font-semibold text-text">
                {supervisorTotals.topCount}
              </p>
            </Card>
          </div>

          <Card title={`Top apporteurs - ${formatMonthLabel(selectedMonth)}`}>
            {supervisorRows.length === 0 ? (
              <EmptyState
                title="Aucune donnée pour ce mois"
                message="Le tableau superviseur ne contient aucun apporteur pour la période sélectionnée."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-sm font-semibold text-primary">
                      <th className="pb-3">Apporteur</th>
                      <th className="pb-3 text-right">Transactions</th>
                      <th className="pb-3 text-right">Montant base</th>
                      <th className="pb-3 text-right">Commission due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supervisorRows.map((item) => (
                      <tr key={item.apporteur_id} className="border-b border-border">
                        <td className="py-4">
                          <div>
                            <p className="font-medium text-text">
                              {item.nom || `Apporteur ${item.apporteur_id}`}
                            </p>
                            <p className="text-sm text-subtext">
                              {item.email || item.code_apporteur || item.apporteur_id}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 text-right text-sm text-text">
                          {item.nb_transactions || 0}
                        </td>
                        <td className="py-4 text-right text-sm text-text">
                          {formatMontant(item.montant_base)}
                        </td>
                        <td className="py-4 text-right text-sm font-medium text-text">
                          {formatMontant(item.montant_commission)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          if (!isValidationLoading) {
            setIsConfirmModalOpen(false);
            setSelectedReversement(null);
          }
        }}
        title="Confirmer le reversement"
      >
        <p className="mb-6 text-subtext">
          {selectedReversement
            ? `Confirmer l'exécution du reversement pour ${selectedReversement.nom || selectedReversement.apporteur_id} ?`
            : 'Confirmer cette opération ?'}
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (!isValidationLoading) {
                setIsConfirmModalOpen(false);
                setSelectedReversement(null);
              }
            }}
            disabled={isValidationLoading}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmValidation}
            loading={isValidationLoading}
          >
            Confirmer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
