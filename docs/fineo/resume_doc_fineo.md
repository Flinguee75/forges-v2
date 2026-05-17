# FineoPay API — Résumé

## Vue d’ensemble
API de paiement permettant :
- Création de liens de paiement
- Retraits (payouts) vers Mobile Money
- Consultation des transactions

Version : v1.0.0  
Environnement sandbox disponible

---

## Authentification
Chaque requête nécessite :
- `businessCode`
- `apiKey`

Headers :
```
businessCode: <votre_code>
apiKey: <votre_clé>
Content-Type: application/json
```

---

## Endpoints principaux

### 1. Créer un lien de paiement
**POST** `/checkout-link`

Permet de générer un lien de paiement personnalisable.

Champs principaux :
- title
- amount (>= 100 XOF)
- callbackUrl
- syncRef (optionnel)
- inputs (champs personnalisés)

---

### 2. Effectuer un retrait (Payout)
**POST** `/payout`

Transfert vers Mobile Money.

Champs :
- clientAccount
- canal (orange, mtn, moov, wave)
- amount
- description

---

### 3. Lister les transactions
**GET** `/transactions`

- Pagination
- Historique complet

---

### 4. Détail d’une transaction
**GET** `/transactions/{reference}`

Retourne :
- montant
- statut
- canal
- date
- frais
- données personnalisées

---

### 5. Callback (notification)
**POST** `callbackUrl`

FineoPay envoie automatiquement :
- reference
- amount
- status
- clientAccountNumber
- timestamp

Important : permet de sécuriser la confirmation des paiements.

---

## Canaux supportés

| Canal        | Min (XOF) | Format |
|-------------|----------|--------|
| Orange Money | 100      | 07/05XXXXXXXX |
| MTN Money    | 100      | 07/05XXXXXXXX |
| Moov Money   | 200      | 01XXXXXXXX |
| Wave         | 200      | 00XXXXXXXX |
| Fineo        | 100      | Compte interne |

---

## Types de champs (inputs)
- text
- number
- list
- email
- tel

---

## Environnements
- Sandbox : https://dev.fineopay.com/api/v1/business/dev
- Production : https://api.fineopay.com/api/v1/business/dev

---

## Codes d’erreur

| Code | Signification |
|------|--------------|
| 400  | Requête invalide |
| 401  | Auth échouée |
| 403  | Permission refusée |
| 404  | Non trouvé |
| 429  | Trop de requêtes |
| 500  | Erreur serveur |

---

## Structure d’une transaction

- reference
- amount
- fees
- canal
- direction (cashin / payout)
- status (success, etc.)
- date
- formValue (inputs personnalisés)

---

## Point critique (à retenir)

- Le callback est essentiel (fiabilité des paiements)
- Les montants minimum varient selon le canal
- Toujours sécuriser apiKey
- Gérer les erreurs (notamment 401, 429, 500)

---

## Lecture stratégique

Ce système repose sur :
1. Génération de lien (entrée)
2. Callback (confirmation)
3. Consultation (audit)

Le point le plus critique n’est pas la création du paiement, mais :
→ la gestion fiable du callback (sinon perte de transactions)
