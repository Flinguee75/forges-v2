import PropTypes from 'prop-types';

/**
 * ProgressBar - Barre de progression réutilisable
 * Utilisé pour afficher des quotas, pourcentages, etc.
 */
export default function ProgressBar({ current, max, variant = 'primary', showLabel = true }) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;

  const colors = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
    info: 'bg-info',
  };

  const bgColor = colors[variant] || colors.primary;

  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-1 flex items-center justify-between text-xs text-subtext">
          <span>
            {current} / {max}
          </span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-border">
        <div
          className={`h-full transition-all duration-300 ${bgColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

ProgressBar.propTypes = {
  current: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  variant: PropTypes.oneOf(['primary', 'success', 'warning', 'danger', 'info']),
  showLabel: PropTypes.bool,
};
