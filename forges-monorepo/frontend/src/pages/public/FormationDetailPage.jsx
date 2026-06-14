import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { formationsApi } from '../../api/formations.api';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { useSEO, getFormationSchema } from '../../hooks/useSEO';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/feedback/EmptyState';
import Spinner from '../../components/feedback/Spinner';
import { formatCurrencyStandard } from '../../utils/currency';

const MODE_LABELS = {
  A_LA_DEMANDE: 'A la demande',
  PRESENTIEL: 'Presentiel',
  EN_LIGNE: 'En ligne',
};

function getModeLabel(mode) {
  return MODE_LABELS[mode] || 'Sessions programmees';
}

function formatDuration(days) {
  if (!days) return 'N/A';
  return days === 1 ? '1 jour' : `${days} jours`;
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getF(formation) {
  return {
    titre: formation?.titre || formation?.intitule || 'Formation',
    description: formation?.description || formation?.description_courte || '',
    descriptionLongue: formation?.description_longue || '',
    duree: formation?.duree ?? formation?.duree_jours,
    tarif: formation?.tarif ?? formation?.cout_catalogue,
    prerequis: formation?.prerequis || '',
    objectifs: Array.isArray(formation?.objectifs_pedagogiques) ? formation.objectifs_pedagogiques : [],
    certification: Boolean(formation?.certification_delivree),
    mode: formation?.mode_formation || '',
    lieu: formation?.lieu || '',
  };
}

export default function FormationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formation, setFormation] = useState(null);
  const [sessions, setSessions] = useState([]);

  const { execute: execFormation, isLoading: loadingFormation, error: errorFormation } = useApi();
  const { execute: execSessions, isLoading: loadingSessions } = useApi();

  useEffect(() => {
    execFormation(() => formationsApi.getFormationDetail(id), {
      onSuccess: (data) => setFormation(data?.data ?? data),
    });
    execSessions(() => formationsApi.getSessionsOuvertes(id), {
      onSuccess: (data) => {
        const raw = data?.data ?? data;
        setSessions(Array.isArray(raw) ? raw : []);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!loadingFormation && !loadingSessions) {
      document.dispatchEvent(new Event('prerender-ready'));
    }
  }, [loadingFormation, loadingSessions]);

  const f = formation ? getF(formation) : null;

  useSEO({
    title: f ? `${f.titre} | FORGES` : 'FORGES',
    description: f?.description || 'Decouvrez cette formation certifiante',
    keywords: f ? `${f.titre}, formation, certification, FORGES` : 'formation, certification',
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
      <div className="flex min-h-screen items-center justify-center bg-bg">
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

  if (!formation || !f) return null;

  return (
    <div className="min-h-screen bg-bg">

      {/* ─── Hero sombre style Coursera ─────────────────────────────────── */}
      <div className="bg-primary">
        <div className="container mx-auto px-4 py-10">

          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-white/60">
            <Link to="/" className="hover:text-white transition-colors">Accueil</Link>
            <span>/</span>
            <Link to="/catalogue" className="hover:text-white transition-colors">Catalogue</Link>
            <span>/</span>
            <span className="text-white/80 line-clamp-1">{f.titre}</span>
          </nav>

          <div className="grid lg:grid-cols-3 gap-8 items-start">
            {/* Left — title + meta */}
            <div className="lg:col-span-2">
              <h1 className="text-3xl font-bold text-white leading-snug">
                {f.titre}
              </h1>

              {f.description && (
                <p className="mt-3 text-lg text-white/75 leading-relaxed">
                  {f.description}
                </p>
              )}

              {/* Badges */}
              <div className="mt-4 flex flex-wrap gap-2">
                {f.certification && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-sm font-medium text-white">
                    <svg className="h-4 w-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Certifiante
                  </span>
                )}
                {formation.type_formation === 'PREMIUM' && (
                  <span className="rounded-full border border-amber-400/50 bg-amber-400/20 px-3 py-1 text-sm font-medium text-amber-200">
                    Premium
                  </span>
                )}
                {formation.inclus_abonnement && (
                  <span className="rounded-full border border-green-400/50 bg-green-400/20 px-3 py-1 text-sm font-medium text-green-200">
                    Inclus abonnement
                  </span>
                )}
              </div>

              {/* Stats row */}
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/70">
                {f.duree && (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDuration(f.duree)}
                  </span>
                )}
                {f.mode && (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                    </svg>
                    {getModeLabel(f.mode)}
                  </span>
                )}
                {f.lieu && (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {f.lieu}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  Francais
                </span>
              </div>
            </div>

            {/* Right — card preview (desktop only in hero) */}
            <div className="hidden lg:block" />
          </div>
        </div>
      </div>

      {/* ─── Contenu principal + sidebar sticky ─────────────────────────── */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8 items-start">

          {/* ── Colonne principale ──────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Ce que vous apprendrez — comme Coursera */}
            {f.objectifs.length > 0 && (
              <section className="rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Ce que vous apprendrez
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {f.objectifs.map((objectif, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <svg className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">{objectif}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Description detaillee */}
            {f.descriptionLongue && (
              <section className="rounded-xl border border-gray-200 bg-white p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Description de la formation
                </h2>
                <div className="text-sm text-gray-700 leading-relaxed">
                  {f.descriptionLongue.includes('<') ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: f.descriptionLongue }}
                      className="prose prose-sm max-w-none"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{f.descriptionLongue}</p>
                  )}
                </div>
              </section>
            )}

            {/* Prerequis */}
            {f.prerequis && (
              <section className="rounded-xl border border-blue-200 bg-blue-50 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-bold text-blue-900">Prerequis</h2>
                </div>
                <p className="text-sm text-blue-800 leading-relaxed ml-11">{f.prerequis}</p>
              </section>
            )}

            {/* Certification */}
            {f.certification && (
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-amber-900">Certification delivree</h2>
                    <p className="text-sm text-amber-700 mt-0.5">
                      Un certificat vous sera remis a l'issue de cette formation.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Sessions disponibles */}
            <section className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Sessions disponibles</h2>

              {loadingSessions && (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              )}

              {!loadingSessions && sessions.length === 0 && (
                <EmptyState
                  type="empty"
                  title="Aucune session ouverte"
                  message="Aucune session d'inscription n'est ouverte pour le moment."
                />
              )}

              {!loadingSessions && sessions.length > 0 && (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ── Sidebar sticky — style Coursera ─────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">

              {/* Carte tarif + CTA */}
              <div className="rounded-xl border border-gray-200 bg-white shadow-md overflow-hidden">
                {/* Preview image en haut de la card */}
                {formation.image_url && (
                  <div className="aspect-video w-full overflow-hidden bg-slate-800">
                    <img
                      src={formation.image_url}
                      alt={f.titre}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                {!formation.image_url && (
                  <div className="aspect-video w-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <svg className="h-12 w-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}

                <div className="p-5">
                  {/* Prix */}
                  {typeof f.tarif === 'number' && (
                    <div className="mb-4">
                      {formation.inclus_abonnement ? (
                        <p className="text-2xl font-bold text-success">Inclus dans l'abonnement</p>
                      ) : (
                        <p className="text-3xl font-bold text-gray-900">
                          {formatCurrencyStandard(f.tarif)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* CTA */}
                  {sessions.length > 0 && (
                    <Button
                      variant="primary"
                      size="large"
                      fullWidth
                      onClick={handleInscription}
                    >
                      {user ? "S'inscrire maintenant" : "Se connecter pour s'inscrire"}
                    </Button>
                  )}

                  {!user && (
                    <p className="mt-3 text-center text-xs text-gray-500">
                      Pas encore de compte ?{' '}
                      <Link to="/register" className="font-medium text-secondary hover:underline">
                        Creer un compte
                      </Link>
                    </p>
                  )}

                  {/* Ce que vous obtenez */}
                  <div className="mt-5 space-y-3 border-t border-gray-100 pt-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Cette formation inclut
                    </p>

                    {f.duree && (
                      <div className="flex items-center gap-2.5 text-sm text-gray-700">
                        <svg className="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDuration(f.duree)} de formation
                      </div>
                    )}

                    {f.mode && (
                      <div className="flex items-center gap-2.5 text-sm text-gray-700">
                        <svg className="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                        </svg>
                        {getModeLabel(f.mode)}
                      </div>
                    )}

                    {f.lieu && (
                      <div className="flex items-center gap-2.5 text-sm text-gray-700">
                        <svg className="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {f.lieu}
                      </div>
                    )}

                    {f.certification && (
                      <div className="flex items-center gap-2.5 text-sm text-gray-700">
                        <svg className="h-4 w-4 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        Certificat a l'issue de la formation
                      </div>
                    )}

                    <div className="flex items-center gap-2.5 text-sm text-gray-700">
                      <svg className="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                      Francais
                    </div>
                  </div>
                </div>
              </div>

              {/* Badge FORGES */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">FORGES</p>
                <p className="mt-1 text-xs text-gray-500">
                  Plateforme de formations certifiantes
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function SessionCard({ session }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 hover:border-secondary hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <h4 className="font-semibold text-gray-900 text-sm">
          Session du {formatDate(session.date_debut)}
        </h4>
        <Badge variant="success" size="small">
          Ouverte
        </Badge>
      </div>

      <div className="space-y-1.5 text-xs text-gray-600">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400 flex-shrink-0">Inscriptions :</span>
          <span>Du {formatDate(session.date_ouverture)} au {formatDate(session.date_cloture)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400 flex-shrink-0">Formation :</span>
          <span>Du {formatDate(session.date_debut)} au {formatDate(session.date_fin)}</span>
        </div>
        {session.capacite && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-400 flex-shrink-0">Capacite :</span>
            <span>{session.capacite} places</span>
          </div>
        )}
        {session.lieu && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-400 flex-shrink-0">Lieu :</span>
            <span>{session.lieu}</span>
          </div>
        )}
      </div>
    </div>
  );
}
