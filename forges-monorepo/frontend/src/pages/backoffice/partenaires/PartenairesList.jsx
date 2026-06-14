import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import partenairesApi from '../../../api/partenaires.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Icon from '../../../components/ui/Icon';
import Input from '../../../components/ui/Input';
import EmptyState from '../../../components/feedback/EmptyState';
import Spinner from '../../../components/feedback/Spinner';

const STATUT_CONFIG = {
  ACTIF: { variant: 'success', label: 'Actif' },
  EN_ATTENTE_VERIFICATION: { variant: 'warning', label: 'En attente' },
  EN_ATTENTE: { variant: 'warning', label: 'En attente' },
  SUSPENDU: { variant: 'error', label: 'Suspendu' },
};

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : 'N/A';
}

export default function PartenairesList() {
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const { showToast } = useToast();
  const [partenaires, setPartenaires] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const load = () => {
    execute(() => partenairesApi.getAllPartenaires({ search }), {
      onSuccess: (data) => {
        setPartenaires(data?.data || []);
        setMeta(data?.meta || { page: 1, totalPages: 1, total: 0 });
      },
      showErrorToast: false,
    });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleInlineAction = async (id, action) => {
    setActionLoading(`${id}-${action}`);
    const apiCall = {
      suspend: () => partenairesApi.suspendrePartenaire(id),
      reactivate: () => partenairesApi.reactiverPartenaire(id),
      delete: () => partenairesApi.supprimerPartenaire(id),
    }[action];

    await execute(apiCall, {
      onSuccess: () => {
        const messages = {
          suspend: 'Partenaire suspendu.',
          reactivate: 'Partenaire réactivé.',
          delete: 'Partenaire supprimé.',
        };
        showToast(messages[action], 'success');
        load();
      },
    });
    setActionLoading(null);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">Partenaires</p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">Liste des partenaires</h2>
            <p className="mt-2 text-subtext">Gérez les partenaires et leurs formations sur la plateforme.</p>
          </div>
          <Button onClick={() => navigate('/backoffice/partenaires/invitation')}>Inviter un partenaire</Button>
        </div>
      </div>

      <Card>
        <div className="mb-4">
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading && partenaires.length === 0 ? (
          <div className="py-12"><Spinner size="large" /></div>
        ) : partenaires.length === 0 ? (
          <EmptyState title="Aucun partenaire" message="Aucun partenaire n'a été trouvé." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm font-semibold text-primary">
                  <th className="pb-3">Raison sociale</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3 text-right">Formations</th>
                  <th className="pb-3">Créé le</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {partenaires.map((p) => {
                  const statutCfg = STATUT_CONFIG[p.statut] || { variant: 'gray', label: p.statut };
                  const isAttente = p.statut === 'EN_ATTENTE_VERIFICATION' || p.statut === 'EN_ATTENTE';
                  const isActif = p.statut === 'ACTIF';
                  const isSuspendu = p.statut === 'SUSPENDU';

                  return (
                    <tr key={p.id} className="border-b border-border hover:bg-gray-50">
                      <td className="py-4 text-sm font-medium text-text">{p.raison_sociale}</td>
                      <td className="py-4 text-sm text-text">{p.email_principal}</td>
                      <td className="py-4">
                        <Badge variant={statutCfg.variant}>{statutCfg.label}</Badge>
                      </td>
                      <td className="py-4 text-right text-sm text-text">{p.counts?.formations || 0}</td>
                      <td className="py-4 text-sm text-text">{formatDate(p.created_at)}</td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">

                          {/* Voir — toujours visible */}
                          <button
                            onClick={() => navigate(`/backoffice/partenaires/${p.id}`)}
                            title="Voir le profil"
                            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:bg-gray-100 transition-colors"
                          >
                            <Icon name="eye" size={13} />
                            Voir
                          </button>

                          {/* Traiter — uniquement si en attente de validation */}
                          {isAttente && (
                            <button
                              onClick={() => navigate(`/backoffice/partenaires/${p.id}/approuver`)}
                              title="Approuver ou refuser ce partenaire"
                              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition-colors"
                            >
                              <Icon name="clipboardList" size={13} />
                              Traiter
                            </button>
                          )}

                          {/* Modifier — accès à la gestion du compte (actif ou suspendu) */}
                          {(isActif || isSuspendu) && (
                            <button
                              onClick={() => navigate(`/backoffice/partenaires/${p.id}/approuver`)}
                              title="Modifier les paramètres du compte"
                              className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                            >
                              <Icon name="pencil" size={13} />
                              Modifier
                            </button>
                          )}

                          {/* Suspendre — uniquement si actif */}
                          {isActif && (
                            <button
                              onClick={() => handleInlineAction(p.id, 'suspend')}
                              disabled={actionLoading === `${p.id}-suspend`}
                              title="Suspendre ce partenaire"
                              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              <Icon name="ban" size={13} />
                              Suspendre
                            </button>
                          )}

                          {/* Réactiver — uniquement si suspendu */}
                          {isSuspendu && (
                            <button
                              onClick={() => handleInlineAction(p.id, 'reactivate')}
                              disabled={actionLoading === `${p.id}-reactivate`}
                              title="Réactiver ce partenaire"
                              className="inline-flex items-center gap-1.5 rounded-md border border-green-200 px-2.5 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                            >
                              <Icon name="refresh" size={13} />
                              Réactiver
                            </button>
                          )}

                          {/* Supprimer — toujours visible, avec confirmation */}
                          <button
                            onClick={() => {
                              if (window.confirm(`Supprimer définitivement "${p.raison_sociale}" ? Cette action est irréversible.`)) {
                                handleInlineAction(p.id, 'delete');
                              }
                            }}
                            disabled={actionLoading === `${p.id}-delete`}
                            title="Supprimer définitivement ce partenaire"
                            className="inline-flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            <Icon name="ban" size={13} />
                            Supprimer
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="text-sm text-subtext">
        {meta.total} partenaire{meta.total > 1 ? 's' : ''} trouvé{meta.total > 1 ? 's' : ''}
      </div>
    </div>
  );
}
