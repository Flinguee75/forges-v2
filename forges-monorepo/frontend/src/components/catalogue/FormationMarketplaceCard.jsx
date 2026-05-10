import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/currency';

const coverThemes = [
  {
    shell: 'from-slate-700 to-slate-800',
    orb: 'bg-slate-400/40',
    accent: 'bg-white/10',
  },
  {
    shell: 'from-blue-700 to-blue-800',
    orb: 'bg-blue-400/40',
    accent: 'bg-white/10',
  },
  {
    shell: 'from-slate-600 to-slate-700',
    orb: 'bg-slate-300/40',
    accent: 'bg-white/10',
  },
  {
    shell: 'from-slate-700 to-blue-800',
    orb: 'bg-slate-400/40',
    accent: 'bg-white/10',
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
  const enrollment = formation.enrollment || null;
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
  const _highlight = getHighlight(formationData);
  const _secondaryBadge = getSecondaryBadge(formationData);
  const isEnrolled = Boolean(enrollment?.isEnrolled);
  const hasAttestation = Boolean(enrollment?.attestationAvailable);
  const actionLabel = isEnrolled
    ? (hasAttestation ? "Télécharger l'attestation" : 'Déjà inscrit')
    : getActionLabel(formationData, context);
  const nextPath = to || (
    context === 'apprenant' && isEnrolled && hasAttestation
      ? `/apprenant/attestations?dossier=${enrollment.dossierId}`
      : context === 'apprenant' && formationData.mode_formation === 'A_LA_DEMANDE'
        ? `/apprenant/formations-a-la-demande/${formationData.id}`
        : `/formations/${formationData.id}`
  );
  const badges = [];

  if (formationData.inclus_abonnement) {
    badges.push(
      <span
        key="inclus"
        className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700"
      >
        Inclus
      </span>
    );
  }

  if (formationData.type_formation === 'PREMIUM') {
    badges.push(
      <span
        key="premium"
        className="inline-flex items-center rounded-full bg-slate-300 px-2.5 py-1 text-xs font-medium text-slate-800"
      >
        Premium
      </span>
    );
  }

  if (formationData.certification_delivree) {
    badges.push(
      <span
        key="certification"
        className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700"
      >
        Certifiante
      </span>
    );
  }

  if (isEnrolled) {
    badges.push(
      <span
        key="enrolled"
        className="inline-flex items-center rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success"
      >
        Déjà inscrit
      </span>
    );
  }

  if (hasAttestation) {
    badges.push(
      <span
        key="attestation"
        className="inline-flex items-center rounded-full bg-secondary-soft px-2.5 py-1 text-xs font-medium text-secondary"
      >
        Attestation PDF
      </span>
    );
  }

  return (
    <Link
      to={nextPath}
      className="group block h-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all duration-300 hover:border-slate-400 hover:shadow-md"
    >
      <div className="flex h-full flex-col">
        <div className="relative mb-3 overflow-hidden rounded-lg aspect-[16/10]">
          {formationData.image_url ? (
            <img
              src={formationData.image_url}
              alt={formationData.titre}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className={`h-full w-full bg-gradient-to-br ${theme.shell} p-3`}>
              <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-lg border border-white/10 bg-black/10 p-3 text-left backdrop-blur-[2px]">
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-sm border border-white/20 bg-white/10 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.12em] text-white/70">
                    FORGES
                  </span>
                  <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[9px] font-medium text-white/80">
                    {category}
                  </span>
                </div>
                <div className="relative">
                  <div className={`absolute -right-3 -top-5 h-16 w-16 rounded-full blur-2xl ${theme.orb}`} />
                  <div className={`absolute -left-3 bottom-0 h-10 w-10 rounded-full blur-lg ${theme.accent}`} />
                  <p className="relative max-w-[12rem] text-left text-base font-semibold leading-tight text-white">
                    {formationData.titre}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col text-left">
          <h3 className="min-h-[3rem] text-base font-semibold leading-tight text-slate-800 line-clamp-2">
            {formationData.titre}
          </h3>

          <p className="mt-1 text-[0.8rem] text-slate-500">
            {formationData.mode_formation === 'A_LA_DEMANDE'
              ? 'À la demande'
              : formationData.mode_formation === 'PRESENTIEL'
              ? 'Présentiel'
              : formationData.mode_formation === 'EN_LIGNE'
              ? 'En ligne'
              : 'Sessions programmées'}
            {formationData.lieu && (
              <span className="ml-1">— {formationData.lieu}</span>
            )}
          </p>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {badges}
          </div>

          <p className="mt-3 line-clamp-2 text-[0.85rem] leading-5 text-slate-600">
            {formationData.description}
          </p>

          <div className="mt-3 flex items-center gap-2 text-[0.8rem] text-slate-500">
            <span>{formatDuration(formationData.duree)}</span>
            <span className="h-0.5 w-0.5 rounded-full bg-slate-300" />
            <span>{category}</span>
          </div>

          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <div>
              <p className="text-lg font-bold text-slate-900">
                {formatCurrency(formationData.tarif)}
              </p>
              <p className="mt-0.5 text-[0.75rem] font-medium text-slate-600">
                {actionLabel}
              </p>
            </div>

            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-all duration-300 group-hover:border-slate-900 group-hover:bg-slate-900 group-hover:text-white">
              <svg
                className="h-3 w-3"
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
