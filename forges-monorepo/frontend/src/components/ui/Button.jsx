import PropTypes from 'prop-types';

export default function Button({
  children,
  variant = 'primary',
  size = 'medium',
  type = 'button',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...props
}) {
  const baseStyles = `inline-flex items-center justify-center font-medium rounded-lg border border-transparent shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
    fullWidth ? 'w-full' : ''
  }`;

  const variants = {
    primary: 'bg-action-primary bg-action-primary-hover text-on-action focus:ring-primary',
    secondary: 'bg-action-secondary bg-action-secondary-hover text-white focus:ring-secondary',
    success: 'bg-action-success bg-action-success-hover text-white focus:ring-success',
    warning: 'bg-action-warning bg-action-warning-hover text-white focus:ring-warning',
    danger: 'bg-action-danger bg-action-danger-hover text-white focus:ring-danger',
    outline: 'border-action bg-surface-card text-heading hover:border-primary hover:bg-surface-action-ghost focus:ring-primary',
    white: 'border-white bg-white text-heading hover:bg-gray-100 focus:ring-primary',
  };

  const sizes = {
    small: 'px-3 py-1.5 text-xs',
    medium: 'px-4 py-2 text-sm',
    large: 'px-6 py-3 text-base',
  };

  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={classes}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'warning', 'danger', 'outline', 'white']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string,
};
