import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { etudiantApi } from '../../api/espace-etudiant.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/feedback/Spinner';
import Icon from '../../components/ui/Icon';

/**
 * EtudiantDashboard - Tableau de bord apprenant avec statistiques et actions rapides
 * Route: /apprenant/dashboard
 * Référence: MOD-09 Espace Apprenant
 */
export default function EtudiantDashboard() {
  const [stats, setStats] = useState({
    dossiersEnAttente: 0,
    dossiersRetenus: 0,
    dossiersConfirmes: 0,
    formationsEnCours: 0,
  });
  const [recentDossiers, setRecentDossiers] = useState([]);
  const [recentFormations, setRecentFormations] = useState([]);

  const { execute, isLoading } = useApi();

  const loadDashboardData = async () => {
    await execute(
      async () => {
        const [dossiersData, formationsData] = await Promise.all([
          etudiantApi.getMesDossiers({ limit: 5 }),
          etudiantApi.getMesFormations({ limit: 5 }),
        ]);
        return { dossiersData, formationsData };
      },
      {
        onSuccess: ({ dossiersData, formationsData }) => {
          const dossiers = Array.isArray(dossiersData)
            ? dossiersData
            : dossiersData?.data || dossiersData?.dossiers || [];
          const formations = Array.isArray(formationsData)
            ? formationsData
            : formationsData?.data || formationsData?.formations || [];

          setStats({
            dossiersEnAttente: dossiers.filter((d) => d.statut === 'EN_ATTENTE').length,
            dossiersRetenus: dossiers.filter((d) => d.statut === 'RETENU').length,
            dossiersConfirmes: dossiers.filter((d) => d.statut === 'CONFIRME').length,
            formationsEnCours: formations.filter(
              (f) => f.session?.statut === 'EN_COURS'
            ).length,
          });

          setRecentDossiers(dossiers.slice(0, 3));
          setRecentFormations(formations.slice(0, 3));
        },
      }
    );
  };

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatutBadge = (statut) => {
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
    const config = mapping[statut] || { variant: 'gray', label: statut };
    return <Badge variant={config.variant} size="small">{config.label}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getFormationTitre = (item) =>
    item?.formation?.titre ||
    item?.formation?.intitule ||
    item?.session?.formation?.titre ||
    item?.session?.formation?.intitule ||
    'N/A';

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
            Vue d&apos;ensemble
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-primary">
            Suivi de votre parcours
          </h2>
          <p className="mt-2 text-subtext">
            Retrouvez ici vos dossiers, vos formations et vos paiements en cours.
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-info">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-subtext">Dossiers en attente</div>
              <div className="mt-2 text-3xl font-bold text-primary">
                {stats.dossiersEnAttente}
              </div>
            </div>
            <Icon name="folder" size={40} className="text-info opacity-20" />
          </div>
        </Card>

        <Card className="border-l-4 border-warning">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-subtext">Paiements à effectuer</div>
              <div className="mt-2 text-3xl font-bold text-warning">
                {stats.dossiersRetenus}
              </div>
            </div>
            <Icon name="creditCard" size={40} className="text-warning opacity-20" />
          </div>
        </Card>

        <Card className="border-l-4 border-success">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-subtext">Formations confirmées</div>
              <div className="mt-2 text-3xl font-bold text-success">
                {stats.dossiersConfirmes}
              </div>
            </div>
            <Icon name="checkCircle" size={40} className="text-success opacity-20" />
          </div>
        </Card>

        <Card className="border-l-4 border-secondary">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-subtext">Formations en cours</div>
              <div className="mt-2 text-3xl font-bold text-secondary">
                {stats.formationsEnCours}
              </div>
            </div>
            <Icon name="academicCap" size={40} className="text-secondary opacity-20" />
          </div>
        </Card>
      </div>

      {stats.dossiersRetenus > 0 && (
        <div className="mb-6 rounded-lg border border-warning-soft bg-warning-soft p-4">
          <div className="flex items-start gap-4">
            <Icon name="exclamationCircle" size={24} className="text-warning flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-warning">
                Action requise : Paiement en attente
              </h3>
              <p className="mt-1 text-sm text-warning">
                Vous avez {stats.dossiersRetenus} dossier(s) retenu(s). Effectuez votre
                paiement dans les 72h pour confirmer votre inscription.
              </p>
            </div>
            <Link to="/apprenant/paiements" className="flex-shrink-0">
              <Button variant="warning" size="small">
                Payer maintenant
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-primary">Mes derniers dossiers</h3>
            <Link to="/apprenant/dossiers" className="text-sm text-secondary hover:underline">
              Voir tout
            </Link>
          </div>

          {recentDossiers.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-subtext">Aucun dossier pour le moment</p>
              <Link to="/apprenant/catalogue">
                <Button variant="outline" size="small" className="mt-3">
                  Parcourir le catalogue
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDossiers.map((dossier) => (
                <div
                  key={dossier.id}
                  className="rounded-lg border border-border p-3 hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-text">
                        {getFormationTitre(dossier)}
                      </div>
                      <div className="mt-1 text-xs text-subtext">
                        Session du {formatDate(dossier.session?.date_debut)}
                      </div>
                    </div>
                    {getStatutBadge(dossier.statut)}
                  </div>
                  <div className="mt-2 text-xs text-subtext">
                    Soumis le {formatDate(dossier.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-primary">Mes formations</h3>
            <Link to="/apprenant/attestations" className="text-sm text-secondary hover:underline">
              Voir tout
            </Link>
          </div>

          {recentFormations.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-subtext">
                Aucune formation confirmée pour le moment
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentFormations.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border p-3 hover:border-primary transition-colors"
                >
                  <div className="font-medium text-text">
                    {getFormationTitre(item)}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-subtext">
                    <span>Début: {formatDate(item.session?.date_debut)}</span>
                    <span>•</span>
                    <span>Fin: {formatDate(item.session?.date_fin)}</span>
                  </div>
                  {item.statut === 'CONFIRME' && (
                    <Link
                      to={`/apprenant/attestations?dossier=${item.id}`}
                      className="mt-2 inline-block text-xs text-primary hover:underline"
                    >
                      Télécharger l'attestation →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Link to="/apprenant/catalogue" className="block">
          <Card className="h-full hover:border-primary transition-colors cursor-pointer">
            <div className="flex items-start gap-3">
              <Icon name="bookOpen" size={28} className="text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-primary">Catalogue</h3>
                <p className="mt-1 text-sm text-subtext">
                  Découvrez nos formations et inscrivez-vous
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/apprenant/dossiers" className="block">
          <Card className="h-full hover:border-primary transition-colors cursor-pointer">
            <div className="flex items-start gap-3">
              <Icon name="clipboardList" size={28} className="text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-primary">Mes Dossiers</h3>
                <p className="mt-1 text-sm text-subtext">
                  Suivez l'état de vos inscriptions
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/apprenant/attestations" className="block">
          <Card className="h-full hover:border-primary transition-colors cursor-pointer">
            <div className="flex items-start gap-3">
              <Icon name="document" size={28} className="text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-primary">Attestations</h3>
                <p className="mt-1 text-sm text-subtext">
                  Téléchargez vos attestations
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
