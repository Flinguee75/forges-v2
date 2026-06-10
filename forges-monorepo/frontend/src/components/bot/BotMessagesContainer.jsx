import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import BotMessage from './BotMessage';
import BotQuestion from './BotQuestion';
import BotQuestionOptions from './BotQuestionOptions';
import BotFormationCard from './BotFormationCard';
import Spinner from '../feedback/Spinner';
import EmptyState from '../feedback/EmptyState';
import Button from '../ui/Button';
import {
  formatFcfa,
  getBotCopy,
  getConversationHistoryEntries,
  getFluxCompletionMessage,
  getFluxLabel,
  getFluxWelcomeMessage,
  getSessionRecommendations,
} from './botHelpers';

export default function BotMessagesContainer({
  session,
  language = 'FR',
  isLoading,
  error,
  onRetry,
  onSubmitResponse,
}) {
  const copy = getBotCopy(language);
  const messagesEndRef = useRef(null);
  const historyEntries = getConversationHistoryEntries(session, language);
  const recommendations = getSessionRecommendations(session);
  const orientationMeta = session?.historique?.metadata?.orientation || {};
  const feedbackMeta = session?.historique?.metadata?.feedback || {};
  const feedbackFormationLabel = feedbackMeta.formation_intitule || feedbackMeta.formation_id || '';

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [session?.current_question?.id, session?.historique?.steps?.length, recommendations.length]);

  if (!session) {
    if (error) {
      return (
        <div className="flex-1 overflow-y-auto">
          <EmptyState
            type="error"
            title={copy.unavailableTitle}
            message={error}
            action={(
              <Button variant="outline" onClick={onRetry}>
                {copy.retry}
              </Button>
            )}
          />
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-bg/60 p-4">
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-secondary">
            {getFluxLabel(session.flux_actif, language)}
          </p>
          <p className="mt-2 text-sm text-text">{getFluxWelcomeMessage(session.flux_actif, language)}</p>
        </div>

        {session.flux_actif === 'FEEDBACK' && feedbackFormationLabel ? (
          <div className="rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-subtext">
              {copy.feedbackContext}
            </p>
            <div className="mt-2 space-y-1">
              <p>
                <span className="font-semibold text-text">{copy.feedbackFormation}:</span> {feedbackFormationLabel}
              </p>
              {feedbackMeta.session_id ? (
                <p className="text-xs text-subtext">
                  <span className="font-semibold text-text">{copy.feedbackSession}:</span> {feedbackMeta.session_id}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {error && (
          <div className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {historyEntries.length > 0 && (
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-subtext">
              {copy.history}
            </p>
            {historyEntries.map((entry) => (
              <div key={entry.id} className="space-y-2 rounded-xl border border-border bg-white p-3 shadow-sm">
                <BotQuestion question={entry.questionLabel} />
                <BotMessage text={entry.answerLabel} isUser />
                {entry.commentaire ? (
                  <BotMessage text={`Commentaire : ${entry.commentaire}`} isUser />
                ) : null}
              </div>
            ))}
          </div>
        )}

        {session.statut === 'ACTIVE' && session.current_question && (
          <div className="space-y-3 rounded-xl border border-secondary-soft bg-white p-4 shadow-sm">
            <BotQuestion question={session.current_question.question} />
            <BotQuestionOptions
              question={session.current_question}
              language={language}
              onSubmit={onSubmitResponse}
              isLoading={isLoading}
            />
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="space-y-3 rounded-xl border border-border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-subtext">
                {copy.recommendations}
              </p>
              <span className="text-xs text-subtext">
                {recommendations.length} {recommendations.length > 1 ? copy.recommendationUnitPlural : copy.recommendationUnitSingular}
              </span>
            </div>
            <BotMessage
              text={copy.recommendationIntro}
              isUser={false}
            />
            {(orientationMeta.cout_estime || orientationMeta.palier_recommande) && (
              <div className="grid gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-xs text-subtext sm:grid-cols-2">
                {orientationMeta.cout_estime ? (
                  <p>
                    <span className="font-semibold text-text">{copy.estimatedCostLabel}:</span> {formatFcfa(orientationMeta.cout_estime)}
                  </p>
                ) : null}
                {orientationMeta.palier_recommande ? (
                  <p>
                    <span className="font-semibold text-text">{copy.recommendedPalierLabel}:</span> {orientationMeta.palier_recommande}
                  </p>
                ) : null}
              </div>
            )}
            <div className="space-y-2">
              {recommendations.slice(0, 5).map((formation) => (
                <BotFormationCard key={formation.id} formation={formation} language={language} />
              ))}
            </div>
          </div>
        )}

        {session.statut === 'TERMINEE' && (
          <div className="rounded-xl border border-success-soft bg-success-soft px-4 py-3 text-sm text-success">
            {getFluxCompletionMessage(session.flux_actif, language)}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

BotMessagesContainer.propTypes = {
  session: PropTypes.shape({
    id: PropTypes.string,
    flux_actif: PropTypes.string,
    statut: PropTypes.string,
    current_question: PropTypes.object,
    historique: PropTypes.object,
    recommendations: PropTypes.array,
  }),
  language: PropTypes.string,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  onRetry: PropTypes.func,
  onSubmitResponse: PropTypes.func.isRequired,
};
