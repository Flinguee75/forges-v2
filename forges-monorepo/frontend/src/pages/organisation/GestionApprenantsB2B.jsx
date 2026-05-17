import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { organisationApi } from '../../api/espace-organisation.api';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ProgressBar from '../../components/ui/ProgressBar';
import Table from '../../components/ui/Table';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';
import { buildB2BImportPayload } from '../../utils/csvValidation';
import { getB2BProgressVariant } from '../../utils/organisationBilling';

function isNotFound(error) {
  return error?.code === 'NOT_FOUND' || error?.statusCode === 404;
}

export default function GestionApprenantsB2B() {
  const [membres, setMembres] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [b2b, setB2B] = useState(null);
  const [organisationSubscription, setOrganisationSubscription] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', nom: '', prenom: '' });
  const [csvFeedback, setCsvFeedback] = useState(null);
  const didInitialLoad = useRef(false);
  const { execute, isLoading, error } = useApi();
  const { showToast } = useToast();

  const loadPage = useCallback(async (page = 1) => {
    await execute(async () => {
      const [membresResult, b2bResult, organisationResult] = await Promise.all([
        organisationApi.getMembres({ page, limit: 20 }),
        organisationApi.getAbonnementB2B().catch((loadError) => {
          if (isNotFound(loadError)) {
            return null;
          }
          throw loadError;
        }),
        organisationApi.getAbonnementOrganisation().catch((loadError) => {
          if (isNotFound(loadError)) {
            return null;
          }
          throw loadError;
        }),
      ]);

      return {
        membresResult,
        b2bResult,
        organisationResult,
      };
    }, {
      onSuccess: ({ membresResult, b2bResult, organisationResult }) => {
        setMembres(membresResult?.data || []);
        setMeta(membresResult?.meta || { page: 1, totalPages: 1, total: 0 });
        setB2B(b2bResult);
        setOrganisationSubscription(organisationResult);
      },
    });
  }, [execute]);

  useEffect(() => {
    if (didInitialLoad.current) {
      return;
    }
    didInitialLoad.current = true;
    loadPage();
  }, [loadPage]);

  const organisationAccess = organisationSubscription
    ? organisationSubscription.is_trial || organisationSubscription.statut === 'ACTIF'
    : false;
  const hasB2B = Boolean(b2b?.exists || b2b?.id);

  const handleAddMember = async (event) => {
    event.preventDefault();

    await execute(() => organisationApi.createMembre(formData), {
      showSuccessToast: true,
      successMessage: 'Apprenant B2B ajouté',
      onSuccess: async () => {
        setIsModalOpen(false);
        setFormData({ email: '', nom: '', prenom: '' });
        await loadPage(meta.page);
      },
    });
  };

  const handleDelete = async (membreId) => {
    await execute(() => organisationApi.deleteMembre(membreId), {
      showSuccessToast: true,
      successMessage: 'Apprenant B2B retiré',
      onSuccess: async () => {
        await loadPage(meta.page);
      },
    });
  };

  const handleCsvUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const content = await file.text();
    const payload = buildB2BImportPayload(content, { maxRows: 100 });
    setCsvFeedback(payload);

    if (!payload.isValid) {
      showToast('Le fichier CSV contient des erreurs de validation', 'error');
      return;
    }

    await execute(() => organisationApi.importB2BMembres({ rows: payload.rows }), {
      showSuccessToast: true,
      successMessage: 'Import CSV termine',
      onSuccess: async (result) => {
        setCsvFeedback({
          ...payload,
          serverResult: result,
        });
        await loadPage(meta.page);
      },
    });
  };

  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'nom', label: 'Nom' },
    { key: 'prenom', label: 'Prénom' },
    { key: 'statut', label: 'Statut' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, membre) => (
        <Button
          variant="danger"
          size="small"
          onClick={() => handleDelete(membre.id)}
        >
          Retirer
        </Button>
      ),
    },
  ];

  if (isLoading && !membres.length && !error) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (!organisationAccess) {
    return (
      <EmptyState
        title="Abonnement organisation requis"
        message="Souscrivez un abonnement organisation avant de gérer les apprenants B2B."
        action={(
          <Link to="/organisation/abonnement">
            <Button variant="primary">Aller à l&apos;abonnement organisation</Button>
          </Link>
        )}
      />
    );
  }

  if (!hasB2B) {
    return (
      <EmptyState
        title="Aucun abonnement B2B"
        message="Souscrivez un palier B2B avant de gérer vos apprenants."
        action={(
          <Link to="/organisation/b2b">
            <Button variant="primary">Souscrire un palier B2B</Button>
          </Link>
        )}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary">
              Apprenants B2B
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-text">
              Gérer les apprenants rattachés à votre palier
            </h1>
            <p className="mt-2 text-sm text-subtext">
              Ajoutez des apprenants individuellement ou via CSV, puis suivez votre consommation en temps reel.
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>Ajouter un apprenant</Button>
        </div>
      </div>

      <Card title="Consommation actuelle" bodyClassName="space-y-4">
        <ProgressBar
          current={Number(b2b?.nb_actifs || 0)}
          max={Number(b2b?.nb_max || 0)}
          variant={b2b?.progress_variant || getB2BProgressVariant(b2b?.ratio_utilisation || 0)}
        />
        <div className="text-sm text-subtext">
          {b2b?.message || 'Consommation B2B suivie sur cette page.'}
        </div>
      </Card>

      <Card title="Import CSV B2B" bodyClassName="space-y-4">
        <p className="text-sm text-subtext">
          Format attendu: `email,nom,prenom`. Maximum 100 lignes, email obligatoire.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleCsvUpload}
          className="block w-full text-sm text-subtext file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
        />
        {csvFeedback?.errors?.length > 0 && (
          <div className="rounded-lg border border-danger bg-danger/5 p-4">
            <p className="text-sm font-semibold text-danger">Erreurs détectées</p>
            <ul className="mt-2 space-y-1 text-sm text-danger">
              {csvFeedback.errors.map((item) => (
                <li key={`${item.row}-${item.field || item.code}`}>
                  Ligne {item.row || '-'}: {item.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        {csvFeedback?.warnings?.length > 0 && (
          <div className="rounded-lg border border-warning bg-warning/5 p-4">
            <p className="text-sm font-semibold text-warning">Lignes ignorées</p>
            <ul className="mt-2 space-y-1 text-sm text-warning">
              {csvFeedback.warnings.map((item) => (
                <li key={`${item.row}-${item.field || 'warning'}`}>
                  Ligne {item.row}: {item.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        {csvFeedback?.serverResult && (
          <div className="rounded-lg border border-success bg-success/5 p-4 text-sm text-text">
            Import : {csvFeedback.serverResult.imported} créé(s), {csvFeedback.serverResult.linked} rattaché(s), {csvFeedback.serverResult.skipped} ignoré(s).
          </div>
        )}
      </Card>

      <Card title="Liste des apprenants B2B">
        <Table columns={columns} data={membres} emptyMessage="Aucun apprenant rattaché à ce palier." />
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Ajouter un apprenant B2B"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
            required
          />
          <Input
            label="Nom"
            value={formData.nom}
            onChange={(event) => setFormData((current) => ({ ...current, nom: event.target.value }))}
            required
          />
          <Input
            label="Prénom"
            value={formData.prenom}
            onChange={(event) => setFormData((current) => ({ ...current, prenom: event.target.value }))}
            required
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={isLoading}>Ajouter</Button>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
