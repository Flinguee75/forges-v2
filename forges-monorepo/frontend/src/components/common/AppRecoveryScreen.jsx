import PropTypes from 'prop-types';
import Button from '../ui/Button';

export default function AppRecoveryScreen({
  title,
  message,
  detail,
  onReload,
  onHome,
  reloadLabel = 'Recharger la page',
  homeLabel = 'Retour à l’accueil',
  showHome = true,
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-xl rounded-xl border border-[var(--color-border)] bg-white p-8 shadow-sm">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(27,79,114,0.12)] text-xl font-semibold text-[var(--color-primary)]">
          !
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">{title}</h1>
        <p className="mt-3 text-sm text-[var(--color-subtext)]">{message}</p>
        {detail ? (
          <p className="mt-2 rounded-lg border border-[var(--color-border)] bg-[rgba(27,79,114,0.05)] px-4 py-3 text-sm text-[var(--color-text)]">
            {detail}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={onReload}>{reloadLabel}</Button>
          {showHome ? (
            <Button variant="outline" onClick={onHome}>
              {homeLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

AppRecoveryScreen.propTypes = {
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  detail: PropTypes.string,
  onReload: PropTypes.func.isRequired,
  onHome: PropTypes.func,
  reloadLabel: PropTypes.string,
  homeLabel: PropTypes.string,
  showHome: PropTypes.bool,
};

AppRecoveryScreen.defaultProps = {
  detail: '',
  onHome: () => window.location.assign('/'),
  reloadLabel: 'Recharger la page',
  homeLabel: 'Retour à l’accueil',
  showHome: true,
};
