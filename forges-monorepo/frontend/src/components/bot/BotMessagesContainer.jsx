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
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/70">
            {getFluxLabel(session.flux_actif, language)}
          </p>
          <p className="mt-1.5 text-sm text-text leading-relaxed">{getFluxWelcomeMessage(session.flux_actif, language)}</p>
        </div>

        {session.flux_actif === 'FEEDBACK' && feedbackFormationLabel ? (
          <div className="flex items-start gap-3 rounded-xl border border-border bg-bg px-4 py-3 shadow-sm">
            <div className="mt-0.5 flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 13, height: 13 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-primary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text truncate">{feedbackFormationLabel}</p>
            </div>
          </div>
        ) : null}

        {error && (
          <div className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {historyEntries.length > 0 && (
          <div className="space-y-2">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-subtext">
              {copy.history}
            </p>
            {historyEntries.map((entry) => (
              <div key={entry.id} className="space-y-2 rounded-xl border border-border bg-white px-3 py-3 shadow-sm">
                <BotQuestion question={entry.questionLabel} />
                {entry.commentaire ? (
                  <BotMessage text={entry.commentaire} isUser />
                ) : (
                  <BotMessage text={entry.answerLabel} isUser />
                )}
              </div>
            ))}
          </div>
        )}

        {session.statut === 'ACTIVE' && session.current_question && (
          <div className="space-y-3 rounded-xl border border-primary/20 bg-white p-4 shadow-sm">
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
              <p className="text-[10px] font-semibold uppercase tracking-widest text-subtext">
                {copy.recommendations}
              </p>
              <span className="rounded-full bg-bg border border-border px-2 py-0.5 text-xs text-subtext">
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
          <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-sm text-success">
            <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
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
