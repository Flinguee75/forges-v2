import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useBot } from '../../hooks/useBot';
import BotTriggerButton from './BotTriggerButton';
import BotPanel from './BotPanel';
import { getBotCopy, resolveBotLanguage } from './botHelpers';

const DISMISS_STORAGE_PREFIX = 'forges.bot.dismissed';

export default function BotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const dismissStorageKey = typeof window === 'undefined'
    ? DISMISS_STORAGE_PREFIX
    : `${DISMISS_STORAGE_PREFIX}:${window.location.pathname}`;
  const language = resolveBotLanguage(user?.langue_preferee, { allowBrowserFallback: true });
  const botCopy = getBotCopy(language);

  const {
    session,
    isLoading,
    error,
    loadActiveSession,
    startSession,
    submitResponse,
    abandonSession,
    resetSession,
  } = useBot({ language });

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const activeSession = await loadActiveSession();
        const hasDismissed = typeof window !== 'undefined'
          && window.sessionStorage.getItem(dismissStorageKey) === '1';

        if (mounted && activeSession && !hasDismissed) {
          setIsOpen(true);
        }
      } catch {
        // erreur déjà gérée par le hook
      }
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [dismissStorageKey, loadActiveSession]);

  // Ouvrir le widget et démarrer une session si nécessaire
  const handleOpen = async () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(dismissStorageKey);
    }
    setIsOpen(true);

    if (session?.statut === 'ACTIVE' || session?.statut === 'TERMINEE') {
      return;
    }

    const activeSession = await loadActiveSession();
    if (!activeSession) {
      await startSession();
    }
  };

  // Fermer le widget et marquer la session comme abandonnée si elle est active
  const handleClose = useCallback(async () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(dismissStorageKey, '1');
    }
    setIsOpen(false);

    if (session?.statut === 'ACTIVE') {
      try {
        await abandonSession();
      } catch {
        // erreur déjà gérée par le hook
      }
    }

    resetSession();
  }, [abandonSession, dismissStorageKey, resetSession, session?.statut]);

  const handleRetry = async () => {
    try {
      await startSession();
    } catch (err) {
      return err;
    }
  };

  // Soumettre une réponse
  const handleSubmitResponse = async (value, commentaire = null) => {
    try {
      await submitResponse(value, commentaire);
    } catch (error) {
      return error;
    }
  };

  const handleRestart = async () => {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(dismissStorageKey);
      }
      await startSession();
      setIsOpen(true);
    } catch (err) {
      return err;
    }
  };

  // Prévenir le scroll du body quand le panel est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [handleClose, isOpen]);

  // Gérer la fermeture avec la touche Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleClose, isOpen]);

  return (
    <>
      {/* Overlay semi-transparent quand le panel est ouvert */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px]"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Bouton flottant ou Panel */}
      {isOpen ? (
        <BotPanel
          session={session}
          language={language}
          isLoading={isLoading}
          error={error}
          onClose={handleClose}
          onRetry={handleRetry}
          onRestart={handleRestart}
          onSubmitResponse={handleSubmitResponse}
        />
      ) : (
        <BotTriggerButton
          onClick={handleOpen}
          label={botCopy.trigger}
          ariaLabel={botCopy.openAriaLabel}
        />
      )}
    </>
  );
}
