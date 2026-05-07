import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apprenantsApi } from '../../../api/apprenants.api';
import { organisationsApi } from '../../../api/organisations.api';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Spinner from '../../../components/feedback/Spinner';

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatAmount = (value) => {
  if (value === null || value === undefined) return 'N/A';
  return `${Number(value).toLocaleString('fr-FR')} FCFA`;
};

function statutBadge(apprenant) {
  if (apprenant?.suspended || apprenant?.statut === 'SUSPENDU') {
    return <Badge variant="danger">Suspendu</Badge>;
  }
  if (apprenant?.email_confirme === false || apprenant?.statut === 'INACTIF') {
    return <Badge variant="warning">Email non confirmé</Badge>;
  }
  return <Badge variant="success">Actif</Badge>;
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-subtext">{label}</p>
      <p className="mt-2 text-sm font-medium text-text">{value || 'N/A'}</p>
    </div>
  );
}

export default function ApprenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [apprenant, setApprenant] = useState(null);
  const [dossiers, setDossiers] = useState([]);
  const [abonnement, setAbonnement] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [organisations, setOrganisations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [isLiingOrg, setIsLiingOrg] = useState(false);
  const [lierOrgError, setLierOrgError] = useState(null);
  const [lierOrgSuccess, setLierOrgSuccess] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadDetail() {
      setIsLoading(true);
      setError(null);

      try {
        const [apprenantResponse, dossiersResponse, abonnementResponse] = await Promise.all([
          apprenantsApi.getById(id),
          apprenantsApi.getDossiers(id).catch(() => ({ data: [] })),
          apprenantsApi.getAbonnement(id).catch(() => ({ data: null })),
        ]);

        if (ignore) return;
        setApprenant(apprenantResponse?.data || apprenantResponse);
        setDossiers(dossiersResponse?.data || []);
        setAbonnement(abonnementResponse?.data || null);
      } catch (err) {
        if (!ignore) {
          setError(err?.message || 'Impossible de charger le détail utilisateur.');
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadDetail();

    return () => {
      ignore = true;
    };
  }, [id]);

  useEffect(() => {
    organisationsApi.getAll({ limit: 100 })
      .then(res => {
        const items = res?.data?.data || res?.data || [];
        setOrganisations(Array.isArray(items) ? items : []);
      })
      .catch(() => {});
  }, []);

  const handleLierOrganisation = async () => {
    if (!selectedOrgId) return;
    setIsLiingOrg(true);
    setLierOrgError(null);
    setLierOrgSuccess(false);
    try {
      const updated = await apprenantsApi.lierOrganisation(id, selectedOrgId);
      setApprenant(prev => ({ ...prev, organisation_id: (updated?.data ?? updated).organisation_id }));
      setLierOrgSuccess(true);
    } catch (err) {
      const code = err?.response?.data?.error;
      if (code === 'ORGANISATION_NOT_FOUND') setLierOrgError('Organisation introuvable.');
      else if (code === 'APPRENANT_NOT_FOUND') setLierOrgError('Apprenant introuvable.');
      else setLierOrgError('Erreur lors du rattachement.');
    } finally {
      setIsLiingOrg(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (error || !apprenant) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <p className="text-subtext">{error || 'Utilisateur introuvable.'}</p>
        <Button className="mt-4" onClick={() => navigate('/backoffice/apprenants')}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  const fullName = `${apprenant.prenoms || apprenant.prenom || ''} ${apprenant.nom || ''}`.trim() || 'N/A';
  const paidDossiers = dossiers.filter((dossier) =>
    ['PAYE', 'PAYE_DIRECTEMENT'].includes(dossier.statut)
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
              Détail utilisateur
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-primary">{fullName}</h1>
            <p className="mt-2 text-sm text-subtext">{apprenant.email}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {statutBadge(apprenant)}
              {apprenant.type_apprenant && <Badge variant="info">{apprenant.type_apprenant}</Badge>}
              {apprenant.langue && <Badge variant="default">Langue {apprenant.langue}</Badge>}
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/backoffice/apprenants')}>
            Retour à la liste
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-subtext">Dossiers</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{dossiers.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-subtext">Dossiers payés</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{paidDossiers}</p>
        </Card>
        <Card>
          <p className="text-sm text-subtext">Abonnement actif</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{abonnement ? 'Oui' : 'Non'}</p>
        </Card>
      </div>

      <Card title="Informations personnelles">
        <div className="grid gap-5 md:grid-cols-2">
          <InfoItem label="Nom" value={apprenant.nom} />
          <InfoItem label="Prénoms" value={apprenant.prenoms || apprenant.prenom} />
          <InfoItem label="Email" value={apprenant.email} />
          <InfoItem label="Statut" value={apprenant.statut} />
          <InfoItem label="Type apprenant" value={apprenant.type_apprenant} />
          <InfoItem label="Secteur d'activité" value={apprenant.secteur_activite} />
          <InfoItem label="Niveau d'étude" value={apprenant.niveau_etude} />
          <InfoItem label="Langue préférée" value={apprenant.langue || apprenant.langue_preferee} />
          <InfoItem label="Pays de résidence" value={apprenant.pays_residence || apprenant.pays} />
          <InfoItem label="Pays de nationalité" value={apprenant.pays_nationalite} />
          <InfoItem label="Date d'inscription" value={formatDate(apprenant.created_at)} />
        </div>
      </Card>

      <Card title="Abonnement retail">
        {abonnement ? (
          <div className="grid gap-5 md:grid-cols-2">
            <InfoItem label="Offre" value={abonnement.offre} />
            <InfoItem label="Statut" value={abonnement.statut} />
            <InfoItem label="Montant mensuel" value={formatAmount(abonnement.montant_mensuel)} />
            <InfoItem label="Méthode de paiement" value={abonnement.methode_paiement} />
            <InfoItem label="Début" value={formatDate(abonnement.date_debut)} />
            <InfoItem label="Fin" value={formatDate(abonnement.date_fin)} />
          </div>
        ) : (
          <p className="text-sm text-subtext">Aucun abonnement actif pour cet utilisateur.</p>
        )}
      </Card>

      <Card title="Dossiers récents">
        {dossiers.length === 0 ? (
          <p className="text-sm text-subtext">Aucun dossier associé à cet utilisateur.</p>
        ) : (
          <div className="space-y-3">
            {dossiers.slice(0, 8).map((dossier) => {
              const formation = dossier.session?.formation;
              return (
                <div
                  key={dossier.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium text-text">
                      {formation?.intitule || dossier.formation?.intitule || 'Formation non renseignée'}
                    </p>
                    <p className="mt-1 text-xs text-subtext">
                      Créé le {formatDate(dossier.created_at)} · Source {dossier.source_financement || 'N/A'}
                    </p>
                  </div>
                  <Badge
                    variant={['PAYE', 'PAYE_DIRECTEMENT'].includes(dossier.statut) ? 'success' : 'warning'}
                  >
                    {dossier.statut}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-subtext">
          Rattacher a une organisation
        </h3>
        {apprenant.organisation_id && (
          <p className="mb-3 text-sm text-subtext" data-testid="current-org-id">
            Organisation actuelle : <span className="font-mono text-text">{apprenant.organisation_id}</span>
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedOrgId}
            onChange={(e) => { setSelectedOrgId(e.target.value); setLierOrgSuccess(false); setLierOrgError(null); }}
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none"
            data-testid="select-lier-organisation"
          >
            <option value="">Choisir une organisation</option>
            {organisations.map(org => (
              <option key={org.id} value={org.id}>{org.raison_sociale}</option>
            ))}
          </select>
          <Button
            disabled={!selectedOrgId || isLiingOrg}
            loading={isLiingOrg}
            onClick={handleLierOrganisation}
            data-testid="btn-lier-organisation"
          >
            Rattacher
          </Button>
        </div>
        {lierOrgError && (
          <p className="mt-2 text-sm text-danger" data-testid="lier-org-error">{lierOrgError}</p>
        )}
        {lierOrgSuccess && (
          <p className="mt-2 text-sm text-success" data-testid="lier-org-success">Rattachement effectue avec succes.</p>
        )}
      </Card>
    </div>
  );
}
