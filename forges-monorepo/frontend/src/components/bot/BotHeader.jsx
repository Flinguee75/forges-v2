import PropTypes from 'prop-types';

export default function BotHeader({ title = 'Conseiller', subtitle = '', onClose, closeLabel = 'Fermer le conseiller' }) {
  return (
    <div className="sticky top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-r from-primary to-secondary px-4 py-4 text-white">
      <div>
        <h3 id="bot-title" className="font-semibold text-base">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-white/80">{subtitle}</p>}
      </div>
      <button
        onClick={onClose}
        type="button"
        className="rounded-full p-1.5 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60"
        aria-label={closeLabel}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

BotHeader.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  closeLabel: PropTypes.string,
};
