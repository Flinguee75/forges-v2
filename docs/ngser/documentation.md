Voici un document structuré en **Markdown**, prêt à être utilisé (doc interne, onboarding dev, ou intégration FORGES).

---

# 📄 API Gateway Monétique — Synthèse d’intégration

## 🎯 Objectif

Le **Gateway monétique** permet d’unifier plusieurs moyens de paiement via une **API unique**, afin de simplifier l’intégration côté e-commerce.

---

# 🧭 1. Vue globale du flow

## Flow standard paiement

1. **Initiation côté backend marchand**
2. **Redirection utilisateur → Gateway**
3. **Paiement côté Gateway**
4. **Notification serveur (IPN) → marchand**
5. **Redirection utilisateur → marchand**
6. **(Optionnel) Vérification statut**

---

# 🚀 2. Initialisation d’un paiement

## Endpoint

```
POST /v3/sessions
```

## Payload

```json
{
  "name": "SERVICE",
  "authentication_token": "XXX",
  "currency": "XOF",
  "operation_token": "XXX",
  "order": "ORDER_ID",
  "transaction_amount": 500
}
```

## Réponse

```json
{
  "description": "Transaction session created with success",
  "payment_token": "78361121320349",
  "payment_url": "https://.../checkout/78361121320349",
  "expired_url": "2024-01-25T11:50:37"
}
```

## Point critique

* Cette requête doit être faite **uniquement en backend**
* `order` doit être **unique côté marchand**

---

# 🔁 3. Redirection utilisateur

Utiliser :

```
payment_url
```

➡️ Redirige vers page de paiement Gateway
➡️ Possibilité d’iframe (moins recommandé)

---

# 🔔 4. Notification de paiement (CRITIQUE)

## Instant Payment Notification (IPN)

### Endpoint (fourni par le marchand)

```
POST URL_de_notification_post_paiement
```

### Payload

```json
{
  "order_id": "Y4U465JDJ655N687C",
  "status_id": 1,
  "transaction_id": "245543",
  "transaction_amount": 500,
  "currency": "XOF",
  "paid_transaction_amount": 500,
  "paid_currency": "XOF",
  "wallet_reference_id": "AB7777788889999",
  "phone_number": "0011223344",
  "wallet": "paymoney"
}
```

## Status importants

| status_id | Signification              |
| --------- | -------------------------- |
| 1         | Succès                     |
| 0         | Échec                      |
| 2         | Échec (fonds insuffisants) |

## ⚠️ Règle stratégique

👉 **C’est CET événement qui fait foi**

Tu dois :

* Mettre à jour le statut transaction
* Livrer produit/service

❌ Ne jamais faire confiance uniquement à la redirection utilisateur

---

# 🔄 5. Redirection utilisateur (secondaire)

```
GET URL_de_redirection_post_paiement?...
```

➡️ Sert uniquement à UX
➡️ Peut être interrompu

---

# 🔍 6. Vérification du statut (fallback)

## Étape 1 — Auth

```
POST /service/auth
```

```json
{
  "auth": {
    "name": "SERVICE",
    "authentication_token": "XXX",
    "order": "ORDER_ID"
  }
}
```

## Étape 2 — Check status

```
POST /check_payment_status/{order}
```

### Réponse succès

```json
{
  "code": "1",
  "status": "SUCCESS",
  "data": {
    "order_id": "...",
    "transaction_amount": "500.00"
  }
}
```

---

## Codes importants

| Code | Status    | Signification      |
| ---- | --------- | ------------------ |
| 1    | SUCCESS   | OK                 |
| 0    | FAIL      | Rejet paiement     |
| 2    | FAIL      | Fonds insuffisants |
| 3    | PENDING   | En cours           |
| 4    | NOT EXIST | Inconnu            |
| 5    | FAIL      | Timeout            |

---

# 🧾 7. Cas spécifique : retrait Mobile Money

## Vérification côté marchand

Le Gateway appelle ton serveur :

```
POST URL_authification_de_retrait
```

### Payload

```json
{
  "number": "order_id",
  "transaction_amount": 10000
}
```

### Réponse attendue

```json
{
  "number": "order_id",
  "status": 200,
  "message": "Valid transaction"
}
```

## Codes

| Code | Signification     |
| ---- | ----------------- |
| 200  | OK                |
| 400  | Inconnu           |
| 401  | Montant incorrect |
| 402  | Déjà traité       |

---

# 🔐 8. Bonnes pratiques critiques

## Sécurité

* Toujours appeler API depuis **backend**
* Ne jamais exposer `authentication_token`
* Valider montants reçus

## Logique métier minimale

Tu dois avoir 3 états :

* `PENDING`
* `SUCCESS`
* `FAIL`

---

## ⚠️ Vérification critique

Toujours vérifier :

```text
transaction_amount (envoyé) == transaction_amount (reçu)
```

Sinon → FAIL

---

## 🔁 Résilience (IMPORTANT PROD)

Mettre en place :

### Cron de récupération

* Scanner transactions `PENDING`
* Appeler `check_payment_status`
* Corriger statut

👉 Évite pertes d’argent + litiges

---

# 🧠 Lecture stratégique (important pour FORGES)

## Ce que cette API t’impose

### 1. Event-driven system

Ton système doit être basé sur :

👉 Webhooks (IPN)

Pas sur requêtes sync

---

### 2. Source de vérité externe

Le paiement est contrôlé par :

👉 Gateway (pas ton système)

Donc :

* Tu subis les délais
* Tu dois gérer incohérences

---

### 3. Double validation obligatoire

Tu dois croiser :

* IPN (push)
* Check status (pull)
