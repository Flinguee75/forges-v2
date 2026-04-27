import PropTypes from 'prop-types';

export default function BotCommentaireInput({
  value,
  onChange,
  error,
  maxLength = 500,
  placeholder = 'Votre commentaire...',
}) {
  const remaining = maxLength - (value?.length || 0);

  return (
    <div className="space-y-2">
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={4}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary ${
          error ? 'border-danger' : 'border-border'
        }`}
      />
      <div className="flex justify-between items-center text-xs">
        <span className={error ? 'text-danger' : 'text-transparent'}>
          {error || '\u00A0'}
        </span>
        <span className={`${remaining < 50 ? 'text-warning' : 'text-subtext'}`}>
          {remaining} / {maxLength}
        </span>
      </div>
    </div>
  );
}

BotCommentaireInput.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  maxLength: PropTypes.number,
  placeholder: PropTypes.string,
};
