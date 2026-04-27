# Configuration des Secrets GitHub — FORGES

## Où configurer les secrets
GitHub → Settings → Secrets and variables → Actions → New repository secret

## Secrets communs (tous environnements)
| Secret | Description | Exemple |
|--------|-------------|---------|
| `SSH_PRIVATE_KEY` | Clé SSH privée pour accès VPS | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `SSH_KNOWN_HOSTS` | Empreinte SSH des serveurs | Résultat de `ssh-keyscan -H test.forges-group.com demo.forges-group.com` |

## Secrets environnement TEST (préfixe TEST_)
| Secret | Description |
|--------|-------------|
| `TEST_SERVER_HOST` | test.forges-group.com |
| `TEST_SERVER_USER` | plesk-ssh-user |
| `TEST_DEPLOY_PATH` | /var/www/vhosts/forges-group.com/test.forges-group.com/httpdocs |
| `TEST_DATABASE_URL` | postgresql://forges_user:pass@test-db:5432/forges_test |
| `TEST_JWT_SECRET` | `openssl rand -hex 64` |
| `TEST_JWT_REFRESH_SECRET` | `openssl rand -hex 64` |
| `TEST_ENCRYPTION_KEY` | `openssl rand -base64 32` |
| `TEST_HMAC_KEY` | `openssl rand -hex 32` |
| `TEST_WEBHOOK_SECRET` | `openssl rand -hex 32` |
| `TEST_SMTP_HOST` | sandbox.smtp.mailtrap.io |
| `TEST_SMTP_USER` | (mailtrap credentials) |
| `TEST_SMTP_PASS` | (mailtrap credentials) |
| `TEST_PAYMENT_API_KEY` | Clé sandbox agrégateur paiement |

## Secrets environnement DEMO (préfixe DEMO_)
Mêmes noms avec préfixe DEMO_ — valeurs propres à la démo.

## Générer SSH_KNOWN_HOSTS
```bash
ssh-keyscan -H test.forges-group.com demo.forges-group.com
```
Coller le résultat complet dans le secret SSH_KNOWN_HOSTS.

## Configurer les Environments GitHub
Settings → Environments → New environment
- Créer "test" et "demo"
- Pour "demo" : activer "Required reviewers" (approbation manuelle)
