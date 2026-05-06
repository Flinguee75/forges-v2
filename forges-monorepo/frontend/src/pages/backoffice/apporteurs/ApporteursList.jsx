import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import apporteursApi from '../../../api/apporteurs.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/feedback/Spinner';
import EmptyState from '../../../components/feedback/EmptyState';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : 'N/A';
}

export default function ApporteursList() {
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const [apporteurs, setApporteurs] = useState([]);
  const [search, setSearch] = useState('');
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });

  useEffect(() => {
    execute(() => apporteursApi.getAllApporteurs({ search }), {
      onSuccess: (data) => {
        setApporteurs(data?.data || []);
        setMeta(data?.meta || { total: 0, page: 1, totalPages: 1 });
      },
      showErrorToast: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">Apporteurs</p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">Liste des apporteurs</h2>
            <p className="mt-2 text-subtext">Gérez les apporteurs et suivez leurs commissions.</p>
          </div>
          <Button onClick={() => navigate('/backoffice/apporteurs/new')}>Créer un apporteur</Button>
        </div>
      </div>

      <Card>
        <div className="mb-4">
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isLoading && apporteurs.length === 0 ? (
          <div className="py-12"><Spinner size="large" /></div>
        ) : apporteurs.length === 0 ? (
          <EmptyState title="Aucun apporteur" message="Aucun apporteur n'a été trouvé." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm font-semibold text-primary">
                  <th className="pb-3">Nom</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Code</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3 text-right">Commissions</th>
                  <th className="pb-3">Créé le</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {apporteurs.map((apporteur) => (
                  <tr key={apporteur.id} className="border-b border-border hover:bg-gray-50">
                    <td className="py-4 text-sm font-medium text-text">{apporteur.nom}</td>
                    <td className="py-4 text-sm text-text">{apporteur.email}</td>
                    <td className="py-4 font-mono text-sm text-text">{apporteur.code_apporteur}</td>
                    <td className="py-4">
                      <Badge variant={apporteur.statut === 'ACTIF' ? 'success' : 'warning'}>{apporteur.statut}</Badge>
                    </td>
                    <td className="py-4 text-right text-sm text-text">{apporteur.commissions_count || 0}</td>
                    <td className="py-4 text-sm text-text">{formatDate(apporteur.date_inscription)}</td>
                    <td className="py-4 text-right">
                      <Button size="small" variant="outline" onClick={() => navigate(`/backoffice/apporteurs/${apporteur.id}`)}>
                        Voir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="text-sm text-subtext">
        {meta.total} apporteur{meta.total > 1 ? 's' : ''} trouvé{meta.total > 1 ? 's' : ''}
      </div>
    </div>
  );
}
