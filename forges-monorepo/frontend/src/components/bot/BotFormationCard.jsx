import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import Badge from '../ui/Badge';
import { formatFcfa, getBotCopy } from './botHelpers';

export default function BotFormationCard({ formation, language = 'FR' }) {
  const copy = getBotCopy(language);
  return (
    <Link
      to={`/formations/${formation.id}`}
      className="block bg-white border border-border rounded-lg p-3 hover:border-primary hover:-translate-y-0.5 transition-all duration-200 bot-message-appear"
    >
      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {formation.inclus_abonnement && (
          <Badge variant="success" size="small">
            {copy.formationIncluded}
          </Badge>
        )}
        {formation.type_formation === 'PREMIUM' && (
          <Badge variant="info" size="small">
            {copy.formationPremium}
          </Badge>
        )}
        {formation.type_formation === 'STANDARD' && (
          <Badge variant="gray" size="small">
            {copy.formationStandard}
          </Badge>
        )}
      </div>

      {/* Titre */}
      <h4 className="text-sm font-semibold text-text mb-1.5 line-clamp-1">
        {formation.titre}
      </h4>

      {/* Description */}
      {formation.description && (
        <p className="text-xs text-subtext line-clamp-2 mb-2">
          {formation.description}
        </p>
      )}

      {/* Prix et durée */}
      <div className="flex justify-between items-center text-xs">
        <span className="font-medium text-primary">
          {formation.tarif ? formatFcfa(formation.tarif) : copy.freeLabel}
        </span>
        {formation.duree && (
          <span className="text-subtext">{formation.duree}h</span>
        )}
      </div>
    </Link>
  );
}

BotFormationCard.propTypes = {
  formation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    titre: PropTypes.string.isRequired,
    description: PropTypes.string,
    tarif: PropTypes.number,
    duree: PropTypes.number,
    type_formation: PropTypes.oneOf(['STANDARD', 'PREMIUM', 'SUR_DEVIS']),
    inclus_abonnement: PropTypes.bool,
  }).isRequired,
  language: PropTypes.string,
};
