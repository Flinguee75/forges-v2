import PropTypes from 'prop-types';
import EmptyState from './EmptyState';
import Button from '../ui/Button';

export default function RuntimeUnavailable({
  title,
  message,
  actionLabel = 'Retour au tableau de bord',
  onAction,
}) {
  return (
    <EmptyState
      type="error"
      title={title}
      message={message}
      action={onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
    />
  );
}

RuntimeUnavailable.propTypes = {
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
};
