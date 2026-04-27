import PropTypes from 'prop-types';

export default function Badge({
  children,
  variant = 'info',
  size = 'medium',
  className = ''
}) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const variants = {
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-danger-soft text-danger',
    info: 'bg-secondary-soft text-secondary',
    gray: 'bg-gray-200 text-gray-700',
  };

  const sizes = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-2.5 py-1 text-sm',
    large: 'px-3 py-1.5 text-base',
  };

  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <span className={classes}>
      {children}
    </span>
  );
}

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['success', 'warning', 'danger', 'info', 'gray']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string,
};
