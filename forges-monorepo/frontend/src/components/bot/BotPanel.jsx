import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import BotHeader from './BotHeader';
import BotMessagesContainer from './BotMessagesContainer';
import Button from '../ui/Button';
import { getBotCopy, getFluxLabel } from './botHelpers';

export default function BotPanel({
  session,
  language = 'FR',
  isLoading,
  error,
  onClose,
  onRetry,
  onRestart,
  onSubmitResponse,
}) {
  const copy = getBotCopy(language);
  const statusLabel = session
    ? (session.statut === 'ACTIVE'
      ? copy.statusInProgress
      : session.statut === 'TERMINEE'
        ? copy.statusCompleted
        : session.statut)
    : copy.statusStarting;
  const subtitle = session
    ? `${getFluxLabel(session.flux_actif, language)} · ${statusLabel}`
    : copy.statusStarting;
  const targetPath = session?.historique?.result?.target_path || session?.historique?.metadata?.upgrade?.target_path || null;
  const showUpgradeCta = session?.statut === 'TERMINEE' && session?.flux_actif === 'UPGRADE' && Boolean(targetPath);

  return (
    <div
      className="bot-panel-enter fixed bottom-20 right-6 z-50 flex h-[min(90vh,46rem)] w-[min(100vw-3rem,24rem)] flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl max-md:inset-0 max-md:h-[100dvh] max-md:w-full max-md:rounded-none"
      role="dialog"
      aria-labelledby="bot-title"
      aria-modal="true"
    >
      {/* Header */}
      <BotHeader
        title={copy.title}
        subtitle={subtitle}
        onClose={onClose}
        closeLabel={copy.closeLabel}
      />

      {/* Messages Container */}
      <BotMessagesContainer
        session={session}
        language={language}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        onSubmitResponse={onSubmitResponse}
      />

      {/* Footer - Bouton Fermer si conversation terminée */}
      {session?.statut === 'TERMINEE' && (
        <div className="border-t border-border bg-white p-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="medium"
              onClick={onClose}
              className="flex-1"
            >
              {copy.close}
            </Button>
            {showUpgradeCta ? (
              <Link to={targetPath} className="flex-1">
                <Button
                  variant="primary"
                  size="medium"
                  onClick={onClose}
                  className="w-full"
                >
                  {copy.viewOffers}
                </Button>
              </Link>
            ) : (
              <Button
                variant="primary"
                size="medium"
                onClick={onRestart}
                className="flex-1"
              >
                {copy.newConversation}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

BotPanel.propTypes = {
  session: PropTypes.object,
  language: PropTypes.string,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired,
  onRestart: PropTypes.func.isRequired,
  onSubmitResponse: PropTypes.func.isRequired,
};
