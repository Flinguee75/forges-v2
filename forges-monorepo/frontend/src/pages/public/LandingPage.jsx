import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Icon from '../../components/ui/Icon';
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
    <div className="landing-float relative mx-auto max-w-md rounded-2xl border border-white/70 bg-white p-4 shadow-2xl shadow-primary/20">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-3">
          <picture>
            <source srcSet={logoForgesWebp} type="image/webp" />
            <img src={logoForges} alt="FORGES" className="h-10 w-10 rounded-full object-cover" />
          </picture>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/60">Parcours certifiant</p>
            <p className="text-sm font-semibold text-text">Formation professionnelle</p>
          </div>
        </div>
        <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
          En cours
        </span>
      </div>

      <div className="rounded-xl border border-border bg-bg p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Progression formation</p>
            <h3 className="mt-2 text-lg font-bold leading-snug text-primary">Certification professionnelle en cours</h3>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-primary">68%</span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
          <div className="landing-meter h-full w-[68%] rounded-full bg-success" />
        </div>

        <div className="mt-4 grid gap-2">
          {milestones.map((milestone) => (
            <div key={milestone.label} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-xs font-medium text-text">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  milestone.state === 'done'
                    ? 'bg-success-soft text-success'
                    : milestone.state === 'current'
                      ? 'bg-warning-soft text-warning'
                      : 'bg-secondary-soft text-secondary'
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
        <div className="rounded-lg bg-secondary-soft p-3">
          <p className="text-xs text-subtext">Modules validés</p>
          <p className="mt-1 text-xl font-bold text-primary">2/4</p>
        </div>
        <div className="rounded-lg bg-success-soft p-3">
          <p className="text-xs text-subtext">Certification</p>
          <p className="mt-1 text-xl font-bold text-success">En vue</p>
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

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [featuredFormations, setFeaturedFormations] = useState([]);
  const paymentExpirationHours = usePaymentExpirationHours();
  const { execute: fetchFeatured, isLoading: loadingFeatured } = useApi();

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
      <section className="relative isolate overflow-hidden bg-primary text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(46,134,193,0.72),transparent_34%),linear-gradient(135deg,#12364D_0%,#1B4F72_48%,#2E86C1_100%)]" />
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
              {HERO_PROOFS.map((proof) => (
                <div key={proof.label}>
                  <p className="text-3xl font-bold text-white">{proof.value}</p>
                  <p className="mt-1 text-sm text-white/80">{proof.label}</p>
                </div>
              ))}
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

      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="flex items-end justify-between gap-4 mb-10">
            <SectionHeading
              align="left"
              eyebrow="Catalogue"
              title="Formations certifiantes"
              description="Parcourez les parcours certifiants ouverts aux inscriptions."
            />
            <CtaLink to="/catalogue" variant="outline" className="shrink-0">
              Voir tout le catalogue
            </CtaLink>
          </div>

          {loadingFeatured && (
            <div className="flex justify-center py-12">
              <Spinner size="large" />
            </div>
          )}

          {!loadingFeatured && featuredFormations.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredFormations.slice(0, 6).map((formation) => (
                <FormationMarketplaceCard key={formation.id} formation={formation} />
              ))}
            </div>
          )}

          {!loadingFeatured && featuredFormations.length === 0 && (
            <div className="flex justify-center py-8">
              <CtaLink to="/catalogue" variant="primary">
                Voir le catalogue
              </CtaLink>
            </div>
          )}
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 overflow-hidden rounded-2xl bg-primary text-white shadow-xl shadow-primary/10 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="relative min-h-72 bg-white lg:h-full">
              <picture>
                <source srcSet={imageCcdlGwWebp} type="image/webp" />
                <img
                  src={imageCcdlGw}
                  alt="Masterclass GWU CCDL"
                  className="h-full min-h-72 w-full object-contain p-5"
                />
              </picture>
              <div className="absolute left-5 top-5 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary shadow-sm">
                Formation vedette
              </div>
            </div>

            <div className="p-6 md:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/70">
                Crédibilité académique
              </p>
              <h2 className="mt-3 text-3xl font-bold leading-tight text-white md:text-4xl">
                Masterclass GWU/CCDL - Cybersécurité & IA
              </h2>
              <p className="mt-4 text-base leading-7 text-white/90">
                Formation internationale co-délivrée par la George Washington University et le CCDL :
                10 jours intensifs à Abidjan autour de la cybersécurité stratégique et de la gouvernance IA.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  ['Durée', '10 jours'],
                  ['Format', 'Présentiel'],
                  ['Lieu', 'Abidjan'],
                  ['Tarif', '3 000 000 FCFA'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/20 bg-white/10 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/70">{label}</p>
                    <p className="mt-1 font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>

              <ul className="mt-6 space-y-3">
                <CheckItem>Cybermenaces, gouvernance, risque et cadres stratégiques.</CheckItem>
                <CheckItem>IA, opportunités, risques et implications de décision.</CheckItem>
                <CheckItem>Badge numérique vérifiable et certification reconnue.</CheckItem>
              </ul>

              <CtaLink to="/catalogue" variant="light" className="mt-8 w-full sm:w-auto">
                Voir cette formation
              </CtaLink>
            </div>
          </div>
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
