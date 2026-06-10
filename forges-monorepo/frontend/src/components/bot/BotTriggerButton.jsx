import PropTypes from 'prop-types';

export default function BotTriggerButton({ onClick, label = 'Conseiller', ariaLabel = 'Ouvrir le conseiller' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bot-button-hover fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary max-md:bottom-4 max-md:right-4"
      aria-label={ariaLabel}
      aria-haspopup="dialog"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
      <span>{label}</span>
    </button>
  );
}

BotTriggerButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  label: PropTypes.string,
  ariaLabel: PropTypes.string,
};
