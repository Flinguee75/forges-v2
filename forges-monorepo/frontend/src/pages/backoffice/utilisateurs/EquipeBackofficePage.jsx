import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import utilisateursApi from '../../../api/utilisateurs.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/feedback/Spinner';
import EmptyState from '../../../components/feedback/EmptyState';

const ROLE_CONFIG = {
  ADMIN:        { label: 'Admin',        variant: 'danger' },
  SUPERVISEUR:  { label: 'Superviseur',  variant: 'primary' },
  RESPONSABLE:  { label: 'Responsable',  variant: 'warning' },
  AGENT:        { label: 'Agent',        variant: 'info' },
  GESTIONNAIRE: { label: 'Gestionnaire', variant: 'gray' },
};

const STATUT_CONFIG = {
  ACTIF:    { label: 'Actif',     variant: 'success' },
  INACTIF:  { label: 'Inactif',  variant: 'gray' },
  SUSPENDU: { label: 'Suspendu', variant: 'warning' },
};

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : '-';
}

export default function EquipeBackofficePage() {
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });

  useEffect(() => {
    execute(() => utilisateursApi.getBackofficeUsers(), {
      onSuccess: (data) => {
        setUsers(data?.users || []);
        setMeta({ total: data?.total || 0 });
      },
      showErrorToast: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">Administration</p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">Equipe backoffice</h2>
            <p className="mt-2 text-subtext">Comptes ADMIN, SUPERVISEUR, RESPONSABLE, AGENT et GESTIONNAIRE.</p>
          </div>
          <Button onClick={() => navigate('/backoffice/utilisateurs/new')}>
            Creer un membre
          </Button>
        </div>
      </div>

      <Card>
        {isLoading && users.length === 0 ? (
          <div className="py-12"><Spinner size="large" /></div>
        ) : users.length === 0 ? (
          <EmptyState title="Aucun membre" message="Aucun compte backoffice trouve." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm font-semibold text-primary">
                  <th className="pb-4 pr-6">Nom</th>
                  <th className="pb-4 pr-6">Email</th>
                  <th className="pb-4 pr-6">Role</th>
                  <th className="pb-4 pr-6">Statut</th>
                  <th className="pb-4 pr-6">Cree le</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const roleConf = ROLE_CONFIG[user.role] || { label: user.role, variant: 'gray' };
                  const statutConf = STATUT_CONFIG[user.statut] || { label: user.statut, variant: 'gray' };
                  return (
                    <tr key={user.id} className="border-b border-border hover:bg-gray-50">
                      <td className="py-4 pr-6 text-sm font-medium text-text">
                        {user.prenoms} {user.nom}
                      </td>
                      <td className="py-4 pr-6 text-sm text-subtext">{user.email}</td>
                      <td className="py-4 pr-6">
                        <Badge variant={roleConf.variant} size="small">{roleConf.label}</Badge>
                      </td>
                      <td className="py-4 pr-6">
                        <Badge variant={statutConf.variant} size="small">{statutConf.label}</Badge>
                      </td>
                      <td className="py-4 pr-6 text-sm text-subtext">{formatDate(user.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="text-sm text-subtext">{meta.total} membre{meta.total > 1 ? 's' : ''}</div>
    </div>
  );
}
