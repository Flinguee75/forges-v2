import { useState, useCallback, useMemo } from 'react';
import { useToast } from './useToast';
import { botApi } from '../api/bot.api';
import {
  buildBotValidationError,
  getBotCopy,
  getConversationHistoryEntries,
  getSessionRecommendations,
  isAllowedBotValue,
  normalizeBotSession,
  resolveBotLanguage,
} from '../components/bot/botHelpers';

/**
 * Hook personnalisé pour gérer les sessions du bot conseiller
 * Gère le cycle de vie complet : démarrage, réponses, abandon, reset
 */
export function useBot({ language = 'FR' } = {}) {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showError } = useToast();
  const resolvedLanguage = useMemo(() => resolveBotLanguage(language), [language]);
  const botCopy = useMemo(() => getBotCopy(resolvedLanguage), [resolvedLanguage]);

  const getErrorMessage = useCallback((err, fallback) => (
    err?.message || err?.error || fallback
  ), []);

  const isNoActiveSessionError = useCallback((err) => (
    err?.statusCode === 404
      || err?.code === 'NOT_FOUND'
      || err?.message === 'Aucune session active'
      || err?.message === 'No active session'
  ), []);

  const loadActiveSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await botApi.getActiveSession();
      if (!result?.data) {
        setSession(null);
        return null;
      }
      const normalizedSession = normalizeBotSession(result, resolvedLanguage);
      setSession(normalizedSession);
      return normalizedSession;
    } catch (err) {
      if (isNoActiveSessionError(err)) {
        setSession(null);
        return null;
      }

      const errorMessage = getErrorMessage(err, 'Impossible de charger la session active');
      setError(errorMessage);
      showError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getErrorMessage, isNoActiveSessionError, resolvedLanguage, showError]);

  // Démarrer une nouvelle session
  const startSession = useCallback(async () => {
    if (session?.statut === 'ACTIVE') {
      return session;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await botApi.startSession();
      const normalizedSession = normalizeBotSession(result, resolvedLanguage);
      setSession(normalizedSession);
      return normalizedSession;
    } catch (err) {
      const errorMessage = getErrorMessage(err, 'Impossible de démarrer la session');
      setError(errorMessage);
      showError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [getErrorMessage, resolvedLanguage, session, showError]);

  // Soumettre une réponse
  const submitResponse = useCallback(async (value, commentaire = null) => {
    if (!session?.id) {
      throw new Error(botCopy.noActiveSession);
    }

    const question = session.current_question;
    if (!question || !isAllowedBotValue(question, value)) {
      const localError = buildBotValidationError('REPONSE_HORS_LISTE', botCopy.invalidChoice);
      setError(localError.message);
      throw localError;
    }

    if (commentaire && !question.allow_commentaire) {
      const localError = buildBotValidationError('BOT_COMMENT_NOT_ALLOWED', botCopy.commentNotAllowed);
      setError(localError.message);
      throw localError;
    }

    const maxCommentLength = question.commentaire_max_length || 500;
    if (commentaire && commentaire.length > maxCommentLength) {
      const localError = buildBotValidationError('BOT_COMMENT_TOO_LONG', botCopy.commentTooLong(maxCommentLength));
      setError(localError.message);
      throw localError;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload = { value };
      if (question.allow_commentaire && typeof commentaire === 'string') {
        payload.commentaire = commentaire.trim();
      }

      const result = await botApi.submitResponse(session.id, payload);
      const normalizedSession = normalizeBotSession(result, resolvedLanguage);
      setSession(normalizedSession);
      return normalizedSession;
    } catch (err) {
      const errorMessage = err?.message || err?.error || 'Erreur lors de l\'envoi de la réponse';
      setError(errorMessage);

      if (!['REPONSE_HORS_LISTE', 'BOT_COMMENT_NOT_ALLOWED', 'BOT_COMMENT_TOO_LONG'].includes(err?.code)) {
        showError(errorMessage);
      }

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [botCopy, resolvedLanguage, session, showError]);

  const abandonSession = useCallback(async () => {
    if (!session?.id) {
      return null;
    }

    try {
      const result = await botApi.abandonSession(session.id);
      const normalizedSession = normalizeBotSession(result, resolvedLanguage);
      setSession(normalizedSession);
      return normalizedSession;
    } catch (err) {
      const errorMessage = getErrorMessage(err, 'Impossible d’abandonner la session');
      setError(errorMessage);
      showError(errorMessage);
      throw err;
    }
  }, [getErrorMessage, resolvedLanguage, session, showError]);

  // Réinitialiser complètement
  const resetSession = useCallback(() => {
    setSession(null);
    setError(null);
    setIsLoading(false);
  }, []);

  // Propriétés calculées
  const isActive = useMemo(() => session?.statut === 'ACTIVE', [session]);
  const isTerminated = useMemo(() => session?.statut === 'TERMINEE', [session]);
  const currentQuestion = useMemo(() => session?.current_question || null, [session]);
  const recommendations = useMemo(() => getSessionRecommendations(session), [session]);
  const historyEntries = useMemo(() => getConversationHistoryEntries(session, resolvedLanguage), [resolvedLanguage, session]);

  return {
    session,
    language: resolvedLanguage,
    isLoading,
    error,
    loadActiveSession,
    startSession,
    submitResponse,
    abandonSession,
    resetSession,
    isActive,
    isTerminated,
    currentQuestion,
    recommendations,
    historyEntries,
  };
}

export default useBot;
