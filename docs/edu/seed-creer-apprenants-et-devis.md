# Workflow apprenants + devis sur EDU

Ce document décrit le lancement réel du script `scripts/enrolements/creer-apprenants-et-devis.ts` sur le VPS `edu`.

Le but du workflow est simple:
- créer ou réutiliser des comptes apprenants
- leur envoyer le mail de mot de passe temporaire
- leur envoyer un devis PDF personnalisé

---

## Quand en avoir besoin

- pour tester l'enrôlement de plusieurs apprenants sur `edu`
- pour vérifier les mails de création de compte
- pour vérifier la génération et l'envoi d'un devis PDF personnalisé

---

## Pré-requis

- le VPS `edu` doit être en ligne
- la base PostgreSQL `edu` doit être accessible via le conteneur `forges-postgres-edu`
- le bon fichier d'environnement à charger est:
  - `/var/www/vhosts/edu.forges-group.com/httpdocs/.env`
- `FRONTEND_URL` doit pointer vers:
  - `https://edu.forges-group.com`

---

## Ce qui a été exécuté

Le script a été lancé avec le JSON de test suivant:

- [apprenants-devis-test.json](/Users/tidianecisse/PROJET_INFO/forges-kit%202/forges-monorepo/backend/scripts/enrolements/groupes/apprenants-devis-test.json)

Contenu:

- `redfoo923@gmail.com`
- `TidianeCisse9@outlook.fr`

Le devis s'appuie sur:

- la formation `frm-masterclass-gwu-ccdl-2026`
- la session `ses-gwu-ccdl-juin-2026`

---

## Point important

Au premier passage, le script a échoué sur l'envoi du devis car le service `DevisService` du VPS ne gérait pas encore le mode `draft`.

La version corrigée du service a ensuite été déployée sur le VPS, puis le script a été relancé avec succès.

---

## Commande utilisée sur le VPS

Depuis SSH:

```bash
ssh -i ~/.ssh/id_ed25519_forges forgesadmin@92.205.164.97
```

Puis sur le VPS:

```bash
while IFS= read -r line; do export "$line"; done < <(grep -E '^[A-Z0-9_]+=' /var/www/vhosts/edu.forges-group.com/httpdocs/.env)
PG_IP=$(docker inspect forges-postgres-edu --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' | head -1)
PG_PASS=$(docker exec forges-postgres-edu printenv POSTGRES_PASSWORD)
PG_PASS_ENC=$(printf "%s" "$PG_PASS" | python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.stdin.read().strip(), safe=\"\"))")

cd ~/forges-v2/forges-monorepo/backend
DATABASE_URL="postgresql://forges_edu:${PG_PASS_ENC}@${PG_IP}:5432/forges_edu" \
FRONTEND_URL=https://edu.forges-group.com \
node -r ts-node/register/transpile-only scripts/enrolements/creer-apprenants-et-devis.ts --file groupes/apprenants-devis-test.json
```

---

## Résultat du run réel

- `redfoo923@gmail.com` créé
- `TidianeCisse9@outlook.fr` créé
- mail de mot de passe temporaire envoyé aux deux comptes
- devis PDF envoyé aux deux comptes
- formation utilisée:
  - `Masterclass GWU/CCDL — Cybersécurité & IA`
- période utilisée:
  - `01/06/2026` → `11/06/2026`
- tarif unitaire utilisé:
  - `3 000 000 XOF`

Numéros de devis générés:

- `FORGES-DEVIS-2026-APP-001`
- `FORGES-DEVIS-2026-APP-002`

---

## Journal de sortie

Le script a sauvegardé son log ici:

- `/home/forgesadmin/forges-v2/forges-monorepo/backend/scripts/enrolements/creer_apprenants_et_devis_log.json`

---

## Notes utiles

- ce workflow doit être lancé sur le VPS `edu`, pas sur la machine locale
- il doit utiliser le vrai env du VPS, pas le `.env` local du repo
- le mode `draft` du service devis est indispensable pour envoyer un PDF sans créer de ligne `Devis` en base
- si le PDF ou l'email partent avec le mauvais frontend, vérifier d'abord `FRONTEND_URL`
