import PropTypes from 'prop-types';

export default function BotTriggerButton({ onClick, label = 'Conseiller', ariaLabel = 'Ouvrir le conseiller' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bot-button-hover fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-white shadow-lg transition-shadow hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary max-md:bottom-4 max-md:right-4"
      aria-label={ariaLabel}
      aria-haspopup="dialog"
    >
      {/* Chat icon SVG */}
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
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
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
