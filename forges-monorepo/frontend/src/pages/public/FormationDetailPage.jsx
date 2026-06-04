import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { formationsApi } from '../../api/formations.api';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { useSEO, getFormationSchema } from '../../hooks/useSEO';
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

  useEffect(() => {
    if (!loadingFormation && !loadingSessions) {
      document.dispatchEvent(new Event('prerender-ready'));
    }
  }, [formation, loadingFormation, loadingSessions]);

  // SEO Hook - Mettre à jour les meta tags quand la formation est chargée
  useSEO({
    title: formation ? `${getFormationTitre(formation)} | FORGES` : 'FORGES',
    description:
      formation && getFormationDescription(formation)
        ? getFormationDescription(formation)
        : 'Découvrez cette formation certifiante',
    keywords: formation
      ? `${getFormationTitre(formation)}, formation, certification, FORGES`
      : 'formation, certification',
    canonical: `https://edu.forges-group.com/formations/${id}`,
    ogImage: '/logo_forges.png',
    schema: formation ? getFormationSchema(formation) : null,
  });

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
              {formation.image_url && (
                <div className="-mx-6 -mt-6 mb-5 overflow-hidden rounded-t-lg">
                  <img
                    src={formation.image_url}
                    alt={getFormationTitre(formation)}
                    className="h-56 w-full object-cover"
                  />
                </div>
              )}
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
                  <div className="bg-blue-100 border-l-4 border-blue-600 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <svg className="w-5 h-5 text-blue-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="font-bold text-blue-900 text-base">
                        Prérequis
                      </h3>
                    </div>
                    <p className="text-blue-900 text-sm ml-8">
                      {getFormationPrerequis(formation)}
                    </p>
                  </div>
                )}

                {/* Compétences acquises / Objectifs pédagogiques */}
                {getFormationCompetences(formation).length > 0 && (
                  <div className="bg-green-100 border-l-4 border-green-600 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <svg className="w-5 h-5 text-green-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <h3 className="font-bold text-green-900 text-base">
                        Compétences acquises
                      </h3>
                    </div>
                    <ul className="space-y-2 ml-8">
                      {getFormationCompetences(formation).map((competence, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-green-900 text-sm">
                          <svg className="w-4 h-4 text-green-700 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                          </svg>
                          <span>{competence}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Certification */}
                {getCertificationDelivree(formation) && (
                  <div className="bg-amber-100 border-l-4 border-amber-600 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-amber-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h3 className="font-bold text-amber-900 text-base">
                        Certification délivrée à l'issue de cette formation
                      </h3>
                    </div>
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



                {formation.mode_formation && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-secondary mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-text">Mode</p>
                      <p className="text-sm text-subtext">
                        {formation.mode_formation === 'PRESENTIEL' ? 'Présentiel'
                          : formation.mode_formation === 'EN_LIGNE' ? 'En ligne'
                          : formation.mode_formation === 'A_LA_DEMANDE' ? 'À la demande'
                          : 'Sessions programmées'}
                      </p>
                    </div>
                  </div>
                )}

                {formation.lieu && (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-secondary mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-text">Lieu</p>
                      <p className="text-sm text-subtext">{formation.lieu}</p>
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
