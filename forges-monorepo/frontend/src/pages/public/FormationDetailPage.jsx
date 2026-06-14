import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
  A_LA_DEMANDE: 'À la demande',
  PRESENTIEL: 'Présentiel',
  EN_LIGNE: 'En ligne',
  AVEC_SESSION: 'Avec session',
};

const LANGUAGE_LABELS = {
  FR: 'Français',
  EN: 'Anglais',
  ES: 'Espagnol',
  PT: 'Portugais',
};

function getModeLabel(mode) {
  return MODE_LABELS[mode] || 'Avec session';
}

function formatDuration(days) {
  if (!days) return null;
  return days === 1 ? '1 jour' : `${days} jours`;
}

function formatDate(dateString) {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function toPlainText(value = '') {
  if (!value.includes('<')) return value;
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(value, 'text/html').body.textContent || '';
  }
  return value.replace(/<[^>]+>/g, ' ');
}

function normalizeProgramme(programme) {
  if (Array.isArray(programme)) {
    return programme.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof programme !== 'string') return [];
  return programme
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getFormationView(formation) {
  const programme = formation?.programme_syllabus || formation?.programme || '';
  const langues = Array.isArray(formation?.langues_disponibles)
    ? formation.langues_disponibles
    : [];

  return {
    titre: formation?.titre || formation?.intitule || 'Formation',
    description: formation?.description || formation?.description_courte || '',
    descriptionLongue: toPlainText(formation?.description_longue || ''),
    duree: formation?.duree ?? formation?.duree_jours,
    tarif: formation?.tarif ?? formation?.cout_catalogue,
    prerequis: formation?.prerequis || '',
    objectifs: Array.isArray(formation?.objectifs_pedagogiques)
      ? formation.objectifs_pedagogiques.filter(Boolean)
      : [],
    programme: normalizeProgramme(programme),
    certification: Boolean(formation?.certification_delivree),
    mode: formation?.mode_formation || '',
    lieu: formation?.lieu || '',
    langues,
    partenaire: formation?.partenaire?.raison_sociale || '',
  };
}

function getNextSession(sessions) {
  return [...sessions]
    .filter((session) => session?.date_debut)
    .sort((a, b) => new Date(a.date_debut) - new Date(b.date_debut))[0] || null;
}

function getAvailableSessions(sessions) {
  const now = Date.now();
  return sessions.filter((session) => {
    if (!session?.date_cloture) return true;
    return new Date(session.date_cloture).getTime() >= now;
  });
}

function getPlacesLabel(session) {
  if (!session) return null;
  if (typeof session.places_restantes === 'number') {
    return `${session.places_restantes} place${session.places_restantes > 1 ? 's' : ''} restante${session.places_restantes > 1 ? 's' : ''}`;
  }
  if (typeof session.capacite === 'number') {
    return `Capacite de ${session.capacite} places`;
  }
  return null;
}

export default function FormationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formation, setFormation] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSection, setActiveSection] = useState('a-propos');

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
    // Les fonctions execute sont stables dans useApi; l'identifiant pilote le rechargement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!loadingFormation && !loadingSessions) {
      document.dispatchEvent(new Event('prerender-ready'));
    }
  }, [loadingFormation, loadingSessions]);

  const f = formation ? getFormationView(formation) : null;
  const availableSessions = useMemo(() => getAvailableSessions(sessions), [sessions]);
  const nextSession = useMemo(() => getNextSession(availableSessions), [availableSessions]);
  const isOnDemand = f?.mode === 'A_LA_DEMANDE';
  const canEnroll = Boolean(isOnDemand || nextSession);
  const hasCourseContent = Boolean(f?.programme.length || availableSessions.length);

  const sections = useMemo(() => {
    if (!f) return [];
    return [
      { id: 'a-propos', label: 'À propos', visible: true },
      { id: 'resultats', label: 'Résultats', visible: f.objectifs.length > 0 },
      { id: 'cours', label: 'Cours', visible: hasCourseContent },
    ].filter((section) => section.visible);
  }, [f, hasCourseContent]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || sections.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top - 100) - Math.abs(b.boundingClientRect.top - 100)
          )[0];
        if (visibleEntry?.target?.id) setActiveSection(visibleEntry.target.id);
      },
      { rootMargin: '-25% 0px -60% 0px', threshold: [0.1, 0.35, 0.6] }
    );

    sections.forEach(({ id: sectionId }) => {
      const element = document.getElementById(sectionId);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [sections]);

  useSEO({
    title: f ? `${f.titre} | FORGES` : 'FORGES',
    description: f?.description || 'Decouvrez cette formation certifiante',
    keywords: f ? `${f.titre}, formation, certification, FORGES` : 'formation, certification',
    canonical: `https://edu.forges-group.com/formations/${id}`,
    ogImage: formation?.image_url || '/logo_forges.png',
    schema: formation ? getFormationSchema(formation) : null,
  });

  const handleSectionClick = (sectionId) => {
    setActiveSection(sectionId);
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const handleInscription = () => {
    if (!user) {
      navigate('/login', { state: { from: `/formations/${id}` } });
      return;
    }
    if (user.role === 'APPRENANT' || user.role === 'ETUDIANT') {
      navigate(`/apprenant/inscrire/${id}`);
      return;
    }
    navigate('/');
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

  const priceLabel = formation.inclus_abonnement
    ? "Inclus dans l'abonnement"
    : typeof f.tarif === 'number'
      ? formatCurrencyStandard(f.tarif)
      : null;
  const languageLabel = f.langues.length
    ? f.langues.map((langue) => LANGUAGE_LABELS[langue] || langue).join(', ')
    : 'Français';

  return (
    <div className="min-h-screen bg-bg pb-24 lg:pb-0">
      <header className="bg-primary text-white">
        <div className="container mx-auto px-4 py-10">
          <nav
            className="mb-6 flex min-w-0 items-center gap-2 overflow-hidden text-sm"
            aria-label="Fil d'Ariane"
          >
            <Link
              to="/"
              className="shrink-0 font-medium text-white/80 transition-colors hover:text-white"
            >
              Accueil
            </Link>
            <span className="shrink-0 text-white/45" aria-hidden="true">/</span>
            <Link
              to="/catalogue"
              className="shrink-0 font-medium text-white/80 transition-colors hover:text-white"
            >
              Catalogue
            </Link>
            <span className="shrink-0 text-white/45" aria-hidden="true">/</span>
            <span
              className="min-w-0 truncate font-medium text-white"
              aria-current="page"
              title={f.titre}
            >
              {f.titre}
            </span>
          </nav>

          <div className="max-w-4xl">
            {f.partenaire && (
              <p className="mb-3 text-sm font-semibold text-white/75">Proposée par {f.partenaire}</p>
            )}
            <h1 className="text-3xl font-bold leading-tight text-white md:text-5xl">{f.titre}</h1>
            {f.description && (
              <p className="mt-5 max-w-3xl text-base leading-7 text-white/85 md:text-lg">
                {f.description}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {f.certification && (
                <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-sm font-semibold">
                  Certifiante
                </span>
              )}
              {formation.type_formation === 'PREMIUM' && (
                <span className="rounded-full bg-apporteur px-3 py-1 text-sm font-semibold text-white">
                  Premium
                </span>
              )}
              {formation.inclus_abonnement && (
                <span className="rounded-full bg-success px-3 py-1 text-sm font-semibold text-white">
                  Inclus abonnement
                </span>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
              {f.duree && <span>{formatDuration(f.duree)}</span>}
              {f.mode && <span>{getModeLabel(f.mode)}</span>}
              {f.lieu && <span>{f.lieu}</span>}
              <span>{languageLabel}</span>
            </div>
          </div>
        </div>
      </header>

      <nav className="sticky top-0 z-20 border-b border-border bg-white/95 shadow-sm backdrop-blur" aria-label="Sections de la formation">
        <div className="container mx-auto flex overflow-x-auto px-4">
          {sections.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                aria-current={isActive ? 'location' : undefined}
                onClick={() => handleSectionClick(section.id)}
                className={`min-h-14 shrink-0 border-b-2 px-5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-secondary ${
                  isActive
                    ? 'border-secondary bg-secondary/5 text-secondary'
                    : 'border-transparent text-text hover:border-border hover:text-primary'
                }`}
              >
                {section.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
          <div className="space-y-8">
            <section id="a-propos" className="scroll-mt-24 rounded-xl border border-border bg-white p-6 md:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">À propos</p>
              <h2 className="mt-2 text-2xl font-bold text-primary">À propos de cette formation</h2>
              <p className="mt-5 whitespace-pre-line text-base leading-7 text-subtext">
                {f.descriptionLongue || f.description}
              </p>

              {(f.prerequis || f.certification) && (
                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  {f.prerequis && (
                    <div className="rounded-lg border border-border bg-bg p-5">
                      <h3 className="font-bold text-primary">Prérequis</h3>
                      <p className="mt-2 text-sm leading-6 text-subtext">{f.prerequis}</p>
                    </div>
                  )}
                  {f.certification && (
                    <div className="rounded-lg border border-success/25 bg-success/5 p-5">
                      <h3 className="font-bold text-success">Certification délivrée</h3>
                      <p className="mt-2 text-sm leading-6 text-subtext">
                        Une attestation officielle est disponible après validation des conditions de la formation.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {f.objectifs.length > 0 && (
              <section id="resultats" className="scroll-mt-24 rounded-xl border border-border bg-white p-6 md:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Résultats</p>
                <h2 className="mt-2 text-2xl font-bold text-primary">Ce que vous saurez faire</h2>
                <p className="mt-3 text-sm leading-6 text-subtext">
                  Les competences visees a l'issue de ce parcours.
                </p>
                <div className="mt-6 grid gap-x-8 gap-y-4 md:grid-cols-2">
                  {f.objectifs.map((objectif, index) => (
                    <div key={`${objectif}-${index}`} className="flex gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-xs font-bold text-white">
                        OK
                      </span>
                      <p className="text-sm leading-6 text-text">{objectif}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {hasCourseContent && (
              <section id="cours" className="scroll-mt-24 rounded-xl border border-border bg-white p-6 md:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">Cours</p>
                {f.programme.length > 0 && (
                  <>
                    <h2 className="mt-2 text-2xl font-bold text-primary">Programme de la formation</h2>
                    <p className="mt-3 text-sm leading-6 text-subtext">
                      Un parcours structure pour progresser et mettre les acquis en pratique.
                    </p>
                    <div className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border">
                      {f.programme.map((cours, index) => (
                        <article key={`${cours}-${index}`} className="grid gap-2 bg-white p-5 sm:grid-cols-[90px_1fr] sm:items-start">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-secondary">
                            Cours {index + 1}
                          </p>
                          <h3 className="font-semibold leading-6 text-text">{cours}</h3>
                        </article>
                      ))}
                    </div>
                  </>
                )}

                <div className={f.programme.length ? 'mt-10' : ''}>
                  <h2 className="text-2xl font-bold text-primary">Sessions disponibles</h2>
                  {loadingSessions && (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  )}
                  {!loadingSessions && availableSessions.length > 0 && (
                    <div className="mt-5 space-y-3">
                      {availableSessions.map((session) => (
                        <SessionCard key={session.id} session={session} />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {!loadingSessions && availableSessions.length === 0 && !isOnDemand && (
              <section className="rounded-xl border border-border bg-white p-6">
                <EmptyState
                  type="empty"
                  title="Aucune session ouverte"
                  message="Les inscriptions ne sont pas encore ouvertes pour cette formation."
                />
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-20">
            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-lg shadow-primary/5">
              {formation.image_url ? (
                <div className="aspect-video overflow-hidden bg-primary">
                  <img src={formation.image_url} alt={f.titre} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex aspect-video items-end bg-gradient-to-br from-primary to-secondary p-5">
                  <p className="line-clamp-2 text-lg font-bold leading-snug text-white">{f.titre}</p>
                </div>
              )}

              <div className="p-5">
                {priceLabel && (
                  <p className={`text-2xl font-bold ${formation.inclus_abonnement ? 'text-success' : 'text-text'}`}>
                    {priceLabel}
                  </p>
                )}

                {nextSession && (
                  <div className="mt-5 rounded-lg border border-secondary/20 bg-secondary/5 p-4">
                    <InfoRow label="Prochaine session" value={formatDate(nextSession.date_debut)} />
                    <InfoRow label="Clôture des inscriptions" value={formatDate(nextSession.date_cloture)} />
                    <InfoRow label="Places" value={getPlacesLabel(nextSession)} />
                  </div>
                )}

                {canEnroll ? (
                  <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    className="mt-5"
                    onClick={handleInscription}
                  >
                    {user ? "S'inscrire a cette formation" : "Se connecter pour s'inscrire"}
                  </Button>
                ) : (
                  <div className="mt-5 rounded-lg bg-bg p-4 text-center">
                    <p className="text-sm font-semibold text-primary">Inscriptions indisponibles</p>
                    <p className="mt-1 text-xs leading-5 text-subtext">
                      Une nouvelle session sera affichee ici des son ouverture.
                    </p>
                  </div>
                )}

                {!user && canEnroll && (
                  <p className="mt-3 text-center text-xs text-subtext">
                    Pas encore de compte ?{' '}
                    <Link to="/register" className="font-semibold text-secondary hover:underline">
                      Creer un compte
                    </Link>
                  </p>
                )}

                <div className="mt-6 divide-y divide-border border-t border-border">
                  <InfoRow label="Durée" value={formatDuration(f.duree)} />
                  <InfoRow label="Format" value={getModeLabel(f.mode)} />
                  <InfoRow label="Lieu" value={f.lieu} />
                  <InfoRow label="Langues" value={languageLabel} />
                  {f.certification && <InfoRow label="Validation" value="Certification délivrée" />}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {canEnroll && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white p-3 shadow-[0_-6px_20px_rgba(28,40,51,0.12)] lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            {priceLabel && (
              <p className="min-w-0 flex-1 truncate text-sm font-bold text-primary">{priceLabel}</p>
            )}
            <Button variant="primary" onClick={handleInscription}>
              {user ? "S'inscrire" : 'Se connecter'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0">
      <span className="text-subtext">{label}</span>
      <span className="text-right font-semibold text-text">{value}</span>
    </div>
  );
}

function SessionCard({ session }) {
  return (
    <article className="rounded-lg border border-border p-5 transition-colors hover:border-secondary">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-primary">Session du {formatDate(session.date_debut)}</h3>
          <p className="mt-1 text-sm text-subtext">
            Du {formatDate(session.date_debut)} au {formatDate(session.date_fin)}
          </p>
        </div>
        <Badge variant="success" size="small">Ouverte</Badge>
      </div>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <InfoRow label="Inscriptions jusqu’au" value={formatDate(session.date_cloture)} />
        <InfoRow label="Places" value={getPlacesLabel(session)} />
        <InfoRow label="Lieu" value={session.lieu} />
      </div>
    </article>
  );
}
