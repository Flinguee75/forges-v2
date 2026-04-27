import { useState } from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import Pagination from '../components/ui/Pagination';
import Spinner from '../components/feedback/Spinner';
import EmptyState from '../components/feedback/EmptyState';
import { useToast } from '../hooks/useToast';

export default function ComponentsDemo() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [inputValue, setInputValue] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const toast = useToast();

  const tableColumns = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Nom' },
    {
      key: 'status',
      header: 'Statut',
      render: (value) => <Badge variant={value === 'Actif' ? 'success' : 'gray'}>{value}</Badge>
    },
  ];

  const tableData = [
    { id: 1, name: 'Formation React', status: 'Actif' },
    { id: 2, name: 'Formation Vue', status: 'Inactif' },
    { id: 3, name: 'Formation Angular', status: 'Actif' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary mb-2">FORGES UI Components</h1>
        <p className="text-subtext">Étape F-2 : Charte graphique + Composants UI</p>
      </div>

      {/* Buttons Section */}
      <Card title="Buttons - Variantes & Tailles" className="mb-6">
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-subtext mb-3">Variantes</h4>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="success">Success</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="primary" loading>Loading...</Button>
              <Button variant="primary" disabled>Disabled</Button>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-subtext mb-3">Tailles</h4>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="small" variant="primary">Small</Button>
              <Button size="medium" variant="primary">Medium</Button>
              <Button size="large" variant="primary">Large</Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Badges Section */}
      <Card title="Badges - Variantes" className="mb-6">
        <div className="flex flex-wrap gap-3">
          <Badge variant="success">Succès</Badge>
          <Badge variant="warning">Avertissement</Badge>
          <Badge variant="danger">Erreur</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="gray">Gris</Badge>
          <Badge variant="success" size="small">Small</Badge>
          <Badge variant="warning" size="large">Large</Badge>
        </div>
      </Card>

      {/* Input Section */}
      <Card title="Input - États" className="mb-6">
        <div className="space-y-4 max-w-md">
          <Input
            label="Email"
            type="email"
            placeholder="votre@email.com"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <Input
            label="Mot de passe"
            type="password"
            placeholder="••••••••"
            required
          />
          <Input
            label="Champ avec erreur"
            type="text"
            error="Ce champ est requis"
            value=""
          />
          <Input
            label="Champ désactivé"
            type="text"
            value="Non modifiable"
            disabled
          />
        </div>
      </Card>

      {/* Table & Pagination */}
      <Card title="Table & Pagination" className="mb-6">
        <Table columns={tableColumns} data={tableData} />
        <Pagination
          currentPage={currentPage}
          totalPages={10}
          onPageChange={setCurrentPage}
        />
      </Card>

      {/* Modal & Toast Section */}
      <Card title="Modal & Toast" className="mb-6">
        <div className="space-y-3">
          <div>
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              Ouvrir Modal
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="success" onClick={() => toast.showSuccess('Opération réussie !')}>
              Toast Success
            </Button>
            <Button variant="danger" onClick={() => toast.showError('Une erreur est survenue')}>
              Toast Error
            </Button>
            <Button variant="secondary" onClick={() => toast.showWarning('Attention !')}>
              Toast Warning
            </Button>
            <Button variant="outline" onClick={() => toast.showInfo('Information')}>
              Toast Info
            </Button>
          </div>
        </div>
      </Card>

      {/* Spinner Section */}
      <Card title="Spinner - Variantes" className="mb-6">
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-subtext mb-3">Inline</h4>
            <div className="flex items-center gap-6">
              <Spinner size="small" />
              <Spinner size="medium" />
              <Spinner size="large" />
              <Spinner size="medium" text="Chargement..." />
            </div>
          </div>
          <div>
            <Button variant="primary" onClick={() => setShowOverlay(true)}>
              Afficher Spinner Overlay
            </Button>
            {showOverlay && (
              <Spinner overlay text="Chargement en cours..." />
            )}
            {showOverlay && setTimeout(() => setShowOverlay(false), 2000)}
          </div>
        </div>
      </Card>

      {/* EmptyState Section */}
      <Card title="EmptyState - Types" className="mb-6">
        <div className="space-y-8">
          <EmptyState
            type="empty"
            title="Aucune donnée"
            message="Aucune formation disponible pour le moment"
            action={<Button variant="primary">Créer une formation</Button>}
          />
          <hr className="border-border" />
          <EmptyState
            type="error"
            message="Impossible de charger les données"
          />
          <hr className="border-border" />
          <EmptyState type="loading" />
        </div>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Modal de démonstration"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={() => setIsModalOpen(false)}>
              Confirmer
            </Button>
          </div>
        }
      >
        <p className="text-text">
          Ceci est un exemple de modal avec titre et footer.
          Vous pouvez fermer ce modal en cliquant sur le bouton X, sur Annuler,
          en cliquant en dehors de la modal, ou en appuyant sur Échap.
        </p>
        <div className="mt-4">
          <Input label="Champ dans la modal" placeholder="Entrez quelque chose..." />
        </div>
      </Modal>
    </div>
  );
}
