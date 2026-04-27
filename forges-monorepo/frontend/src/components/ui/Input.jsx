import PropTypes from 'prop-types';

export default function Input({
  type = 'text',
  label,
  error,
  placeholder,
  value,
  onChange,
  disabled = false,
  required = false,
  className = '',
  id,
  ...props
}) {
  const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;

  const inputClasses = `w-full px-4 py-2 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
    error
      ? 'border-danger focus:border-danger focus:ring-danger'
      : 'border-border focus:border-primary'
  } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'} ${className}`;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text mb-1.5">
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      )}
    </div>
  );
}

Input.propTypes = {
  type: PropTypes.string,
  label: PropTypes.string,
  error: PropTypes.string,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  className: PropTypes.string,
  id: PropTypes.string,
};
