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
import BotWidget from '../../components/bot/BotWidget';

function formatMoney(amount) {
  return `${Math.round(Number(amount || 0)).toLocaleString('fr-FR')} FCFA`;
}

function formatDate(dateValue) {
  if (!dateValue) return '-';
  return new Date(dateValue).toLocaleDateString('fr-FR');
}

export default function ApprenantDashboard() {
  const [formations, setFormations] = useState([]);
  const [accesDemandes, setAccesDemandes] = useState([]);
  const [abonnement, setAbonnement] = useState(null);
  const [dossiers, setDossiers] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);
  const { execute, isLoading, reset } = useApi();

  const loadDashboard = async () => {
    setLoadError('');
    setHasLoaded(false);

    try {
      const [formationsResult, accesResult, abonnementResult, dossiersResult] = await Promise.all([
        execute(() => formationsApi.getCatalogue({ page: 1, limit: 6 }), {
          showErrorToast: false,
        }),
        execute(() => apprenantApi.getMesFormationsDemande(), {
          showErrorToast: false,
        }).catch(() => []),
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
      setAccesDemandes(Array.isArray(accesResult) ? accesResult : accesResult?.data || []);
      setAbonnement(abonnementResult);
      const rawDossiers = Array.isArray(dossiersResult) ? dossiersResult : dossiersResult?.data || [];
      setDossiers(rawDossiers);
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
    inclus: formations.filter((formation) => formation.inclus_abonnement).length,
    premium: formations.filter((formation) => formation.type_formation === 'PREMIUM').length,
    accesActifs: accesDemandes.filter((acces) => acces.statut === 'ACTIF').length,
    dossiersEnAttente: dossiers.filter((d) => ['EN_ATTENTE', 'EN_ATTENTE_VERIFICATION', 'RETENU'].includes(d.statut)).length,
    orgFormations: formations.filter((f) => ['B2B', 'INSTITUTIONNEL', 'TOUS'].includes(f.pilier_abonnement)).length,
  }), [accesDemandes, formations, dossiers]);

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
            Réessayer
          </Button>
        )}
      />
    );
  }

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-primary to-secondary p-6 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/80">
          Espace apprenant
        </p>
        <h1 className="mt-3 text-3xl font-bold">
          Suivi de votre abonnement et de vos accès
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-white/85">
          Le tableau de bord met en avant les formations incluses, les formations Premium et les accès à la demande.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-subtext">Formations incluses</p>
          <p className="mt-2 text-3xl font-bold text-text">{stats.inclus}</p>
        </Card>
        <Card>
          <p className="text-sm text-subtext">Formations Premium</p>
          <p className="mt-2 text-3xl font-bold text-text">{stats.premium}</p>
        </Card>
        <Card>
          <p className="text-sm text-subtext">Accès actifs</p>
          <p className="mt-2 text-3xl font-bold text-text">{stats.accesActifs}</p>
        </Card>
        <Link to="/apprenant/dossiers">
          <Card className={`h-full hover:border-primary transition-colors ${stats.dossiersEnAttente > 0 ? 'border-warning' : ''}`}>
            <p className="text-sm text-subtext">Dossiers en attente</p>
            <p className={`mt-2 text-3xl font-bold ${stats.dossiersEnAttente > 0 ? 'text-warning' : 'text-text'}`}>{stats.dossiersEnAttente}</p>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link to="/apprenant/abonnement">
          <Card className="h-full hover:border-primary transition-colors">
            <p className="text-sm text-subtext">Mon abonnement</p>
            <h2 className="mt-2 text-xl font-semibold text-text">Gérer votre offre Retail</h2>
            <p className="mt-2 text-sm text-subtext">
              {abonnement ? `Offre ${abonnement.offre} - ${formatMoney(abonnement.montant_mensuel)}` : 'Aucun abonnement actif'}
            </p>
          </Card>
        </Link>
        <Link to="/apprenant/abonnement/souscrire">
          <Card className="h-full hover:border-primary transition-colors">
            <p className="text-sm text-subtext">Souscrire</p>
            <h2 className="mt-2 text-xl font-semibold text-text">Comparer Essentiel et Premium</h2>
            <p className="mt-2 text-sm text-subtext">
              Visualisez les formations incluses et le premier prélèvement prorata.
            </p>
          </Card>
        </Link>
        <Link to="/apprenant/formations-a-la-demande">
          <Card className="h-full hover:border-primary transition-colors">
            <p className="text-sm text-subtext">Formations à la demande</p>
            <h2 className="mt-2 text-xl font-semibold text-text">Accéder à vos parcours actifs</h2>
            <p className="mt-2 text-sm text-subtext">
              {stats.accesActifs} accès en cours de suivi.
            </p>
          </Card>
        </Link>
      </div>

      {/* Callout organisations — visible seulement s'il y a des formations B2B/institutionnelles */}
      {stats.orgFormations > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-blue-900">
                {stats.orgFormations} formation{stats.orgFormations > 1 ? 's' : ''} gratuites via votre employeur ou institution
              </p>
              <p className="text-sm text-blue-700">
                Si votre organisation est partenaire FORGES, ces formations sont prises en charge pour vous.
              </p>
            </div>
          </div>
          <Link to="/apprenant/catalogue" onClick={() => {}} className="flex-shrink-0">
            <Button variant="outline" size="small" className="border-blue-300 text-blue-700 hover:bg-blue-100">
              Voir dans le catalogue
            </Button>
          </Link>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Formations en vedette">
          {formations.length === 0 ? (
            <EmptyState
              title="Catalogue vide"
              message="Aucune formation n&apos;a été chargée pour le moment."
            />
          ) : (
            <div className="space-y-3">
              {formations.slice(0, 4).map((formation) => (
                <Link key={formation.id} to={`/apprenant/inscrire/${formation.id}`} className="block">
                  <div className="rounded-lg border border-border p-4 hover:border-primary transition-colors">
                    <div className="flex flex-wrap gap-2">
                      {formation.inclus_abonnement && <Badge variant="success" size="small">Inclus</Badge>}
                      {formation.type_formation === 'PREMIUM' && <Badge variant="info" size="small">Premium</Badge>}
                    </div>
                    <p className="mt-3 font-semibold text-text">{formation.titre}</p>
                    <p className="mt-1 text-sm text-subtext">{formation.description}</p>
                    <p className="mt-2 text-sm text-subtext">
                      {Math.round(Number(formation.tarif || 0) / 100).toLocaleString('fr-FR')} FCFA - {formation.duree} h
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="Mes accès à la demande">
          {accesDemandes.length === 0 ? (
            <EmptyState
              title="Aucun accès"
              message="Vos formations à la demande apparaîtront ici dès qu&apos;un accès sera créé."
              action={(
                <Link to="/apprenant/formations-a-la-demande">
                  <Button variant="outline" size="small">Voir les accès</Button>
                </Link>
              )}
            />
          ) : (
            <div className="space-y-3">
              {accesDemandes.slice(0, 3).map((acces) => (
                <Link key={acces.id} to={`/apprenant/formations-a-la-demande/${acces.id}`} className="block">
                  <div className="rounded-lg border border-border p-4 hover:border-primary transition-colors">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={acces.statut === 'ACTIF' ? 'success' : acces.statut === 'SUSPENDU' ? 'warning' : 'danger'}
                        size="small"
                      >
                        {acces.statut}
                      </Badge>
                      {acces.source_financement && (
                        <Badge variant="info" size="small">{acces.source_financement}</Badge>
                      )}
                    </div>
                    <p className="mt-3 font-semibold text-text">{acces.formation?.titre || 'Formation'}</p>
                    <p className="mt-1 text-sm text-subtext">
                      Expire le {formatDate(acces.date_expiration)} - progression {acces.progression || 0}%
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
      </div>
      <BotWidget />
    </>
  );
}
