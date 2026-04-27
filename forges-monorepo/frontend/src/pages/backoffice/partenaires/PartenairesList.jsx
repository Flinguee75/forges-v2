import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import partenairesApi from '../../../api/partenaires.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Input from '../../../components/ui/Input';
import EmptyState from '../../../components/feedback/EmptyState';
import Spinner from '../../../components/feedback/Spinner';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : 'N/A';
}

export default function PartenairesList() {
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const [partenaires, setPartenaires] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');

  useEffect(() => {
    execute(() => partenairesApi.getAllPartenaires({ search }), {
      onSuccess: (data) => {
        setPartenaires(data?.data || []);
        setMeta(data?.meta || { page: 1, totalPages: 1, total: 0 });
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
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">Partenaires</p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">Liste des partenaires</h2>
            <p className="mt-2 text-subtext">La liste admin est maintenant branchée sur le runtime réel.</p>
          </div>
          <Button onClick={() => navigate('/backoffice/partenaires/invitation')}>Inviter un partenaire</Button>
        </div>
      </div>

      <Card>
        <div className="mb-4">
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                {partenaires.map((partenaire) => (
                  <tr key={partenaire.id} className="border-b border-border hover:bg-gray-50">
                    <td className="py-4 text-sm font-medium text-text">{partenaire.raison_sociale}</td>
                    <td className="py-4 text-sm text-text">{partenaire.email_principal}</td>
                    <td className="py-4">
                      <Badge variant={partenaire.statut === 'ACTIF' ? 'success' : partenaire.statut === 'EN_ATTENTE_VERIFICATION' ? 'warning' : 'gray'}>
                        {partenaire.statut}
                      </Badge>
                    </td>
                    <td className="py-4 text-right text-sm text-text">{partenaire.counts?.formations || 0}</td>
                    <td className="py-4 text-sm text-text">{formatDate(partenaire.created_at)}</td>
                    <td className="py-4 text-right space-x-2">
                      <Button size="small" variant="outline" onClick={() => navigate(`/backoffice/partenaires/${partenaire.id}`)}>
                        Voir
                      </Button>
                      <Button size="small" onClick={() => navigate(`/backoffice/partenaires/${partenaire.id}/approuver`)}>
                        Traiter
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
        {meta.total} partenaire{meta.total > 1 ? 's' : ''} trouvé{meta.total > 1 ? 's' : ''}
      </div>
    </div>
  );
}
