import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/currency';

const coverThemes = [
  {
    shell: 'from-slate-900 via-sky-900 to-cyan-500',
    orb: 'bg-cyan-300/70',
    accent: 'bg-white/25',
  },
  {
    shell: 'from-indigo-950 via-violet-900 to-fuchsia-500',
    orb: 'bg-fuchsia-300/70',
    accent: 'bg-white/20',
  },
  {
    shell: 'from-emerald-950 via-teal-900 to-lime-500',
    orb: 'bg-lime-300/70',
    accent: 'bg-white/20',
  },
  {
    shell: 'from-amber-950 via-orange-800 to-rose-500',
    orb: 'bg-amber-300/70',
    accent: 'bg-white/20',
  },
];

function getTheme(title = '') {
  const seed = Array.from(title).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return coverThemes[seed % coverThemes.length];
}

function getCategoryLabel(title = '') {
  const lowered = title.toLowerCase();

  if (lowered.includes('cyber')) return 'Cybersecurite';
  if (lowered.includes('data')) return 'Data';
  if (lowered.includes('ia')) return 'Intelligence artificielle';
  if (lowered.includes('digit')) return 'Transformation digitale';
  if (lowered.includes('projet')) return 'Pilotage';

  return 'Formation pro';
}

function getHighlight(formation) {
  if ((formation.duree || 0) >= 35) return 'Bootcamp expert';
  if ((formation.tarif || 0) >= 1000000) return 'Programme premium';
  return 'Nouveau parcours';
}

function getSecondaryBadge(formation) {
  if ((formation.duree || 0) >= 30) return 'Format intensif';
  if ((formation.tarif || 0) >= 800000) return 'Certifiante';
  return 'Accessible';
}

function getActionLabel(formation, context) {
  if (context === 'apprenant' && formation.mode_formation === 'A_LA_DEMANDE') {
    return 'Accéder';
  }

  return 'Explorer la formation';
}

function formatDuration(days) {
  if (days === 1) return '1 jour';
  return `${Number(days || 0)} jours`;
}

export default function FormationMarketplaceCard({ formation, to, context = 'public' }) {
  // Mapper les champs backend vers frontend
  const formationData = {
    ...formation,
    titre: formation.intitule || formation.titre,
    description: formation.description_courte || formation.description,
    tarif: formation.cout_catalogue || formation.tarif,
    duree: formation.duree_jours || formation.duree,
  };

  const theme = getTheme(formationData.titre);
  const category = getCategoryLabel(formationData.titre);
  const highlight = getHighlight(formationData);
  const secondaryBadge = getSecondaryBadge(formationData);
  const actionLabel = getActionLabel(formationData, context);
  const nextPath = to || (
    context === 'apprenant' && formationData.mode_formation === 'A_LA_DEMANDE'
      ? `/apprenant/formations-a-la-demande/${formationData.id}`
      : `/formations/${formationData.id}`
  );
  const badges = [];

  if (formationData.inclus_abonnement) {
    badges.push(
      <span
        key="inclus"
        className="inline-flex items-center rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success"
      >
        Inclus
      </span>
    );
  }

  if (formationData.type_formation === 'PREMIUM') {
    badges.push(
      <span
        key="premium"
        className="inline-flex items-center rounded-full bg-[#6C3483]/10 px-3 py-1 text-xs font-semibold text-[#6C3483]"
      >
        Premium
      </span>
    );
  }

  if (formationData.certification_delivree) {
    badges.push(
      <span
        key="certification"
        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
        </svg>
        Certifiante
      </span>
    );
  }

  return (
    <Link
      to={nextPath}
      className="group block h-full rounded-[24px] border border-border/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
    >
      <div className="flex h-full flex-col">
        <div className={`relative mb-5 overflow-hidden rounded-[18px] bg-gradient-to-br ${theme.shell}`}>
          <div className="aspect-[16/10] p-5">
            <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[14px] border border-white/10 bg-black/10 p-4 text-left backdrop-blur-[2px]">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-md border border-white/15 bg-white/8 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.24em] text-white/75">
                  FORGES
                </span>
                <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/90">
                  {category}
                </span>
              </div>

              <div className="relative">
                <div className={`absolute -right-3 -top-7 h-20 w-20 rounded-full blur-2xl ${theme.orb}`} />
                <div className={`absolute -left-4 bottom-0 h-12 w-12 rounded-full blur-xl ${theme.accent}`} />
                <p className="relative max-w-[14rem] text-left text-xl font-semibold leading-tight text-white md:text-[1.4rem]">
                  {formationData.titre}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col text-left">
          <h3 className="min-h-[4.5rem] text-[1.55rem] font-bold leading-[1.15] tracking-[-0.03em] text-slate-800 line-clamp-3">
            {formationData.titre}
          </h3>

          <p className="mt-2 text-[1rem] text-slate-500">
            Catalogue FORGES
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {badges}
            <span className="rounded-md bg-emerald-100 px-3 py-1 text-[0.78rem] font-semibold text-emerald-800">
              {highlight}
            </span>
            <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-[0.78rem] font-semibold text-amber-800">
              {secondaryBadge}
            </span>
          </div>

          <p className="mt-4 line-clamp-2 text-[0.96rem] leading-6 text-slate-600">
            {formationData.description}
          </p>

          {/* Afficher les prérequis si présents */}
          {formationData.prerequis && (
            <p className="mt-3 text-[0.85rem] text-slate-500 italic">
              📋 Prérequis: {formationData.prerequis.length > 50 
                ? formationData.prerequis.substring(0, 50) + '...' 
                : formationData.prerequis}
            </p>
          )}

          <div className="mt-5 flex items-center gap-3 text-[0.95rem] text-slate-500">
            <span>{formatDuration(formationData.duree)}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>{category}</span>
          </div>

          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-[1.55rem] font-extrabold leading-none tracking-[-0.04em] text-slate-900">
                {formatCurrency(formationData.tarif)}
              </p>
              <p className="mt-2 text-[1rem] font-semibold text-slate-800">
                {actionLabel}
              </p>
              <p className="mt-2 text-[0.9rem] font-medium text-slate-500">
                {formationData.mode_formation === 'A_LA_DEMANDE'
                  ? 'Acces a la demande et progression'
                  : 'Programme, sessions et modalites'}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition-colors duration-300 group-hover:border-slate-900 group-hover:bg-slate-900 group-hover:text-white">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

FormationMarketplaceCard.propTypes = {
  formation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    titre: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    tarif: PropTypes.number.isRequired,
    duree: PropTypes.number.isRequired,
    type_formation: PropTypes.string,
    mode_formation: PropTypes.string,
    inclus_abonnement: PropTypes.bool,
  }).isRequired,
  to: PropTypes.string,
  context: PropTypes.oneOf(['public', 'apprenant']),
};
