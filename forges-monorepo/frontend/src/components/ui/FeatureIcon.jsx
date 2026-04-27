import PropTypes from 'prop-types';

/**
 * FeatureIcon - Composant réutilisable pour afficher les icônes de features
 * @param {string} type - Type d'icône : 'book', 'check', 'users', 'student', 'building'
 * @param {string} color - Couleur Tailwind : 'primary', 'secondary', 'success'
 * @param {string} size - Taille : 'small' (5x5), 'medium' (16x16) ou 'large' (20x20)
 * @param {string} className - Classes CSS additionnelles
 */
export default function FeatureIcon({ type, color = 'primary', size = 'medium' }) {
  const colorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  };

  const sizeClasses = {
    small: 'w-5 h-5',
    medium: 'w-16 h-16',
    large: 'w-20 h-20',
  };

  const strokeWidth = size === 'large' ? 1.5 : 2;

  const icons = {
    book: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    ),
    check: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    users: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    ),
    student: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    ),
    building: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    ),
  };

  return (
    <svg
      className={`${sizeClasses[size]} ${colorClasses[color]}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {icons[type]}
    </svg>
  );
}

FeatureIcon.propTypes = {
  type: PropTypes.oneOf(['book', 'check', 'users', 'student', 'building']).isRequired,
  color: PropTypes.oneOf(['primary', 'secondary', 'success', 'warning', 'danger']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
};
