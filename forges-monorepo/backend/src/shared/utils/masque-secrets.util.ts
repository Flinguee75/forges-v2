/**
 * Masque les informations sensibles dans les objets avant logging/audit.
 * RM-162: Credentials jamais exposés (logs/HTML/API)
 */
export function masquerSecrets(obj: any): any {
  if (!obj) return obj;

  const secretKeys = [
    'authorization',
    'authentication_token',
    'operation_token',
    'ngser_auth_token',
    'ngser_operation_token_paiement',
    'payment_token',
    'payment_token_ngser',
    'token',
    'secret',
    'password',
    'password_hash',
    'api_key',
    'apiKey',
    'webhook_secret',
    'encryption_key',
    'credentials',
    'url_acces_chiffree',
    'access_token',
    'refresh_token',
    'jwt',
    'x-api-key',
    'x-webhook-signature',
    'auth_token',
  ];

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => masquerSecrets(item));
  }

  const masked: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = secretKeys.some((secretKey) => lowerKey.includes(secretKey));

    if (isSensitive && typeof value === 'string') {
      // Masquer en gardant les 4 premiers caractères si suffisamment long
      masked[key] = value.length > 8 ? value.substring(0, 4) + '***' : '***';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = masquerSecrets(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}
