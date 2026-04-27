import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { organisationApi } from '../../api/espace-organisation.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/feedback/Spinner';
import Pagination from '../../components/ui/Pagination';

/**
 * GestionEmployesPage - Gestion des employés/bénéficiaires de l'organisation
 * Route: /organisation/employes
 * Référence: MOD-10 Espace Organisation (CLAUDE.md)
 */
export default function GestionEmployesPage() {
  const [membres, setMembres] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
  });

  const { execute, isLoading } = useApi();
  const { showToast } = useToast();

  const loadMembres = async (page = 1) => {
    await execute(
      () => organisationApi.getMembres({ page, limit: 10 }),
      {
        onSuccess: (data) => {
          setMembres(data.data || []);
          setMeta(data.meta || { page: 1, totalPages: 1, total: 0 });
        },
      }
    );
  };

  useEffect(() => {
    loadMembres();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    await execute(
      () => organisationApi.createMembre(formData),
      {
        onSuccess: () => {
          showToast('Employé ajouté avec succès', 'success');
          setIsModalOpen(false);
          setFormData({ email: '', nom: '', prenom: '' });
          loadMembres(meta.page);
        },
      }
    );
  };

  const handleDelete = async (membreId) => {
    if (!confirm('Voulez-vous vraiment supprimer cet employé ?')) return;

    await execute(
      () => organisationApi.deleteMembre(membreId),
      {
        onSuccess: () => {
          showToast('Employé supprimé avec succès', 'success');
          loadMembres(meta.page);
        },
      }
    );
  };

  const getStatutDossierBadge = (membre) => {
    // Si l'employé a des dossiers, on affiche le statut du plus récent
    if (!membre.dossiers || membre.dossiers.length === 0) {
      return <span className="text-xs text-subtext">Aucun dossier</span>;
    }

    const dernierDossier = membre.dossiers[0];
    const mapping = {
      EN_ATTENTE: { variant: 'gray', label: 'En attente' },
      RETENU: { variant: 'success', label: 'Retenu' },
      CONFIRME: { variant: 'success', label: 'Confirmé' },
      REFUSE: { variant: 'danger', label: 'Refusé' },
      GRIS: { variant: 'warning', label: 'Liste grise' },
      EXCEPTION: { variant: 'warning', label: 'Exception' },
      ARCHIVE: { variant: 'gray', label: 'Archivé' },
      ANNULE: { variant: 'danger', label: 'Annulé' },
    };

    const config = mapping[dernierDossier.statut] || { variant: 'gray', label: dernierDossier.statut };
    return <Badge variant={config.variant} size="small">{config.label}</Badge>;
  };

  const columns = [
    {
      key: 'email',
      label: 'Email',
    },
    {
      key: 'nom',
      label: 'Nom',
    },
    {
      key: 'prenom',
      label: 'Prénom',
    },
    {
      key: 'statut',
      label: 'Statut compte',
      render: (value) => {
        const mapping = {
          ACTIF: 'Actif',
          INACTIF: 'Inactif',
          SUSPENDU: 'Suspendu',
        };
        return mapping[value] || value;
      },
    },
    {
      key: 'dernierDossier',
      label: 'Dernier dossier',
      render: (_, membre) => getStatutDossierBadge(membre),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, membre) => (
        <Button
          variant="danger"
          size="small"
          onClick={() => handleDelete(membre.id)}
        >
          Supprimer
        </Button>
      ),
    },
  ];

  if (isLoading && membres.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
              Gestion des employés
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">
              Liste des employés/bénéficiaires
            </h2>
            <p className="mt-2 text-subtext">
              Ajoutez et gérez les employés qui pourront bénéficier de vos vouchers.
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            Ajouter un employé
          </Button>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-primary">
            {meta.total} employé{meta.total > 1 ? 's' : ''}
          </h3>
        </div>

        <Table columns={columns} data={membres} />

        {meta.totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={meta.page}
              totalPages={meta.totalPages}
              onPageChange={loadMembres}
            />
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ajouter un employé"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            label="Nom"
            value={formData.nom}
            onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
            required
          />
          <Input
            label="Prénom"
            value={formData.prenom}
            onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
            required
          />

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" loading={isLoading}>
              Ajouter
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
