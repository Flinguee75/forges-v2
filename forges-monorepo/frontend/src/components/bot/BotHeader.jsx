import PropTypes from 'prop-types';

export default function BotHeader({ title = 'Conseiller', subtitle = '', onClose, closeLabel = 'Fermer le conseiller' }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-primary" style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-success" />
        </div>
        <div>
          <h3 id="bot-title" className="text-sm font-semibold tracking-tight text-text">{title}</h3>
          {subtitle && <p className="text-xs text-subtext">{subtitle}</p>}
        </div>
      </div>
      <button
        onClick={onClose}
        type="button"
        className="rounded-lg p-1.5 text-subtext transition-colors hover:bg-bg hover:text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label={closeLabel}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
