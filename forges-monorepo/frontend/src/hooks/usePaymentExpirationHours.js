import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/dashboard.api';
import { DEFAULT_PAYMENT_EXPIRATION_HOURS, normalizePaymentExpirationHours } from '../utils/paymentDeadline';

export function usePaymentExpirationHours() {
  const [hours, setHours] = useState(DEFAULT_PAYMENT_EXPIRATION_HOURS);

  useEffect(() => {
    let mounted = true;

    dashboardApi.getRuntimeConfig()
      .then((data) => {
        if (!mounted) return;
        const value = data?.paiement_expiration_heures ?? data?.payment_expiration_heures ?? data?.data?.paiement_expiration_heures;
        setHours(normalizePaymentExpirationHours(value));
      })
      .catch(() => {
        if (!mounted) return;
        setHours(DEFAULT_PAYMENT_EXPIRATION_HOURS);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return hours;
}

export default usePaymentExpirationHours;
