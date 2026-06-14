import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  animate,
} from 'framer-motion';
import Icon from '../../components/ui/Icon';
import HeroOrbs from '../../components/ui/HeroOrbs';
import logoForges from '../../assets/logo_forges.png';
import logoForgesWebp from '../../assets/logo_forges.webp';
import logoAspire from '../../assets/logo_aspire.png';
import logoAiCrafters from '../../assets/logo_ai_crafters.png';
import imageCcdlGw from '../../assets/image_ccdl_gw.png';
import imageCcdlGwWebp from '../../assets/image_ccdl_gw.webp';
import { usePaymentExpirationHours } from '../../hooks/usePaymentExpirationHours';
import { formatPaymentExpirationShort } from '../../utils/paymentDeadline';
import { useSEO, getOrganizationSchema } from '../../hooks/useSEO';
import { formationsApi } from '../../api/formations.api';
import { abonnementsApi } from '../../api/abonnements.api';
import { useApi } from '../../hooks/useApi';
import FormationMarketplaceCard from '../../components/catalogue/FormationMarketplaceCard';
import Spinner from '../../components/feedback/Spinner';


const CONTACT_EMAIL = 'contact@forges-group.com';

const COLLABORATEURS = [
  { sigle: 'GWU/CCDL', nom: 'George Washington University & CCDL', logo: imageCcdlGw },
  { sigle: 'ASPIRE', nom: 'Aspire Institute', logo: logoAspire },
  { sigle: 'AIC', nom: 'AI Crafters', logo: logoAiCrafters },
];

const HERO_PROOFS = [
  { value: '+3', label: 'Partenaires' },
  { value: '100%', label: 'Mobile' },
  { value: '4', label: 'Langues' },
];

const AUDIENCES = [
  {
    title: 'Apprenants',
    text: 'Accédez au catalogue, suivez vos dossiers, payez en ligne et téléchargez vos attestations officielles.',
    cta: 'Je me forme',
    to: '/register/etudiant',
    icon: 'academicCap',
    tone: 'secondary',
  },
  {
    title: 'Organisations',
    text: 'Pilotez les inscriptions, financez les parcours avec vouchers et suivez vos équipes dans un tableau de bord dédié.',
    cta: 'Je forme mon équipe',
    to: '/register/organisation',
    icon: 'building',
    tone: 'success',
  },
];

const STEPS = [
  {
    title: 'Choisir le bon profil',
    text: 'Compte individuel, organisation, partenaire ou apporteur : chaque parcours commence au bon endroit.',
  },
  {
    title: "S'inscrire ou financer",
    text: 'Formations avec session, à la demande, vouchers et paiements locaux sont gérés dans le même flux.',
  },
  {
    title: 'Suivre les preuves',
    text: 'Dossiers, paiements, attestations, commissions et rapports restent consultables dans les espaces dédiés.',
  },
];

const BENEFITS = [
  {
    icon: 'bookOpen',
    title: 'Catalogue lisible',
    text: 'Des formations certifiantes triées par besoin, format, durée, prix et éligibilité abonnement.',
  },
  {
    icon: 'creditCard',
    title: 'Paiements locaux',
    text: 'Mobile Money, carte, virement et vouchers organisationnels pour couvrir les usages terrain.',
  },
  {
    icon: 'document',
    title: 'Attestations officielles',
    text: 'Documents PDF disponibles après formation terminée et paiement confirmé.',
  },
  {
    icon: 'chartBar',
    title: 'Pilotage équipe',
    text: 'Les comptes organisation suivent inscriptions, membres, vouchers, paiements et abonnements B2B.',
  },
  {
    icon: 'checkCircle',
    title: 'Flux vérifiés',
    text: 'Les règles de validation, délais, capacités et statuts sont contrôlées côté service.',
  },
  {
    icon: 'users',
    title: 'Écosystème complet',
    text: 'Apprenants, organisations, partenaires fournisseurs et apporteurs travaillent dans un même cadre.',
  },
];

function CtaLink({ to, children, variant = 'primary', className = '' }) {
  const variants = {
    primary: 'bg-primary text-white hover:bg-[#0F2F43] hover:text-white focus:ring-primary',
    secondary: 'bg-primary text-white hover:bg-[#0F2F43] hover:text-white focus:ring-secondary',
    light: 'border-white bg-white text-primary hover:bg-[#EAF2F8] hover:text-primary focus:ring-white',
    outline: 'border-border bg-white text-primary hover:border-primary hover:bg-bg hover:text-primary focus:ring-primary',
    dark: 'border-white/70 bg-primary text-white hover:bg-[#0F2F43] hover:text-white focus:ring-white',
    darkPrimary: 'border-white/70 bg-[#12364D] text-white hover:bg-[#0F2F43] hover:text-white focus:ring-white',
  };

  return (
    <Link
      to={to}
      className={`inline-flex min-h-[48px] items-center justify-center rounded-lg border border-transparent px-5 py-3 text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${variants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

function SectionHeading({ eyebrow, title, description, align = 'center' }) {
  const alignment = align === 'left' ? 'text-left' : 'mx-auto text-center';

  return (
    <div className={`max-w-3xl ${alignment}`}>
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-secondary">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-3 text-3xl font-bold leading-tight text-primary md:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-7 text-subtext md:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}

function CheckItem({ children }) {
  return (
    <li className="flex gap-3 text-sm leading-6 text-white/95">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
        <Icon name="check" size={14} />
      </span>
      <span>{children}</span>
    </li>
  );
}

function ProductPreview() {
  const milestones = [
    { label: 'Inscription validée', state: 'done' },
    { label: 'Module principal en cours', state: 'done' },
    { label: 'Évaluation finale', state: 'current' },
    { label: 'Attestation numérique après clôture', state: 'next' },
  ];

  return (
    <div className="landing-float relative mx-auto max-w-md rounded-2xl border border-white/20 bg-white/10 p-4 shadow-2xl shadow-primary/20 backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/15 pb-3">
        <div className="flex items-center gap-3">
          <picture>
            <source srcSet={logoForgesWebp} type="image/webp" />
            <img src={logoForges} alt="FORGES" className="h-10 w-10 rounded-full object-cover" />
          </picture>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Parcours certifiant</p>
            <p className="text-sm font-semibold text-white">Formation professionnelle</p>
          </div>
        </div>
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
          En cours
        </span>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Progression formation</p>
            <h3 className="mt-2 text-lg font-bold leading-snug text-white">Certification professionnelle en cours</h3>
          </div>
          <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold text-white">68%</span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
          <div className="landing-meter h-full w-[68%] rounded-full bg-white/80" />
        </div>

        <div className="mt-4 grid gap-2">
          {milestones.map((milestone) => (
            <div key={milestone.label} className="flex items-center gap-3 rounded-lg bg-white/8 px-3 py-2 text-xs font-medium text-white/90">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  milestone.state === 'done'
                    ? 'bg-white/20 text-white'
                    : milestone.state === 'current'
                      ? 'bg-amber-400/30 text-amber-200'
                      : 'bg-white/10 text-white/50'
                }`}
              >
                <Icon name={milestone.state === 'done' ? 'check' : 'clock'} size={13} />
              </span>
              {milestone.label}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white/10 p-3">
          <p className="text-xs text-white/60">Modules validés</p>
          <p className="mt-1 text-xl font-bold text-white">2/4</p>
        </div>
        <div className="rounded-lg bg-white/10 p-3">
          <p className="text-xs text-white/60">Certification</p>
          <p className="mt-1 text-xl font-bold text-white">En vue</p>
        </div>
      </div>
    </div>
  );
}

function CarouselCollaborateurs() {
  const items = [...COLLABORATEURS, ...COLLABORATEURS, ...COLLABORATEURS];

  return (
    <div className="landing-partner-carousel relative w-full overflow-hidden" aria-label="Partenaires FORGES">
      <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-16 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-16 bg-gradient-to-l from-white to-transparent" />

      <div className="landing-partner-track flex w-max gap-5 px-4">
        {items.map((collaborateur, index) => (
          <div
            key={`${collaborateur.sigle}-${index}`}
            className="flex w-48 shrink-0 flex-col items-center gap-3 rounded-xl border border-border bg-white p-4 shadow-sm"
          >
            <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-lg bg-bg">
              {collaborateur.logo ? (
                <img
                  src={collaborateur.logo}
                  alt={collaborateur.nom}
                  className="h-full w-full object-contain p-3 mix-blend-multiply"
                />
              ) : (
                <span className="text-sm font-bold text-primary">{collaborateur.sigle}</span>
              )}
            </div>
            <p className="text-center text-xs font-medium leading-tight text-subtext">
              {collaborateur.nom}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 400, damping: 40, restDelta: 0.001 });
  return (
    <motion.div
      style={{ scaleX, transformOrigin: 'left' }}
      className="fixed left-0 right-0 top-0 z-[200] h-[3px] bg-secondary"
      aria-hidden="true"
    />
  );
}

function AnimatedStat({ value, label }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-20px' });
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState('0');

  const prefixMatch = value.match(/^([+]?)(\d+)([%]?)$/);
  const prefix = prefixMatch?.[1] ?? '';
  const target = parseInt(prefixMatch?.[2] ?? '0', 10);
  const suffix = prefixMatch?.[3] ?? '';

  useMotionValueEvent(motionValue, 'change', (latest) => {
    setDisplay(String(Math.round(latest)));
  });

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(motionValue, target, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [isInView, target, motionValue]);

  return (
    <div ref={ref}>
      <p className="text-3xl font-bold text-white">
        {prefix}{display}{suffix}
      </p>
      <p className="mt-1 text-sm text-white/80">{label}</p>
    </div>
  );
}

const PERKS_B2B = {
  STARTER:    ['Jusqu\'a 20 membres', 'Vouchers organisation', 'Tableau de bord equipe', 'Formations standard incluses'],
  BUSINESS:   ['Jusqu\'a 50 membres', 'Vouchers organisation', 'Tableau de bord equipe', 'Formations standard incluses', 'Rapports consolides'],
  ENTERPRISE: ['Jusqu\'a 100 membres', 'Vouchers organisation', 'Tableau de bord equipe', 'Formations standard incluses', 'Rapports consolides', '2 formations Premium offertes'],
};

const PERKS_ESSENTIEL = [
  { text: 'Formations incluses comprises', ok: true },
  { text: 'Inscription session par session', ok: true },
  { text: 'Reduction -15% sur les sessions', ok: true },
  { text: 'Formations Premium exclusives', ok: false },
];

const PERKS_PREMIUM = [
  { text: 'Formations incluses comprises', ok: true },
  { text: 'Inscription session par session', ok: true },
  { text: 'Reduction -15% sur les sessions', ok: true },
  { text: 'Formations Premium exclusives', ok: true },
];

function formatXof(xof) {
  return xof ? `${Number(xof).toLocaleString('fr-FR')} FCFA` : null;
}

function PerkRow({ text, ok }) {
  return (
    <li className="flex items-center gap-3 text-sm text-subtext">
      {ok ? (
        <svg className="h-4 w-4 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-4 w-4 shrink-0 text-border" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span className={ok ? '' : 'text-subtext/50'}>{text}</span>
    </li>
  );
}

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [featuredFormations, setFeaturedFormations] = useState([]);
  const prefersReducedMotion = useReducedMotion();
  const paymentExpirationHours = usePaymentExpirationHours();
  const { execute: fetchFeatured, isLoading: loadingFeatured } = useApi();
  const { execute: fetchTarifs } = useApi();
  const [tarifs, setTarifs] = useState(null);
  const [pricingMode, setPricingMode] = useState('individuel');

  useSEO({
    title: 'FORGES — Formations Certifiantes | Cybersecurite, IA, Data Science en Cote d\'Ivoire',
    description: 'Plateforme africaine de formations certifiantes en cybersecurite, IA, data science et transformation digitale. Certifications reconnues pour les professionnels d\'Afrique de l\'Ouest.',
    keywords: 'formations en ligne Cote d\'Ivoire, cybersecurite Abidjan, intelligence artificielle Afrique, data science Afrique de l\'Ouest, certification professionnelle',
    canonical: 'https://edu.forges-group.com/',
    ogImage: 'https://edu.forges-group.com/logo_forges.png',
    schema: getOrganizationSchema(),
  });

  const loadFeatured = async () => {
    await fetchFeatured(
      () => formationsApi.getCatalogue({ page: 1, limit: 12 }),
      {
        onSuccess: (data) => {
          setFeaturedFormations(data.data || []);
          document.dispatchEvent(new Event('prerender-ready'));
        },
        onError: () => {
          document.dispatchEvent(new Event('prerender-ready'));
        },
      }
    );
  };

  useEffect(() => {
    loadFeatured();
    fetchTarifs(() => abonnementsApi.getTarifs(), {
      onSuccess: (data) => setTarifs(data?.data ?? data),
      onError: () => {},
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const faqItems = [
    {
      question: 'Comment créer un compte sur FORGES ?',
      answer: "L'inscription est gratuite et prend moins de 2 minutes. Choisissez votre profil, renseignez vos informations et confirmez votre email.",
    },
    {
      question: 'Quels modes de paiement sont acceptés ?',
      answer: 'FORGES prend en charge les paiements locaux comme Mobile Money, les cartes bancaires, les virements et les vouchers prépayés pour organisations.',
    },
    {
      question: 'Combien de temps faut-il pour valider mon inscription ?',
      answer: `Les dossiers Premium Retail sont examinés avant paiement. Une fois retenu, le paiement doit être effectué dans les ${formatPaymentExpirationShort(paymentExpirationHours)}. Les autres parcours vont directement au paiement.`,
    },
    {
      question: 'Comment obtenir mon attestation ?',
      answer: "L'attestation officielle en PDF est disponible dans votre espace personnel lorsque le paiement est confirmé et la session clôturée.",
    },
    {
      question: 'Une structure peut-elle former plusieurs personnes ?',
      answer: 'Oui. Les comptes organisation disposent de vouchers, abonnements B2B, gestion des membres et rapports consolidés.',
    },
  ];

  const toggleFaq = (index) => {
    setOpenFaq((current) => (current === index ? null : index));
  };

  return (
    <div className="min-h-screen overflow-hidden bg-bg">
      {!prefersReducedMotion && <ScrollProgressBar />}
      <section className="relative isolate overflow-hidden bg-primary text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(46,134,193,0.72),transparent_34%),linear-gradient(135deg,#12364D_0%,#1B4F72_48%,#2E86C1_100%)]" />
        {!prefersReducedMotion && <HeroOrbs />}
        <div className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-t from-bg to-transparent" />

        <div className="mx-auto grid min-h-[calc(100dvh-5rem)] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.85fr] lg:px-8 lg:py-20">
          <div className="landing-reveal max-w-3xl">
            <h1 className="mt-0 text-4xl font-extrabold leading-[1.05] tracking-normal text-white md:mt-0 md:text-6xl">
              Apprendre en Afrique, progresser en entreprise
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-white/90 md:text-xl">
              FORGES relie les apprenants et les entreprises autour de parcours certifiants utiles, clairs et suivis.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CtaLink to="/register/etudiant" variant="light" className="sm:min-w-44">
                Je me forme
              </CtaLink>
              <CtaLink to="/register/organisation" variant="dark" className="sm:min-w-52">
                Je forme mon équipe
              </CtaLink>
            </div>

            <div className="mt-10 grid gap-4 border-t border-white/20 pt-8 sm:grid-cols-3">
              {HERO_PROOFS.map((proof) =>
                prefersReducedMotion ? (
                  <div key={proof.label}>
                    <p className="text-3xl font-bold text-white">{proof.value}</p>
                    <p className="mt-1 text-sm text-white/80">{proof.label}</p>
                  </div>
                ) : (
                  <AnimatedStat key={proof.label} value={proof.value} label={proof.label} />
                )
              )}
            </div>
          </div>

          <div className="landing-reveal landing-reveal-delay">
            <ProductPreview />
          </div>
        </div>
      </section>

      <section className="relative -mt-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
          {AUDIENCES.map((audience) => (
            <div
              key={audience.title}
              className="landing-card rounded-xl border border-border bg-white p-6 shadow-lg shadow-primary/5"
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${audience.tone === 'success' ? 'bg-success-soft text-success' : 'bg-secondary-soft text-secondary'}`}>
                  <Icon name={audience.icon} size={24} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-primary">{audience.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-subtext">{audience.text}</p>
                  <CtaLink to={audience.to} variant={audience.tone === 'success' ? 'primary' : 'secondary'} className="mt-5">
                    {audience.cta}
                  </CtaLink>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="py-20"
        style={{
          backgroundColor: '#F0F6FA',
          backgroundImage: `radial-gradient(circle, rgba(46,134,193,0.12) 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="flex items-end justify-between gap-4 mb-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeInUp}
          >
            <SectionHeading
              align="left"
              eyebrow="Catalogue"
              title="Formations certifiantes"
              description="Parcourez les parcours certifiants ouverts aux inscriptions."
            />
            <CtaLink to="/catalogue" variant="outline" className="shrink-0">
              Voir tout le catalogue
            </CtaLink>
          </motion.div>

          {loadingFeatured && (
            <div className="flex justify-center py-12">
              <Spinner size="large" />
            </div>
          )}

          {!loadingFeatured && featuredFormations.length > 0 && (
            <motion.div
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={staggerContainer}
            >
              {featuredFormations.slice(0, 6).map((formation) => (
                <motion.div
                  key={formation.id}
                  variants={cardVariant}
                  whileHover={prefersReducedMotion ? {} : {
                    y: -6,
                    rotateX: 2,
                    rotateY: -2,
                    scale: 1.01,
                    transition: { duration: 0.2, ease: 'easeOut' },
                  }}
                  style={{ transformStyle: 'preserve-3d', perspective: 800 }}
                >
                  <FormationMarketplaceCard formation={formation} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {!loadingFeatured && featuredFormations.length === 0 && (
            <motion.div
              className="flex flex-col items-center gap-6 rounded-2xl border border-primary/10 bg-white/70 px-8 py-14 text-center backdrop-blur-sm"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/8">
                <Icon name="academicCap" size={32} className="text-primary/60" />
              </div>
              <div>
                <p className="text-lg font-bold text-primary">
                  Des formations bientot disponibles
                </p>
                <p className="mt-2 max-w-md text-sm leading-6 text-subtext">
                  Nos parcours certifiants arrivent prochainement. Restez branche sur nos reseaux pour etre les premiers informes.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Remplacer href par les vrais liens */}
                <a
                  href="https://www.linkedin.com/company/forges-agregateur/posts/?feedView=all"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/15 bg-white text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  aria-label="FORGES sur LinkedIn"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a
                  href="https://www.facebook.com/forgesgroup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-primary/15 bg-white text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  aria-label="FORGES sur Facebook"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="overflow-hidden rounded-2xl bg-[#0D2233]"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeInUp}
          >
            <div className="grid lg:grid-cols-2">
              <div className="relative flex min-h-72 items-center justify-center bg-white/5 p-8 lg:min-h-[460px]">
                <picture>
                  <source srcSet={imageCcdlGwWebp} type="image/webp" />
                  <img
                    src={imageCcdlGw}
                    alt="Masterclass GWU CCDL — Abidjan"
                    className="relative z-10 h-full max-h-72 w-full object-contain lg:max-h-80"
                  />
                </picture>
              </div>

              <div className="flex flex-col justify-center px-8 py-12 md:px-12">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
                  Temps fort
                </p>
                <h2 className="mt-4 text-3xl font-extrabold leading-tight text-white md:text-4xl">
                  Masterclass GWU/CCDL<br />
                  <span className="text-white/55">Cybersécurité & IA</span>
                </h2>
                <p className="mt-5 text-sm leading-7 text-white/50">
                  10 jours. Abidjan. Co-délivré avec la George Washington University et le CCDL — un moment de formation internationale que FORGES a rendu possible en Afrique de l'Ouest.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={fadeInUp}
          >
            <SectionHeading
              eyebrow="Abonnements"
              title="Accedez a plus avec un abonnement"
              description="Choisissez le plan adapte a votre rythme. Resiliable a tout moment."
            />
          </motion.div>

          {/* Toggle Individuel / Organisation */}
          <div className="mt-10 flex justify-center">
            <div className="inline-flex rounded-xl border border-border bg-bg p-1">
              {['individuel', 'organisation'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPricingMode(mode)}
                  className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-all duration-200 ${
                    pricingMode === mode
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-subtext hover:text-primary'
                  }`}
                >
                  {mode === 'individuel' ? 'Individuel' : 'Organisation'}
                </button>
              ))}
            </div>
          </div>

          {/* Plans Individuel */}
          {pricingMode === 'individuel' && (
            <motion.div
              key="individuel"
              className="mt-8 grid gap-5 lg:grid-cols-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {/* Catalogue libre */}
              <div className="flex flex-col rounded-2xl border border-border bg-bg p-7">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-subtext">Catalogue libre</p>
                <p className="mt-4 text-3xl font-extrabold text-primary">Gratuit</p>
                <p className="mt-1 text-sm text-subtext">Sans engagement</p>
                <p className="mt-4 text-sm leading-6 text-subtext">
                  Explorez le catalogue et payez uniquement les formations que vous choisissez.
                </p>
                <ul className="mt-6 space-y-3">
                  <PerkRow text="Catalogue complet visible" ok={true} />
                  <PerkRow text="Paiement a la session" ok={true} />
                  <PerkRow text="Formations incluses comprises" ok={false} />
                  <PerkRow text="Reduction -15% sur les sessions" ok={false} />
                </ul>
                <div className="mt-auto pt-8">
                  <CtaLink to="/catalogue" variant="outline" className="w-full">Parcourir le catalogue</CtaLink>
                </div>
              </div>

              {/* Essentiel */}
              <div className="flex flex-col rounded-2xl border border-border bg-white p-7 shadow-md shadow-primary/5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-secondary">Essentiel</p>
                <div className="mt-4 flex items-end gap-1">
                  <p className="text-3xl font-extrabold text-primary">
                    {tarifs?.retail?.ESSENTIEL ? formatXof(tarifs.retail.ESSENTIEL) : '15 000 FCFA'}
                  </p>
                  <p className="mb-1 text-sm text-subtext">/mois</p>
                </div>
                <p className="mt-1 text-sm text-subtext">Formations incluses, acces illimite</p>
                <p className="mt-4 text-sm leading-6 text-subtext">
                  Une mensualite fixe pour acceder librement aux formations standard du catalogue.
                </p>
                <ul className="mt-6 space-y-3">
                  {PERKS_ESSENTIEL.map((p) => <PerkRow key={p.text} {...p} />)}
                </ul>
                <div className="mt-auto pt-8">
                  <CtaLink to="/register/etudiant" variant="secondary" className="w-full">Commencer avec Essentiel</CtaLink>
                </div>
              </div>

              {/* Premium */}
              <div className="relative flex flex-col rounded-2xl border-2 border-secondary bg-primary p-7 shadow-xl shadow-primary/20">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-sm">
                  Recommande
                </span>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/60">Premium</p>
                <div className="mt-4 flex items-end gap-1">
                  <p className="text-3xl font-extrabold text-white">
                    {tarifs?.retail?.PREMIUM ? formatXof(tarifs.retail.PREMIUM) : '25 000 FCFA'}
                  </p>
                  <p className="mb-1 text-sm text-white/60">/mois</p>
                </div>
                <p className="mt-1 text-sm text-white/60">Tout Essentiel + formations exclusives</p>
                <p className="mt-4 text-sm leading-6 text-white/75">
                  Le niveau superieur pour acceder aux formations Premium et progresser sans limite.
                </p>
                <ul className="mt-6 space-y-3">
                  {PERKS_PREMIUM.map((p) => (
                    <li key={p.text} className="flex items-center gap-3 text-sm text-white/85">
                      <svg className="h-4 w-4 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {p.text}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <CtaLink to="/register/etudiant" variant="light" className="w-full">Commencer avec Premium</CtaLink>
                </div>
              </div>
            </motion.div>
          )}

          {/* Plans Organisation */}
          {pricingMode === 'organisation' && (
            <motion.div
              key="organisation"
              className="mt-8 grid gap-5 lg:grid-cols-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {/* Starter */}
              <div className="flex flex-col rounded-2xl border border-border bg-bg p-7">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-subtext">Starter</p>
                <div className="mt-4 flex items-end gap-1">
                  <p className="text-3xl font-extrabold text-primary">
                    {tarifs?.b2b?.STARTER?.prix_annuel ? formatXof(tarifs.b2b.STARTER.prix_annuel) : '250 000 FCFA'}
                  </p>
                  <p className="mb-1 text-sm text-subtext">/an</p>
                </div>
                <p className="mt-1 text-sm text-subtext">
                  Jusqu'a {tarifs?.b2b?.STARTER?.nb_max ?? 20} membres
                </p>
                <p className="mt-4 text-sm leading-6 text-subtext">
                  Ideal pour les petites equipes qui veulent centraliser la formation de leurs collaborateurs.
                </p>
                <ul className="mt-6 space-y-3">
                  {PERKS_B2B.STARTER.map((t) => <PerkRow key={t} text={t} ok={true} />)}
                </ul>
                <div className="mt-auto pt-8">
                  <CtaLink to="/register/organisation" variant="outline" className="w-full">Commencer Starter</CtaLink>
                </div>
              </div>

              {/* Business */}
              <div className="relative flex flex-col rounded-2xl border-2 border-secondary bg-primary p-7 shadow-xl shadow-primary/20">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white shadow-sm">
                  Populaire
                </span>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/60">Business</p>
                <div className="mt-4 flex items-end gap-1">
                  <p className="text-3xl font-extrabold text-white">
                    {tarifs?.b2b?.BUSINESS?.prix_annuel ? formatXof(tarifs.b2b.BUSINESS.prix_annuel) : '500 000 FCFA'}
                  </p>
                  <p className="mb-1 text-sm text-white/60">/an</p>
                </div>
                <p className="mt-1 text-sm text-white/60">
                  Jusqu'a {tarifs?.b2b?.BUSINESS?.nb_max ?? 50} membres
                </p>
                <p className="mt-4 text-sm leading-6 text-white/75">
                  Pour les equipes en croissance qui forment regulierement et veulent piloter les resultats.
                </p>
                <ul className="mt-6 space-y-3">
                  {PERKS_B2B.BUSINESS.map((t) => (
                    <li key={t} className="flex items-center gap-3 text-sm text-white/85">
                      <svg className="h-4 w-4 shrink-0 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <CtaLink to="/register/organisation" variant="light" className="w-full">Commencer Business</CtaLink>
                </div>
              </div>

              {/* Enterprise */}
              <div className="flex flex-col rounded-2xl border border-border bg-white p-7 shadow-md shadow-primary/5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-secondary">Enterprise</p>
                <div className="mt-4 flex items-end gap-1">
                  <p className="text-3xl font-extrabold text-primary">
                    {tarifs?.b2b?.ENTERPRISE?.prix_annuel ? formatXof(tarifs.b2b.ENTERPRISE.prix_annuel) : '900 000 FCFA'}
                  </p>
                  <p className="mb-1 text-sm text-subtext">/an</p>
                </div>
                <p className="mt-1 text-sm text-subtext">
                  Jusqu'a {tarifs?.b2b?.ENTERPRISE?.nb_max ?? 100} membres
                </p>
                <p className="mt-4 text-sm leading-6 text-subtext">
                  La solution complete pour les grandes structures avec formations Premium et suivi avance.
                </p>
                <ul className="mt-6 space-y-3">
                  {PERKS_B2B.ENTERPRISE.map((t) => <PerkRow key={t} text={t} ok={true} />)}
                </ul>
                <div className="mt-auto pt-8">
                  <CtaLink to="/register/organisation" variant="secondary" className="w-full">Commencer Enterprise</CtaLink>
                </div>
              </div>
            </motion.div>
          )}

          {/* Callout Sur devis */}
          <motion.div
            className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-border bg-bg px-8 py-6 sm:flex-row"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            {pricingMode === 'individuel' ? (
              <>
                <div>
                  <p className="font-bold text-primary">Vous etes une organisation ?</p>
                  <p className="mt-1 text-sm text-subtext">
                    Formez vos equipes avec des vouchers, un abonnement B2B et un tableau de bord dedie.
                  </p>
                </div>
                <button type="button" onClick={() => setPricingMode('organisation')} className="shrink-0 inline-flex min-h-[48px] items-center justify-center rounded-lg border border-border bg-white px-5 py-3 text-sm font-semibold text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
                  Voir les offres organisation
                </button>
              </>
            ) : (
              <>
                <div>
                  <p className="font-bold text-primary">Plus de 100 membres ou besoins specifiques ?</p>
                  <p className="mt-1 text-sm text-subtext">
                    Contrat institutionnel sur mesure, palier illimite, conditions negociees.
                  </p>
                </div>
                <a href={`mailto:contact@forges-group.com?subject=Offre sur devis`} className="shrink-0 inline-flex min-h-[48px] items-center justify-center rounded-lg border border-border bg-white px-5 py-3 text-sm font-semibold text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
                  Contacter pour un devis
                </a>
              </>
            )}
          </motion.div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Réseau"
            title="Partenaires de confiance"
            description="FORGES s'appuie sur un réseau académique, institutionnel et privé qui renforce la qualité des parcours proposés."
          />
          <div className="mt-10">
            <CarouselCollaborateurs />
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Parcours"
            title="Un flux clair du choix à la preuve"
            description="La landing garde l'explication simple, mais met davantage en avant la valeur concrete pour chaque profil."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="landing-card rounded-xl border border-border bg-white p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-5 text-lg font-bold text-primary">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-subtext">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <SectionHeading
              align="left"
              eyebrow="Avantages"
              title="Ce que chaque profil comprend rapidement"
              description="La page met en avant les bénéfices utiles sans multiplier les blocs répétitifs."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              {BENEFITS.map((benefit) => (
                <div key={benefit.title} className="landing-card rounded-xl border border-border bg-bg p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-secondary shadow-sm">
                    <Icon name={benefit.icon} size={22} />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-primary">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-subtext">{benefit.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="rounded-2xl bg-primary p-8 text-white md:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/70">Décision</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-white md:text-4xl">
                Commencez par le parcours qui correspond à votre besoin
              </h2>
              <p className="mt-4 text-base leading-7 text-white/90">
                Un particulier peut s'inscrire au catalogue. Une structure peut financer, suivre et consolider
                les formations de ses membres.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <CtaLink to="/register/etudiant" variant="light">
                  Créer un compte apprenant
                </CtaLink>
                <CtaLink to="/register/organisation" variant="dark">
                  Créer un compte organisation
                </CtaLink>
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeading
                align="left"
                eyebrow="FAQ"
                title="Questions fréquentes"
                description="Les réponses essentielles restent disponibles sans alourdir la première lecture."
              />

              <div className="space-y-3">
                {faqItems.map((item, index) => {
                  const isOpen = openFaq === index;

                  return (
                    <div key={item.question} className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleFaq(index)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-primary transition-colors hover:bg-bg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-secondary"
                      >
                        <span>{item.question}</span>
                        <Icon
                          name="arrowRight"
                          size={18}
                          className={`shrink-0 text-secondary transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                        />
                      </button>
                      <div className={`landing-faq-panel ${isOpen ? 'landing-faq-panel-open' : ''}`}>
                        <p className="px-5 pb-5 text-sm leading-6 text-subtext">{item.answer}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-bg py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 overflow-hidden rounded-2xl border border-border bg-white shadow-lg shadow-primary/5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="bg-primary p-8 text-white md:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/70">Contact</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-white md:text-4xl">
                Nous contacter
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-white/90">
                Une question sur une inscription, un partenariat ou un parcours certifiant ?
                Écrivez-nous et l’équipe FORGES vous répondra par email.
              </p>
              <div className="mt-8 rounded-xl border border-white/15 bg-white/10 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                  Adresse email
                </p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="mt-3 inline-flex text-lg font-semibold text-white underline-offset-4 transition-colors hover:underline focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>

            <div className="p-8 md:p-10">
              <div className="rounded-2xl border border-border bg-bg p-6 md:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">
                  Réponse orientée
                </p>
                <ul className="mt-5 space-y-4">
                  <li className="rounded-xl bg-white px-4 py-3 text-sm leading-6 text-text shadow-sm">
                    Inscriptions apprenants et organisations
                  </li>
                  <li className="rounded-xl bg-white px-4 py-3 text-sm leading-6 text-text shadow-sm">
                    Partenariats et formations certifiantes
                  </li>
                  <li className="rounded-xl bg-white px-4 py-3 text-sm leading-6 text-text shadow-sm">
                    Questions sur l’accompagnement et les parcours
                  </li>
                </ul>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="mt-8 inline-flex min-h-[48px] items-center justify-center rounded-lg border border-primary/20 bg-white px-5 py-3 text-sm font-semibold text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-[#EAF2F8] hover:text-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Nous écrire
              </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
