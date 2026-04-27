import { useState, useCallback } from 'react';
import { useToast } from './useToast';

/**
 * Hook personnalisé pour faciliter les appels API
 * Gère automatiquement : loading, error, success
 */
export function useApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showError, showSuccess } = useToast();

  const execute = useCallback(async (apiCall, options = {}) => {
    const {
      onSuccess,
      onError,
      showErrorToast = true,
      showSuccessToast = false,
      successMessage = 'Opération réussie',
    } = options;

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiCall();

      if (showSuccessToast && successMessage) {
        showSuccess(successMessage);
      }

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      const errorMessage = err?.message || err?.error || 'Une erreur est survenue';
      setError(errorMessage);

      if (showErrorToast) {
        showError(errorMessage);
      }

      if (onError) {
        onError(err);
      }

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [showError, showSuccess]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    execute,
    reset,
  };
}

export default useApi;
