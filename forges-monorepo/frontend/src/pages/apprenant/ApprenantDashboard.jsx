import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formationsApi } from '../../api/formations.api';
import apprenantApi from '../../api/espace-apprenant.api';
import { useApi } from '../../hooks/useApi';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';
import { getDossierStatutMeta } from '../../utils/dossierStatus';

function formatMoney(amount) {
  return `${Math.round(Number(amount || 0)).toLocaleString('fr-FR')} FCFA`;
}

function formatDate(dateValue) {
  if (!dateValue) return '-';
  return new Date(dateValue).toLocaleDateString('fr-FR');
}

export default function ApprenantDashboard() {
  const [formations, setFormations] = useState([]);
  const [abonnement, setAbonnement] = useState(null);
  const [dossiers, setDossiers] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const { execute, isLoading, reset } = useApi();

  const loadDashboard = async () => {
    setLoadError('');
    setHasLoaded(false);

    try {
      const [formationsResult, abonnementResult, dossiersResult] = await Promise.all([
        execute(() => formationsApi.getCatalogue({ page: 1, limit: 6 }), {
          showErrorToast: false,
        }),
        execute(() => apprenantApi.getMonAbonnementRetail(), {
          showErrorToast: false,
        }).catch((error) => {
          if (error?.statusCode === 404 || error?.code === 'NOT_FOUND') {
            reset();
            return null;
          }
          return null;
        }),
        execute(() => apprenantApi.getMesDossiers(), {
          showErrorToast: false,
        }).catch(() => []),
      ]);

      setFormations(formationsResult?.data || []);
      setAbonnement(abonnementResult);
      setDossiers(Array.isArray(dossiersResult) ? dossiersResult : dossiersResult?.data || []);
      setHasLoaded(true);
    } catch (error) {
      setLoadError(error?.message || 'Impossible de charger le tableau de bord.');
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => ({
    total: formations.length,
    inclus: formations.filter((f) => f.inclus_abonnement).length,
    premium: formations.filter((f) => f.type_formation === 'PREMIUM').length,
    dossiersActifs: dossiers.filter((d) =>
      ['EN_ATTENTE', 'EN_ATTENTE_VERIFICATION', 'RETENU', 'PAYE_DIRECTEMENT'].includes(d.statut)
    ).length,
    dossiersTotal: dossiers.length,
  }), [formations, dossiers]);

  if (!hasLoaded && isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (loadError) {
    return (
      <EmptyState
        type="error"
        title="Tableau de bord indisponible"
        message={loadError}
        action={(
          <Button variant="outline" onClick={loadDashboard}>
            Reessayer
          </Button>
        )}
      />
    );
  }

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-8">

        {/* En-tete */}
        <div>
          <h1 className="text-3xl font-bold text-text">Tableau de bord</h1>
          <p className="mt-2 text-base text-subtext">Formations, abonnement et dossiers en un coup d&apos;oeil.</p>
        </div>

        {/* 3 blocs principaux */}
        <div className="grid gap-6 md:grid-cols-3">

          {/* Formations */}
          <Card className="flex flex-col gap-6 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-subtext">Formations</p>
                <p className="mt-2 text-5xl font-bold text-text">{stats.total}</p>
                <p className="mt-1 text-sm text-subtext">dans le catalogue</p>
              </div>
              <div className="flex flex-col gap-2 text-right">
                {stats.inclus > 0 && (
                  <span className="inline-block rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
                    {stats.inclus} incluses
                  </span>
                )}
                {stats.premium > 0 && (
                  <span className="inline-block rounded-full bg-info/10 px-3 py-1 text-sm font-medium text-info">
                    {stats.premium} Premium
                  </span>
                )}
              </div>
            </div>
            <Link to="/apprenant/catalogue" className="mt-auto">
              <Button variant="outline" className="w-full">
                Parcourir le catalogue
              </Button>
            </Link>
          </Card>

          {/* Abonnement */}
          <Card className="flex flex-col gap-6 p-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-subtext">Abonnement</p>
              {abonnement ? (
                <>
                  <div className="mt-2 flex items-center gap-3">
                    <p className="text-4xl font-bold text-text">{abonnement.offre}</p>
                    <Badge
                      variant={abonnement.statut === 'ACTIF' ? 'success' : 'warning'}
                    >
                      {abonnement.statut === 'ACTIF' ? 'Actif' : abonnement.statut}
                    </Badge>
                  </div>
                  {abonnement.montant_mensuel && (
                    <p className="mt-1 text-sm text-subtext">
                      {formatMoney(abonnement.montant_mensuel)} / mois
                    </p>
                  )}
                  {abonnement.date_fin && (
                    <p className="mt-1 text-sm text-subtext">
                      Renouvellement le {formatDate(abonnement.date_fin)}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="mt-2 text-2xl font-semibold text-subtext">Aucun abonnement</p>
                  <p className="mt-1 text-sm text-subtext">
                    Acces illimite aux formations incluses avec Essentiel ou Premium.
                  </p>
                </>
              )}
            </div>
            <Link to={abonnement ? '/apprenant/abonnement' : '/apprenant/abonnement/souscrire'} className="mt-auto">
              <Button
                variant={abonnement ? 'outline' : 'primary'}
                className="w-full"
              >
                {abonnement ? 'Gerer mon abonnement' : 'Souscrire'}
              </Button>
            </Link>
          </Card>

          {/* Dossiers */}
          <Card className="flex flex-col gap-6 p-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-subtext">Dossiers</p>
              <p className="mt-2 text-5xl font-bold text-text">{stats.dossiersTotal}</p>
              <p className="mt-1 text-sm text-subtext">
                {stats.dossiersActifs > 0
                  ? `${stats.dossiersActifs} en attente de traitement`
                  : 'Aucun dossier en attente'}
              </p>
            </div>
            {stats.dossiersActifs > 0 && (
              <div className="rounded-lg border border-warning bg-warning/5 px-4 py-3 text-sm text-warning font-medium">
                {stats.dossiersActifs} dossier{stats.dossiersActifs > 1 ? 's' : ''} necessitent votre attention
              </div>
            )}
            <Link to="/apprenant/dossiers" className="mt-auto">
              <Button variant="outline" className="w-full">
                Voir mes dossiers
              </Button>
            </Link>
          </Card>
        </div>

        {/* Contenu principal : formations + dossiers cote a cote */}
        <div className="grid gap-8 xl:grid-cols-2">

          {/* Formations en vedette */}
          <Card title="Formations disponibles">
            {formations.length === 0 ? (
              <EmptyState
                title="Catalogue vide"
                message="Aucune formation disponible pour le moment."
                action={(
                  <Link to="/apprenant/catalogue">
                    <Button variant="outline">Voir le catalogue</Button>
                  </Link>
                )}
              />
            ) : (
              <div className="space-y-3">
                {formations.slice(0, 4).map((formation) => (
                  <Link key={formation.id} to={`/apprenant/inscrire/${formation.id}`} className="block">
                    <div className="flex items-start justify-between rounded-xl border border-border p-4 hover:border-primary transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-text">{formation.titre}</p>
                        <p className="mt-1 text-sm text-subtext">
                          {Math.round(Number(formation.tarif || 0) / 100).toLocaleString('fr-FR')} FCFA &middot; {formation.duree} h
                        </p>
                      </div>
                      <div className="ml-4 flex flex-shrink-0 flex-col items-end gap-1">
                        {formation.inclus_abonnement && (
                          <Badge variant="success" size="small">Inclus</Badge>
                        )}
                        {formation.type_formation === 'PREMIUM' && (
                          <Badge variant="info" size="small">Premium</Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
                <Link to="/apprenant/catalogue" className="block pt-2">
                  <Button variant="ghost" className="w-full text-primary">
                    Voir tout le catalogue
                  </Button>
                </Link>
              </div>
            )}
          </Card>

          {/* Dossiers recents */}
          <Card title="Dossiers recents">
            {dossiers.length === 0 ? (
              <EmptyState
                title="Aucun dossier"
                message="Vos inscriptions aux sessions apparaitront ici."
                action={(
                  <Link to="/apprenant/catalogue">
                    <Button variant="outline">Trouver une formation</Button>
                  </Link>
                )}
              />
            ) : (
              <div className="space-y-3">
                {dossiers.slice(0, 4).map((dossier) => {
                  const meta = getDossierStatutMeta(dossier.statut);

                  return (
                    <div
                      key={dossier.id}
                      className="flex items-start justify-between rounded-xl border border-border p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-text">
                          {dossier.session?.formation?.titre || dossier.session?.titre || 'Formation'}
                        </p>
                        <p className="mt-1 text-sm text-subtext">
                          {dossier.session?.date_debut ? `Debut le ${formatDate(dossier.session.date_debut)}` : '-'}
                        </p>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </div>
                    </div>
                  );
                })}
                <Link to="/apprenant/dossiers" className="block pt-2">
                  <Button variant="ghost" className="w-full text-primary">
                    Voir tous mes dossiers
                  </Button>
                </Link>
              </div>
            )}
          </Card>
        </div>

      </div>
    </>
  );
}
