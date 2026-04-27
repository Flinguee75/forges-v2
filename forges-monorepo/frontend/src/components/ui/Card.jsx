import PropTypes from 'prop-types';

export default function Card({
  children,
  title,
  footer,
  className = '',
  bodyClassName = '',
  ...props
}) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-border overflow-hidden ${className}`} {...props}>
      {title && (
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-text">{title}</h3>
        </div>
      )}
      <div className={`px-6 py-4 ${bodyClassName}`}>
        {children}
      </div>
      {footer && (
        <div className="px-6 py-3 bg-gray-50 border-t border-border">
          {footer}
        </div>
      )}
    </div>
  );
}

Card.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string,
  footer: PropTypes.node,
  className: PropTypes.string,
  bodyClassName: PropTypes.string,
};
