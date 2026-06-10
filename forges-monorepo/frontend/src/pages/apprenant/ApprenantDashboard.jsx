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
          <h1 className="text-2xl font-semibold tracking-tight text-text">Tableau de bord</h1>
          <p className="mt-1 text-sm text-subtext">Formations, abonnement et dossiers en un coup d&apos;oeil.</p>
        </div>

        {/* 3 blocs principaux */}
        <div className="grid gap-4 md:grid-cols-3">

          {/* Formations */}
          <Card bodyClassName="flex flex-col p-5">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-subtext flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-subtext">Formations</p>
            </div>
            <div className="mt-4 flex-1">
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold tabular-nums text-text leading-none">{stats.total}</p>
                <p className="text-xs text-subtext">dans le catalogue</p>
              </div>
              {(stats.inclus > 0 || stats.premium > 0) && (
                <div className="mt-3 flex items-center gap-2">
                  {stats.inclus > 0 && (
                    <span className="text-xs font-medium text-success">
                      {stats.inclus} incluses
                    </span>
                  )}
                  {stats.inclus > 0 && stats.premium > 0 && (
                    <span className="h-3 w-px bg-border" />
                  )}
                  {stats.premium > 0 && (
                    <span className="text-xs font-medium text-info">
                      {stats.premium} Premium
                    </span>
                  )}
                </div>
              )}
            </div>
            <Link to="/apprenant/catalogue" className="mt-auto pt-4">
              <Button variant="outline" className="w-full">Parcourir le catalogue</Button>
            </Link>
          </Card>

          {/* Abonnement */}
          <Card bodyClassName="flex flex-col p-5">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-subtext flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-subtext">Abonnement</p>
            </div>
            <div className="mt-4 flex-1">
              {abonnement ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <p className="text-2xl font-bold text-text leading-none">
                      {abonnement.offre || abonnement.type_abonnement || 'Essentiel'}
                    </p>
                    <Badge variant={abonnement.statut === 'ACTIF' ? 'success' : 'warning'}>
                      {abonnement.statut === 'ACTIF' ? 'Actif' : (abonnement.statut || 'Actif')}
                    </Badge>
                  </div>
                  {abonnement.montant_mensuel && (
                    <p className="mt-2 text-xs text-subtext">{formatMoney(abonnement.montant_mensuel)} / mois</p>
                  )}
                  <p className="mt-1.5 text-xs text-subtext">
                    {abonnement.date_fin ? `Valide jusqu’au ${formatDate(abonnement.date_fin)}` : 'Acces illimite'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-text">Formations sans limite</p>
                  <ul className="mt-3 space-y-2">
                    {['Formations incluses dans votre offre', 'Tarifs reduits sur les Premium', 'Acces aux nouvelles sessions en priorite'].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-subtext">
                        <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 12, height: 12 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="mt-0.5 flex-shrink-0 text-primary">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <Link to={abonnement ? '/apprenant/abonnement' : '/apprenant/abonnement/souscrire'} className="mt-auto pt-4">
              <Button variant={abonnement ? 'outline' : 'primary'} className="w-full">
                {abonnement ? 'Gerer mon abonnement' : 'Decouvrir les offres'}
              </Button>
            </Link>
          </Card>

          {/* Dossiers */}
          <Card bodyClassName="flex flex-col p-5">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-subtext flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
              </svg>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-subtext">Dossiers</p>
            </div>
            <div className="mt-4 flex-1">
              <div className="flex items-baseline gap-2">
                <p className="text-4xl font-bold tabular-nums text-text leading-none">{stats.dossiersTotal}</p>
                {stats.dossiersActifs > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
                    <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                    {stats.dossiersActifs} en attente
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-subtext">
                {stats.dossiersActifs > 0
                  ? `${stats.dossiersActifs} dossier${stats.dossiersActifs > 1 ? 's' : ''} a traiter`
                  : 'Aucun dossier en attente'}
              </p>
            </div>
            <Link to="/apprenant/dossiers" className="mt-auto pt-4">
              <Button variant="outline" className="w-full">Voir mes dossiers</Button>
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
