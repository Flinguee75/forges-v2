import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-subtext">{label}</p>
      <p className="mt-2 text-sm font-medium text-text">{value || 'N/A'}</p>
    </div>
  );
}

function statutBadge(organisation) {
  if (organisation?.suspended || organisation?.statut === 'SUSPENDU') {
    return <Badge variant="danger">Suspendue</Badge>;
  }
  if (organisation?.email_confirme === false || organisation?.statut === 'EN_ATTENTE') {
    return <Badge variant="warning">Email non confirmé</Badge>;
  }
  return <Badge variant="success">Active</Badge>;
}

function typeBadge(type) {
  const mapping = {
    ENTREPRISE: { variant: 'info', label: 'Entreprise' },
    ASSOCIATION: { variant: 'gray', label: 'Association' },
    GOUVERNEMENT: { variant: 'warning', label: 'Gouvernement' },
    INSTITUTION: { variant: 'warning', label: 'Institution' },
    ONG: { variant: 'success', label: 'ONG' },
  };
  const config = mapping[type] || { variant: 'gray', label: type || 'Type non renseigné' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function OrganisationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organisation, setOrganisation] = useState(null);
  const [membres, setMembres] = useState([]);
  const [abonnement, setAbonnement] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function loadDetail() {
      setIsLoading(true);
      setError(null);

      try {
        const [organisationResponse, membresResponse, abonnementResponse, vouchersResponse] = await Promise.all([
          organisationsApi.getById(id),
          organisationsApi.getMembres(id).catch(() => ({ data: [] })),
          organisationsApi.getAbonnement(id).catch(() => ({ data: null })),
          organisationsApi.getVouchers(id).catch(() => ({ data: [] })),
        ]);

        if (ignore) return;
        setOrganisation(organisationResponse?.data || organisationResponse);
        setMembres(membresResponse?.data || []);
        setAbonnement(abonnementResponse?.data || null);
        setVouchers(vouchersResponse?.data || []);
      } catch (err) {
        if (!ignore) {
          setError(err?.message || "Impossible de charger le détail de l'organisation.");
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (error || !organisation) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <p className="text-subtext">{error || 'Organisation introuvable.'}</p>
        <Button className="mt-4" onClick={() => navigate('/backoffice/organisations')}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  const organisationName = organisation.nom_organisation || organisation.raison_sociale || 'N/A';
  const activeVouchers = vouchers.filter((voucher) => voucher.statut === 'ACTIF').length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
              Détail organisation
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-primary">{organisationName}</h1>
            <p className="mt-2 text-sm text-subtext">{organisation.email}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {statutBadge(organisation)}
              {typeBadge(organisation.type_organisation || organisation.type)}
              {(organisation.langue || organisation.langue_preferee) && (
                <Badge variant="info">Langue {organisation.langue || organisation.langue_preferee}</Badge>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/backoffice/organisations')}>
            Retour à la liste
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-subtext">Membres</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{membres.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-subtext">Abonnement actif</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{abonnement ? 'Oui' : 'Non'}</p>
        </Card>
        <Card>
          <p className="text-sm text-subtext">Vouchers</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{vouchers.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-subtext">Vouchers actifs</p>
          <p className="mt-2 text-2xl font-semibold text-primary">{activeVouchers}</p>
        </Card>
      </div>

      <Card title="Informations organisation">
        <div className="grid gap-5 md:grid-cols-2">
          <InfoItem label="Raison sociale" value={organisationName} />
          <InfoItem label="Email" value={organisation.email} />
          <InfoItem label="Type" value={organisation.type_organisation || organisation.type} />
          <InfoItem label="Sous-types" value={(organisation.sous_types || []).join(', ')} />
          <InfoItem label="Identifiant légal" value={organisation.numero_legal || organisation.identifiant_legal} />
          <InfoItem label="Contact référent" value={organisation.responsable_nom || organisation.contact_referent} />
          <InfoItem label="Pays" value={organisation.pays} />
          <InfoItem label="Statut" value={organisation.statut} />
          <InfoItem label="Langue préférée" value={organisation.langue || organisation.langue_preferee} />
          <InfoItem label="Date de création" value={formatDate(organisation.created_at)} />
        </div>
      </Card>

      <Card title="Abonnement B2B">
        {abonnement ? (
          <div className="grid gap-5 md:grid-cols-2">
            <InfoItem label="Palier" value={abonnement.palier} />
            <InfoItem label="Statut" value={abonnement.statut} />
            <InfoItem label="Quota" value={`${abonnement.nb_actifs || abonnement.consomme || 0} / ${abonnement.nb_max || abonnement.quota || 0}`} />
            <InfoItem label="Prix annuel" value={formatAmount(abonnement.prix_annuel || abonnement.montant_annuel)} />
            <InfoItem label="Début" value={formatDate(abonnement.date_debut)} />
            <InfoItem label="Fin" value={formatDate(abonnement.date_fin)} />
          </div>
        ) : (
          <p className="text-sm text-subtext">Aucun abonnement B2B actif pour cette organisation.</p>
        )}
      </Card>

      <Card title="Membres récents">
        {membres.length === 0 ? (
          <p className="text-sm text-subtext">Aucun membre rattaché à cette organisation.</p>
        ) : (
          <div className="space-y-3">
            {membres.slice(0, 8).map((membre) => {
              const fullName = `${membre.prenoms || membre.prenom || ''} ${membre.nom || ''}`.trim() || 'N/A';
              return (
                <div
                  key={membre.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium text-text">{fullName}</p>
                    <p className="mt-1 text-xs text-subtext">{membre.email}</p>
                  </div>
                  <Badge variant={membre.suspended || membre.statut === 'SUSPENDU' ? 'danger' : 'success'}>
                    {membre.statut || 'ACTIF'}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Vouchers récents">
        {vouchers.length === 0 ? (
          <p className="text-sm text-subtext">Aucun voucher associé à cette organisation.</p>
        ) : (
          <div className="space-y-3">
            {vouchers.slice(0, 8).map((voucher) => (
              <div
                key={voucher.id}
                className="flex flex-col gap-3 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium text-text">{voucher.code || voucher.id}</p>
                  <p className="mt-1 text-xs text-subtext">
                    {voucher.formation?.intitule || 'Toutes formations'} · Expire le {formatDate(voucher.date_expiration)}
                  </p>
                </div>
                <Badge variant={voucher.statut === 'ACTIF' ? 'success' : 'warning'}>
                  {voucher.statut || 'N/A'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
