import PropTypes from 'prop-types';

export default function EmptyState({
  type = 'empty',
  title,
  message,
  action,
  icon,
}) {
  const types = {
    empty: {
      icon: (
        <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      ),
      defaultTitle: 'Aucune donnée',
      defaultMessage: 'Il n\'y a rien à afficher pour le moment.',
    },
    error: {
      icon: (
        <svg className="h-12 w-12 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      defaultTitle: 'Erreur',
      defaultMessage: 'Une erreur est survenue lors du chargement des données.',
    },
    loading: {
      icon: (
        <svg className="h-12 w-12 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ),
      defaultTitle: 'Chargement',
      defaultMessage: 'Veuillez patienter...',
    },
  };

  const config = types[type];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon || config.icon}
      <h3 className="mt-4 text-lg font-medium text-text">
        {title || config.defaultTitle}
      </h3>
      <p className="mt-2 text-sm text-subtext max-w-md">
        {message || config.defaultMessage}
      </p>
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
}

EmptyState.propTypes = {
  type: PropTypes.oneOf(['empty', 'error', 'loading']),
  title: PropTypes.string,
  message: PropTypes.string,
  action: PropTypes.node,
  icon: PropTypes.node,
};
