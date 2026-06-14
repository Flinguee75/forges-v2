import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/currency';
import { trackClick } from '../../utils/analytics';

const COVER_THEMES = [
  { bg: 'from-[#1B4F72] to-[#154360]' },
  { bg: 'from-[#1A5276] to-[#2E86C1]' },
  { bg: 'from-[#17202A] to-[#1B4F72]' },
  { bg: 'from-[#154360] to-[#1A5276]' },
];

function getTheme(title = '') {
  const seed = Array.from(title).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COVER_THEMES[seed % COVER_THEMES.length];
}

const MODE_LABELS = {
  A_LA_DEMANDE: 'A la demande',
  PRESENTIEL: 'Presentiel',
  EN_LIGNE: 'En ligne',
};

function getModeLabel(mode) {
  return MODE_LABELS[mode] || 'Sessions';
}

function stripCodePrefix(title = '') {
  return title.replace(/^\[[^\]]+\]\s*/, '');
}

function getNiveauLabel(tarif = 0, duree = 0) {
  if (tarif >= 1000000 || duree >= 35) return 'Expert';
  if (tarif >= 500000 || duree >= 15) return 'Intermediaire';
  return 'Debutant';
}

function formatDuration(days) {
  if (!days) return null;
  return days === 1 ? '1 jour' : `${days} jours`;
}

function getActionLabel(formation, context) {
  if (context === 'apprenant' && formation.mode_formation === 'A_LA_DEMANDE') return 'Acceder';
  return 'Voir la formation';
}

export default function FormationMarketplaceCard({ formation, to, context = 'public' }) {
  const enrollment = formation.enrollment || null;

  const rawTitre = formation.intitule || formation.titre || '';
  const f = {
    ...formation,
    titre: stripCodePrefix(rawTitre),
    description: formation.description_courte || formation.description || '',
    tarif: formation.cout_catalogue ?? formation.tarif,
    duree: formation.duree_jours ?? formation.duree,
  };

  const theme = getTheme(f.titre);
  const isEnrolled = Boolean(enrollment?.isEnrolled);
  const hasAttestation = Boolean(enrollment?.attestationAvailable);

  const nextPath = to || (
    context === 'apprenant' && isEnrolled && hasAttestation
      ? `/apprenant/attestations?dossier=${enrollment.dossierId}`
      : context === 'apprenant' && f.mode_formation === 'A_LA_DEMANDE'
        ? `/apprenant/formations-a-la-demande/${f.id}`
        : `/formations/${f.id}`
  );

  const actionLabel = isEnrolled
    ? (hasAttestation ? "Telecharger l'attestation" : 'Deja inscrit')
    : getActionLabel(f, context);

  const niveau = getNiveauLabel(f.tarif || 0, f.duree || 0);
  const modeLabel = getModeLabel(f.mode_formation);
  const dureeLabel = formatDuration(f.duree);

  return (
    <Link
      to={nextPath}
      onClick={() => trackClick('card-formation', { formationId: f.id, intitule: f.titre, context })}
      className="group flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-200"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video flex-shrink-0 overflow-hidden bg-slate-800">
        {f.image_url ? (
          <img
            src={f.image_url}
            alt={f.titre}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${theme.bg}`}>
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 to-transparent" />
            <p className="absolute inset-x-4 bottom-4 text-sm font-semibold leading-snug text-white line-clamp-2">
              {f.titre}
            </p>
          </div>
        )}

        {/* Provider badge — top-left */}
        <div className="absolute top-2 left-2">
          <span className="rounded bg-white/95 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold tracking-wider text-primary shadow-sm">
            FORGES
          </span>
        </div>

        {/* Status badge — top-right */}
        {isEnrolled && (
          <div className="absolute top-2 right-2">
            <span className="rounded-full bg-success px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
              Inscrit
            </span>
          </div>
        )}
        {!isEnrolled && f.inclus_abonnement && (
          <div className="absolute top-2 right-2">
            <span className="rounded-full bg-success px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
              Inclus
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title */}
        <h3 className="text-base font-semibold leading-snug text-gray-900 line-clamp-2 min-h-[2.75rem]">
          {f.titre}
        </h3>

        {/* Badges row — like Coursera's "Professional Certificate" */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {f.certification_delivree && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2.5 py-0.5 text-[11px] font-semibold text-secondary">
              <svg className="h-3 w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Certifiante
            </span>
          )}
          {f.type_formation === 'PREMIUM' && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
              Premium
            </span>
          )}
        </div>

        {/* Meta info — like Coursera's "Beginner · 3 months · 10h/week" */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
          <span>{modeLabel}</span>
          {dureeLabel && (
            <>
              <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />
              <span>{dureeLabel}</span>
            </>
          )}
          <span className="h-[3px] w-[3px] rounded-full bg-gray-300" />
          <span>{niveau}</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price */}
        <div className="mt-4 border-t border-gray-100 pt-3">
          {f.inclus_abonnement ? (
            <p className="text-sm font-bold text-success">Inclus abonnement</p>
          ) : typeof f.tarif === 'number' ? (
            <p className="text-base font-bold text-gray-900">{formatCurrency(f.tarif)}</p>
          ) : null}
        </div>

        {/* CTA "Voir la formation" */}
        <div className="mt-3">
          <span className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors duration-150 group-hover:bg-primary group-hover:text-white">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {actionLabel}
          </span>
        </div>
      </div>
    </Link>
  );
}

FormationMarketplaceCard.propTypes = {
  formation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    titre: PropTypes.string,
    intitule: PropTypes.string,
    description: PropTypes.string,
    description_courte: PropTypes.string,
    tarif: PropTypes.number,
    cout_catalogue: PropTypes.number,
    duree: PropTypes.number,
    duree_jours: PropTypes.number,
    type_formation: PropTypes.string,
    mode_formation: PropTypes.string,
    inclus_abonnement: PropTypes.bool,
    certification_delivree: PropTypes.bool,
    image_url: PropTypes.string,
    lieu: PropTypes.string,
    enrollment: PropTypes.shape({
      isEnrolled: PropTypes.bool,
      attestationAvailable: PropTypes.bool,
      dossierId: PropTypes.string,
    }),
  }).isRequired,
  to: PropTypes.string,
  context: PropTypes.oneOf(['public', 'apprenant']),
};
