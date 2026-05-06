import { useState, useEffect } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import agentApi from '../../../api/agent.api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/feedback/Spinner';
import Pagination from '../../../components/ui/Pagination';

/**
 * ReversementsPartenaires - Gestion des reversements partenaires
 * Route: /backoffice/reversements-partenaires
 * Accessible à: AGENT (écriture), SUPERVISEUR (lecture), ADMIN
 *
 * ⚠️ RÈGLE CRITIQUE ⚠️
 * RM-130: NE JAMAIS afficher commission_forges_pct ou prix_catalogue
 * Afficher UNIQUEMENT le prix_coutant net que le partenaire reçoit
 *
 * Référence: F-14 Backoffice Partenaires (ForgesTODO v2.md)
 */
export default function ReversementsPartenaires() {
  const { user } = useAuth();
  const { execute, isLoading } = useApi();
  const { showToast } = useToast();

  const [reversements, setReversements] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    mois: '',
    partenaire: '',
    statut: '',
  });
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedReversement, setSelectedReversement] = useState(null);
  const [referenceReversement, setReferenceReversement] = useState('');

  const isAgent = user?.role === 'AGENT' || user?.role === 'ADMIN';
  const isSuperviseur = user?.role === 'SUPERVISEUR';

  useEffect(() => {
    loadReversements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadReversements = async (page = 1) => {
    await execute(
      () =>
        agentApi.getReversementsPartenaires({
          page,
          limit: 10,
          ...filters,
        }),
      {
        onSuccess: (data) => {
          setReversements(data.data || []);
          setMeta(data.meta || { page: 1, totalPages: 1, total: 0 });
        },
      }
    );
  };

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
  };

  const getStatutBadge = (statut) => {
    const mapping = {
      EN_ATTENTE: { variant: 'warning', label: 'En attente' },
      VALIDE: { variant: 'success', label: 'Validé' },
      PAYE: { variant: 'success', label: 'Payé' },
    };

    const config = mapping[statut] || { variant: 'gray', label: statut };
    return <Badge variant={config.variant} size="small">{config.label}</Badge>;
  };

  const formatMois = (mois) => {
    if (!mois) return 'N/A';
    const [annee, moisNum] = mois.split('-');
    const date = new Date(annee, parseInt(moisNum) - 1);
    return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleValiderReversement = (reversement) => {
    setSelectedReversement(reversement);
    setReferenceReversement('');
    setIsConfirmModalOpen(true);
  };

  const confirmValiderReversement = async () => {
    if (!referenceReversement.trim()) {
      showToast('Veuillez saisir une référence de paiement', 'error');
      return;
    }

    await execute(
      () =>
        agentApi.effectuerReversementPartenaire(
          selectedReversement.partenaire_id || selectedReversement.id,
          {
            preuve_virement: referenceReversement,
            date_execution: new Date().toISOString(),
          }
        ),
      {
        onSuccess: () => {
          showToast('Reversement validé avec succès', 'success');
          setIsConfirmModalOpen(false);
          setSelectedReversement(null);
          setReferenceReversement('');
          loadReversements();
        },
      }
    );
  };

  // Calcul des totaux
  const totaux = reversements.reduce(
    (acc, rev) => {
      if (rev.statut === 'EN_ATTENTE') {
        acc.enAttente += rev.montant_net || 0;
      }
      acc.total += rev.montant_net || 0;
      return acc;
    },
    { enAttente: 0, total: 0 }
  );

  if (isLoading && reversements.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
            Gestion financière
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-primary">
            Reversements partenaires
          </h2>
          <p className="mt-2 text-subtext">
            {isAgent
              ? 'Gérez les reversements mensuels aux partenaires fournisseurs.'
              : 'Consultez les reversements mensuels aux partenaires fournisseurs.'}
          </p>
          {isSuperviseur && (
            <p className="mt-2 text-sm italic text-warning">
              Mode lecture seule - Seul l'Agent Comptable peut valider les reversements.
            </p>
          )}
        </div>
      </div>

      {/* RM-130: Note importante */}
      <div className="mb-6 rounded-lg border-2 border-warning bg-warning/10 p-4">
        <p className="text-sm font-semibold text-warning">
          Montants nets uniquement
        </p>
        <p className="mt-1 text-sm text-subtext">
          Les montants affichés sont les prix coûtants nets à reverser aux partenaires.
          La commission FORGES et les prix catalogue ne sont JAMAIS affichés ici.
        </p>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Rechercher par partenaire..."
              value={filters.partenaire}
              onChange={(e) => handleFilterChange('partenaire', e.target.value)}
            />
          </div>
          <div className="w-48">
            <input
              type="month"
              value={filters.mois}
              onChange={(e) => handleFilterChange('mois', e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none"
            />
          </div>
          <div className="w-48">
            <select
              value={filters.statut}
              onChange={(e) => handleFilterChange('statut', e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none"
            >
              <option value="">Tous les statuts</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="VALIDE">Validé</option>
            </select>
          </div>
        </div>

        {/* Totaux */}
        <div className="mb-6 grid gap-4 rounded-lg border border-border bg-gray-50 p-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-subtext">Total à reverser ce mois</p>
            <p className="mt-1 text-2xl font-bold text-warning">
              {totaux.enAttente.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-subtext">Total reversements</p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {totaux.total.toLocaleString('fr-FR')} FCFA
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-primary">
            {meta.total} reversement{meta.total > 1 ? 's' : ''}
          </h3>
        </div>

        {reversements.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-subtext">Aucun reversement trouvé.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm font-semibold text-primary">
                    <th className="pb-3">Mois</th>
                    <th className="pb-3">Partenaire</th>
                    <th className="pb-3 text-right">Nb formations</th>
                    <th className="pb-3 text-right">Montant net</th>
                    <th className="pb-3">Statut</th>
                    <th className="pb-3">Date paiement</th>
                    {isAgent && <th className="pb-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {reversements.map((reversement) => (
                    <tr
                      key={reversement.id}
                      className="border-b border-border transition-colors hover:bg-gray-50"
                    >
                      <td className="py-4 font-medium text-text">
                        {formatMois(reversement.mois)}
                      </td>
                      <td className="py-4 text-sm text-subtext">
                        {reversement.partenaire?.raison_sociale || 'N/A'}
                      </td>
                      <td className="py-4 text-right text-sm text-subtext">
                        {reversement.nb_formations || 0}
                      </td>
                      <td className="py-4 text-right font-semibold text-primary">
                        {Math.round((reversement.montant_net || 0) / 100).toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="py-4">
                        {getStatutBadge(reversement.statut)}
                      </td>
                      <td className="py-4 text-sm text-subtext">
                        {reversement.date_paiement
                          ? formatDate(reversement.date_paiement)
                          : 'Non payé'}
                      </td>
                      {isAgent && (
                        <td className="py-4 text-right">
                          {reversement.statut === 'EN_ATTENTE' ? (
                            <Button
                              variant="primary"
                              size="small"
                              onClick={() => handleValiderReversement(reversement)}
                            >
                              Valider
                            </Button>
                          ) : (
                            <span className="text-sm text-success">Validé</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta.totalPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={meta.page}
                  totalPages={meta.totalPages}
                  onPageChange={loadReversements}
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* Modal de validation reversement */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Valider le reversement"
      >
        <div className="space-y-4">
          <p className="text-subtext">
            Partenaire: <strong>{selectedReversement?.partenaire?.raison_sociale}</strong>
          </p>
          <p className="text-subtext">
            Montant net: <strong>{Math.round((selectedReversement?.montant_net || 0) / 100).toLocaleString('fr-FR')} FCFA</strong>
          </p>

          <div>
            <label className="mb-2 block text-sm font-medium text-text">
              Référence de paiement <span className="text-danger">*</span>
            </label>
            <Input
              value={referenceReversement}
              onChange={(e) => setReferenceReversement(e.target.value)}
              placeholder="Ex: VIREMENT-2026-03-001"
            />
            <p className="mt-1 text-xs text-subtext">
              Saisissez la référence du virement ou du paiement effectué.
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={() => setIsConfirmModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="success"
              onClick={confirmValiderReversement}
              disabled={isLoading}
            >
              Confirmer le paiement
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
