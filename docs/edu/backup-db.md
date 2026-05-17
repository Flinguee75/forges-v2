# Backup base de donnees — Environnement EDU

Base concernee : `forges_edu` sur `forges-postgres-edu` (VPS, port 5432 interne).

---

## Backups existants

| Date | Fichier | Taille | Contenu |
|---|---|---|---|
| 2026-05-11 14:35 | `forges_edu_20260511_143530_initial.sql.gz` | 25 KB | Etat initial — 13 apprenants, 6 organisations, 11 vouchers, 176 auditlogs, 6 devis, 2 dossiers, 1 formation, 1 session |

Emplacement sur le VPS : `/home/forgesadmin/backups/forges/edu/`

---

## Pre-requis VPS (a verifier avant tout)

```bash
# L'utilisateur forgesadmin doit etre dans le groupe docker
# Sinon docker exec echoue silencieusement depuis le cron
ssh forgesadmin@<VPS_IP> "groups"
# Doit contenir "docker" dans la sortie
```

Si `docker` n'apparait pas :

```bash
ssh root@<VPS_IP> "usermod -aG docker forgesadmin"
# Puis se reconnecter (la session en cours ne voit pas encore le changement)
```

---

## Architecture du systeme

Trois declencheurs produisent des backups :

| Declencheur | Frequence | Prefixe fichier | Conservation |
|---|---|---|---|
| Cron nocturne | Chaque nuit a 2h00 | `forges_edu_` | 7 jours |
| Dimanche (cron) | 1 fois par semaine | `forges_edu_weekly_` | 4 semaines |
| Pre-deploy | A chaque deploy GitHub | `forges_edu_predeploy_` | 10 derniers |

Tous les fichiers sont stockes dans `~/backups/forges/edu/` (home de `forgesadmin`).
Format : dump PostgreSQL plain-text compresse gzip (`.sql.gz`).

---

## Scripts

| Fichier | Role |
|---|---|
| `infra/scripts/backup-edu.sh` | Cree un backup, verifie qu'il est non vide, applique la retention |
| `infra/scripts/restore-edu.sh` | Restaure depuis un fichier `.sql.gz` |
| `infra/scripts/setup-cron-backup-edu.sh` | Verifie les pre-requis, active le cron (une seule fois) |

---

## Installation initiale (a faire une seule fois)

Apres le premier deploy GitHub Actions (qui deposera les scripts sur le VPS) :

```bash
ssh forgesadmin@<VPS_IP> \
  "bash /opt/forges/infra/scripts/setup-cron-backup-edu.sh /opt/forges"
```

Ce script :
1. Verifie que `forgesadmin` peut appeler `docker` — sort en erreur avec les instructions si non
2. Cree `~/backups/forges/edu/`
3. Ajoute le cron `0 2 * * *` dans `crontab`
4. Lance un premier backup de test immediatement pour valider le tout

---

## Lancer un backup manuel

```bash
ssh forgesadmin@<VPS_IP> \
  "bash /opt/forges/infra/scripts/backup-edu.sh"
```

Sortie attendue :

```
[backup-edu] 2026-05-11T02:00:01+00:00 Debut backup forges_edu depuis forges-postgres-edu
[backup-edu] Cree: /home/forgesadmin/backups/forges/edu/forges_edu_20260511_020001.sql.gz (4.2M)
[backup-edu] Retention: fichiers >7 jours supprimes
[backup-edu] 2026-05-11T02:00:03+00:00 Backup termine
```

Si le fichier genere fait moins de 1 Ko, le script le supprime et sort en erreur — cela signale un pg_dump echoue ou une DB vide.

---

## Lister les backups disponibles

```bash
ssh forgesadmin@<VPS_IP> \
  "ls -lh ~/backups/forges/edu/ | sort -k6,7"
```

---

## Restaurer depuis un backup

```bash
ssh forgesadmin@<VPS_IP> \
  "bash /opt/forges/infra/scripts/restore-edu.sh \
    /home/forgesadmin/backups/forges/edu/forges_edu_20260511_020001.sql.gz"
```

Le script :
1. Affiche un recapitulatif (fichier source, base cible, taille)
2. Demande de taper `OUI` pour confirmer
3. Cree automatiquement un backup de securite `predeploy` avant d'ecraser quoi que ce soit
4. Arrete `forges-backend-edu`, DROP + CREATE la base, restaure, redemarre le backend
5. Utilise `ON_ERROR_STOP=1` — la restauration s'arrete a la premiere erreur SQL

Pour restaurer le backup le plus recent sans chercher le nom :

```bash
ssh forgesadmin@<VPS_IP> bash -s << 'EOF'
LATEST=$(ls -t ~/backups/forges/edu/forges_edu_[0-9]*.sql.gz 2>/dev/null | head -1)
echo "Backup le plus recent : $LATEST"
bash /opt/forges/infra/scripts/restore-edu.sh "$LATEST"
EOF
```

---

## Backup automatique pre-deploy

A chaque deploy via GitHub Actions (`deploy-edu.yml`), le step **"Backup pre-deploy (forges_edu)"** s'execute automatiquement avant le remplacement du container. Si le deploy echoue, l'etat precedent est dans le fichier `predeploy` correspondant.

Ce step est silencieux si les scripts ne sont pas encore presents sur le VPS (premier deploy).

---

## Consulter les logs du cron

```bash
ssh forgesadmin@<VPS_IP> "tail -50 ~/backups/forges/backup-edu.log"
```

---

## Verifier l'espace disque

```bash
ssh forgesadmin@<VPS_IP> "du -sh ~/backups/forges/edu/ && df -h ~"
```

Un backup de `forges_edu` pese entre 2 Mo et 20 Mo compresse selon le volume de donnees.
Avec la retention par defaut (7 daily + 4 weekly + 10 predeploy), prevoir ~500 Mo sur le long terme.

---

## Modifier la retention

Les valeurs par defaut peuvent etre surchargees via des variables d'environnement :

```bash
RETAIN_DAYS=14 RETAIN_WEEKS=8 bash /opt/forges/infra/scripts/backup-edu.sh
```

Pour rendre le changement permanent, editer la ligne cron :

```bash
ssh forgesadmin@<VPS_IP> "crontab -e"
# Remplacer la ligne par :
# 0 2 * * * RETAIN_DAYS=14 RETAIN_WEEKS=8 bash /opt/forges/infra/scripts/backup-edu.sh >> ~/backups/forges/backup-edu.log 2>&1
```

---

## Cas d'urgence — perte totale du volume Docker

Si le volume `forges-postgres-edu` est perdu (suppression accidentelle, crash disque) :

```bash
# 1. Recreer le container postgres
ssh forgesadmin@<VPS_IP> bash -s << 'EOF'
cd /opt/forges
docker compose -f infra/docker/docker-compose.edu.deploy.yml \
  --env-file infra/env/.env.edu.deploy up -d postgres
EOF

# 2. Attendre que postgres soit healthy (relancer jusqu'a avoir "healthy")
ssh forgesadmin@<VPS_IP> \
  "docker inspect --format='{{.State.Health.Status}}' forges-postgres-edu"

# 3. Restaurer le dernier backup
ssh forgesadmin@<VPS_IP> bash -s << 'EOF'
LATEST=$(ls -t ~/backups/forges/edu/forges_edu_[0-9]*.sql.gz 2>/dev/null | head -1)
bash /opt/forges/infra/scripts/restore-edu.sh "$LATEST"
EOF

# 4. Relancer le backend complet
ssh forgesadmin@<VPS_IP> bash -s << 'EOF'
cd /opt/forges
docker compose -f infra/docker/docker-compose.edu.deploy.yml \
  --env-file infra/env/.env.edu.deploy up -d
EOF
```

---

## Transferer un backup en local (pour analyse ou migration)

```bash
scp forgesadmin@<VPS_IP>:~/backups/forges/edu/forges_edu_20260511_020001.sql.gz ./

# Inspecter sans restaurer :
gunzip -c forges_edu_20260511_020001.sql.gz | head -80
```

---

## Ce qui pourrait encore mal tourner

Deux points ne peuvent pas etre valides sans acces direct au VPS :

1. **`forgesadmin` dans le groupe `docker`** — le `setup-cron-backup-edu.sh` le verifie et sort en erreur explicite si ce n'est pas le cas.
2. **Espace disque insuffisant** — a surveiller via `df -h ~`. Un volume VPS plein fait echouer le backup silencieusement si le `trap ERR` n'intercepte pas l'erreur d'ecriture disque (improbable mais possible).
