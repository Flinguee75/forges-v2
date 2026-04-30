import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { paiementsApi } from '../../../api/paiements.api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Table from '../../../components/ui/Table';
import Spinner from '../../../components/feedback/Spinner';
import Pagination from '../../../components/ui/Pagination';

/**
 * PaiementsList - Liste backoffice des paiements
 * Route: /backoffice/paiements
 * Accessible à: ADMIN, AGENT
 * Affiche les montants en FCFA et les statuts (INITIE, CONFIRME, ECHOUE)
 * Référence: F-9 Backoffice Paiements (Todo_front.pdf)
 */
export default function PaiementsList() {
  const navigate = useNavigate();
  const [paiements, setPaiements] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    statut: '',
    search: '',
  });

  const { execute, isLoading } = useApi();

  const loadPaiements = async (page = 1) => {
    await execute(
      () =>
        paiementsApi.getAll({
          page,
          limit: 10,
          ...filters,
        }),
      {
        onSuccess: (data) => {
          setPaiements(data.data || []);
          setMeta(data.meta || { page: 1, totalPages: 1, total: 0 });
        },
      }
    );
  };

  useEffect(() => {
    loadPaiements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleSearchChange = (e) => {
    setFilters({ ...filters, search: e.target.value });
  };

  const handleStatutChange = (e) => {
    setFilters({ ...filters, statut: e.target.value });
  };

  const getStatutBadge = (statut) => {
    const mapping = {
      EN_ATTENTE: { variant: 'gray', label: 'En attente' },
      PENDING: { variant: 'warning', label: 'En attente' },
      INITIE: { variant: 'gray', label: 'Initié' },
      CONFIRME: { variant: 'success', label: 'Confirmé' },
      ECHOUE: { variant: 'danger', label: 'Échoué' },
      EXPIRE: { variant: 'warning', label: 'Expiré' },
      REMBOURSE: { variant: 'gray', label: 'Remboursé' },
    };

    const config = mapping[statut] || { variant: 'gray', label: statut };
    return <Badge variant={config.variant} size="small">{config.label}</Badge>;
  };

  const getMethodeBadge = (methode) => {
    const mapping = {
      MOBILE_MONEY: { label: 'Mobile Money' },
      CARTE: { label: 'Carte bancaire' },
      VIREMENT: { label: 'Virement' },
      VOUCHER_ORG: { label: 'Voucher Org' },
    };

    const config = mapping[methode] || { label: methode };
    return <Badge variant="info" size="small">{config.label}</Badge>;
  };

  const columns = [
    {
      key: 'reference',
      label: 'Référence',
      render: (value, paiement) => (
        <button
          onClick={() => navigate(`/backoffice/paiements/${paiement.id}`)}
          className="text-left font-medium text-primary hover:text-secondary hover:underline"
        >
          {value || paiement.id.slice(0, 8)}
        </button>
      ),
    },
    {
      key: 'dossier',
      label: 'Apprenant',
      render: (_, paiement) => {
        const apprenant = paiement.dossier?.apprenant || paiement.dossier?.etudiant;
        if (!apprenant) return 'N/A';
        return `${apprenant.nom || ''} ${apprenant.prenom || apprenant.prenoms || ''}`.trim();
      },
    },
    {
      key: 'montant_final',
      label: 'Montant',
      render: (value, paiement) => {
        const montant = value ?? paiement.montant_initie ?? paiement.montant ?? paiement.montant_catalogue ?? 0;
        const montantFCFA = montant / 100;
        return `${montantFCFA.toLocaleString('fr-FR')} FCFA`;
      },
    },
    {
      key: 'methode',
      label: 'Méthode',
      render: (value, paiement) => getMethodeBadge(value || paiement.methode_paiement || paiement.provider || 'NGSER'),
    },
    {
      key: 'statut',
      label: 'Statut',
      render: (value) => getStatutBadge(value),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (value) => new Date(value).toLocaleDateString('fr-FR'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, paiement) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="small"
            onClick={() => navigate(`/backoffice/paiements/${paiement.id}`)}
          >
            Voir
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading && paiements.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
              Gestion des paiements
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">
              Liste des paiements
            </h2>
            <p className="mt-2 text-subtext">
              Suivi de tous les paiements effectués sur la plateforme.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Rechercher par référence ou nom d'étudiant..."
              value={filters.search}
              onChange={handleSearchChange}
            />
          </div>
          <div className="w-48">
            <select
              value={filters.statut}
              onChange={handleStatutChange}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none"
            >
              <option value="">Tous les statuts</option>
              <option value="EN_ATTENTE">En attente</option>
              <option value="PENDING">En attente NGSER</option>
              <option value="INITIE">Initié</option>
              <option value="CONFIRME">Confirmé</option>
              <option value="ECHOUE">Échoué</option>
              <option value="EXPIRE">Expiré</option>
              <option value="REMBOURSE">Remboursé</option>
            </select>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-primary">
            {meta.total} paiement{meta.total > 1 ? 's' : ''}
          </h3>
        </div>

        <Table columns={columns} data={paiements} />

        {meta.totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={meta.page}
              totalPages={meta.totalPages}
              onPageChange={loadPaiements}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
