import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { formationsApi } from '../../api/formations.api';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/feedback/EmptyState';
import Spinner from '../../components/feedback/Spinner';
import { formatCurrencyStandard } from '../../utils/currency';

/**
 * FormationDetailPage - Page de détail d'une formation
 * Affiche les informations de la formation et les sessions ouvertes
 * Référence: CLAUDE.md section 17 - Étape F-5
 */
export default function FormationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formation, setFormation] = useState(null);
  const [sessions, setSessions] = useState([]);

  const { execute: executeFormation, isLoading: loadingFormation, error: errorFormation } = useApi();
  const { execute: executeSessions, isLoading: loadingSessions, error: errorSessions } = useApi();

  const unwrapResponseData = (payload) => payload?.data ?? payload;
  const getFormationTitre = (item) => item?.titre || item?.intitule || 'Formation';
  const getFormationDescription = (item) =>
    item?.description || item?.description_courte || item?.description_longue || '';
  const getFormationDuree = (item) => item?.duree ?? item?.duree_jours;
  const getFormationTarif = (item) => item?.tarif ?? item?.cout_catalogue;
  const getFormationDescriptionLongue = (item) => item?.description_longue || '';
  const getFormationPrerequis = (item) => item?.prerequis || '';
  const getFormationCompetences = (item) => item?.objectifs_pedagogiques || [];
  const getCertificationDelivree = (item) => item?.certification_delivree || false;

  const loadFormationDetail = async () => {
    await executeFormation(() => formationsApi.getFormationDetail(id), {
      onSuccess: (data) => {
        setFormation(unwrapResponseData(data));
      },
    });
  };

  const loadSessions = async () => {
    await executeSessions(() => formationsApi.getSessionsOuvertes(id), {
      onSuccess: (data) => {
        const sessionData = unwrapResponseData(data);
        setSessions(Array.isArray(sessionData) ? sessionData : []);
      },
    });
  };

  useEffect(() => {
    loadFormationDetail();
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleInscription = () => {
    if (!user) {
      navigate('/login', { state: { from: `/catalogue/${id}` } });
    } else if (user.role === 'APPRENANT' || user.role === 'ETUDIANT') {
      navigate(`/apprenant/inscrire/${id}`);
    } else {
      navigate('/');
    }
  };

  if (loadingFormation) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }

  if (errorFormation) {
    return (
      <div className="min-h-screen bg-bg py-8">
        <div className="container mx-auto px-4">
          <EmptyState
            type="error"
            title="Formation introuvable"
            message={errorFormation}
            action={
              <Link to="/catalogue">
                <Button variant="primary">Retour au catalogue</Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  if (!formation) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm">
          <Link to="/" className="text-secondary hover:text-primary">
            Accueil
          </Link>
          <span className="mx-2 text-subtext">/</span>
          <Link to="/catalogue" className="text-secondary hover:text-primary">
            Catalogue
          </Link>
          <span className="mx-2 text-subtext">/</span>
          <span className="text-text">{getFormationTitre(formation)}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* En-tête */}
            <Card>
              <div className="mb-3">
                <Badge variant="success" size="medium">
                  {formation.statut || 'Publiée'}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold text-primary mb-4">
                {getFormationTitre(formation)}
              </h1>
              <p className="text-subtext text-lg">{getFormationDescription(formation)}</p>
            </Card>

            {/* Détails */}
            <Card title="Détails de la formation">
              <div className="space-y-6">
                {/* Description courte */}
                <div>
                  <h3 className="font-semibold text-text mb-2">Aperçu</h3>
                  <p className="text-subtext">
                    {getFormationDescription(formation) || 'Aucune description disponible.'}
                  </p>
                </div>

                {/* Description longue */}
                {getFormationDescriptionLongue(formation) && (
                  <div>
                    <h3 className="font-semibold text-text mb-2">Description détaillée</h3>
                    <div className="text-subtext whitespace-pre-wrap prose prose-sm max-w-none">
                      {/* Parser HTML si présent */}
                      {getFormationDescriptionLongue(formation).includes('<') ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: getFormationDescriptionLongue(formation),
                          }}
                          className="prose prose-sm max-w-none dark:prose-invert"
                        />
                      ) : (
                        <p>{getFormationDescriptionLongue(formation)}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Prérequis */}
                {getFormationPrerequis(formation) && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      📋 Prérequis
                    </h3>
                    <p className="text-blue-800 dark:text-blue-200 text-sm">
                      {getFormationPrerequis(formation)}
                    </p>
                  </div>
                )}

                {/* Compétences acquises / Objectifs pédagogiques */}
                {getFormationCompetences(formation).length > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3">
                      ✨ Compétences acquises
                    </h3>
                    <ul className="space-y-2">
                      {getFormationCompetences(formation).map((competence, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-green-800 dark:text-green-200 text-sm">
                          <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                          <span>{competence}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Certification */}
                {getCertificationDelivree(formation) && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                      🏆 Certification obtenue
                    </h3>
                    <p className="text-amber-800 dark:text-amber-200 text-sm">
                      Cette formation vous permettra d'obtenir une certification reconnue à l'issue de la formation.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Sessions ouvertes */}
            <Card title="Sessions disponibles">
              {loadingSessions && (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              )}

              {errorSessions && (
                <EmptyState
                  type="error"
                  title="Erreur de chargement"
                  message={errorSessions}
                />
              )}

              {!loadingSessions && !errorSessions && sessions.length === 0 && (
                <EmptyState
                  type="empty"
                  title="Aucune session ouverte"
                  message="Il n'y a pas de session d'inscription ouverte pour cette formation pour le moment."
                />
              )}

              {!loadingSessions &&
                !errorSessions &&
                sessions.length > 0 && (
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </div>
                )}
            </Card>
          </div>

          {/* Colonne latérale */}
          <div className="lg:col-span-1 space-y-6">
            {/* Informations clés */}
            <Card title="Informations">
              <div className="space-y-4">
                {typeof getFormationDuree(formation) === 'number' && (
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-secondary mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-text">Durée</p>
                      <p className="text-sm text-subtext">
                        {formatDuration(getFormationDuree(formation))}
                      </p>
                    </div>
                  </div>
                )}

                {typeof getFormationTarif(formation) === 'number' && (
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-secondary mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-text">Tarif</p>
                      <p className="text-lg font-bold text-primary">
                        {formatCurrencyStandard(getFormationTarif(formation))}
                      </p>
                    </div>
                  </div>
                )}

                {formation.duree_acces_jours && (
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-secondary mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-text">Accès</p>
                      <p className="text-sm text-subtext">
                        {formation.duree_acces_jours} jours d'accès
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-secondary mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-text">Statut</p>
                    <p className="text-sm text-subtext">{formation.statut}</p>
                  </div>
                </div>

                {formation.type_formation && (
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-secondary mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17.25S6.5 28 12 28s10-4.745 10-10.75C22 10.998 17.5 6.253 12 6.253z"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-text">Type</p>
                      <Badge variant="info" size="small">
                        {formation.type_formation}
                      </Badge>
                    </div>
                  </div>
                )}

                {formation.responsable_id && (
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-secondary mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-text">
                        Référence
                      </p>
                      <p className="text-sm text-subtext font-mono text-xs">
                        {formation.id}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* CTA Inscription */}
            {sessions.length > 0 && (
              <Card>
                <div className="text-center">
                  <p className="text-sm text-subtext mb-4">
                    {sessions.length} session(s) ouverte(s) aux inscriptions
                  </p>
                  <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    onClick={handleInscription}
                  >
                    {user
                      ? "S'inscrire maintenant"
                      : 'Se connecter pour s\'inscrire'}
                  </Button>
                  {!user && (
                    <p className="text-xs text-subtext mt-3">
                      Pas encore de compte ?{' '}
                      <Link
                        to="/register"
                        className="text-secondary hover:text-primary"
                      >
                        Créer un compte
                      </Link>
                    </p>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * SessionCard - Carte pour afficher une session
 */
function SessionCard({ session }) {
  return (
    <div className="border border-border rounded-lg p-4 hover:border-secondary transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <h4 className="font-semibold text-text">
          Session du {formatDate(session.date_debut)}
        </h4>
        <Badge variant="success" size="small">
          Ouverte
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-subtext">Inscriptions :</span>
          <span className="text-text">
            Du {formatDate(session.date_ouverture)} au{' '}
            {formatDate(session.date_cloture)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-subtext">Formation :</span>
          <span className="text-text">
            Du {formatDate(session.date_debut)} au{' '}
            {formatDate(session.date_fin)}
          </span>
        </div>
        {session.capacite && (
          <div className="flex justify-between">
            <span className="text-subtext">Capacité :</span>
            <span className="text-text">{session.capacite} places</span>
          </div>
        )}
        {session.lieu && (
          <div className="flex justify-between">
            <span className="text-subtext">Lieu :</span>
            <span className="text-text">{session.lieu}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';

  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDuration(days) {
  if (!days) return 'N/A';
  if (days === 1) return '1 jour';
  return `${days} jours`;
}
