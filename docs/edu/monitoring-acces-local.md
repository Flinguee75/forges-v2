# Accès au monitoring edu en local

Ce guide explique comment accéder à Grafana, Loki et Uptime Kuma de l'environnement `edu`
depuis ta machine via tunnel SSH. Aucune installation supplémentaire n'est nécessaire.

---

## Prérequis

- Clé SSH `~/.ssh/id_ed25519_forges` configurée
- Accès VPS `forgesadmin@92.205.164.97`

---

## 1. Ouvrir le tunnel SSH

Lance cette commande dans un terminal et laisse-la tourner :

```bash
ssh -i ~/.ssh/id_ed25519_forges \
  -L 3052:localhost:3052 \
  -L 3007:localhost:3007 \
  -N \
  forgesadmin@92.205.164.97
```

| Option | Rôle |
|--------|------|
| `-L 3052:localhost:3052` | Grafana edu (port VPS → port local) |
| `-L 3007:localhost:3007` | Uptime Kuma edu |
| `-N` | Pas de commande distante, juste le tunnel |

Le terminal reste bloqué — c'est normal. Le tunnel est actif tant que la commande tourne.

---

## 2. Accéder aux outils

Une fois le tunnel ouvert, dans ton navigateur :

| Outil | URL locale | Identifiants |
|-------|-----------|--------------|
| Grafana | http://localhost:3052 | `admin` / `forges2026!` |
| Uptime Kuma | http://localhost:3007 | `admin` / `forges2026!` |

---

## 3. Ce que tu trouves dans Grafana

### Dashboard principal — `Forges EDU`

Accessible via **Dashboards > Forges EDU** dans le menu de gauche.

Panels disponibles :
- **Logs backend edu** — tous les logs de `forges-backend-edu` en temps réel
- **Logs niveau ERROR** — filtré sur `level=error` pour détecter rapidement les problèmes
- **Audit logs** — logs structurés JSON (actions `RECONCILIATION_*`, `PAIEMENT_*`, etc.)
- **Silent checks** — résultats du checker automatique toutes les 5 minutes

### Requêtes Loki utiles dans l'explorateur

Va dans **Explore** (icône boussole à gauche) et sélectionne la datasource **Loki**.

```
# Tous les logs edu
{environment="edu"}

# Logs backend uniquement
{environment="edu", service="backend"}

# Erreurs uniquement
{environment="edu", level="error"}

# Audit logs (actions métier)
{environment="edu", service="backend"} | json | line_format "{{.action}} — {{.timestamp}}"

# Logs postgres
{environment="edu", service="postgres"}

# Recherche texte libre
{environment="edu"} |= "RECONCILIATION"
{environment="edu"} |= "paiement"
```

---

## 4. Fermer le tunnel

`Ctrl+C` dans le terminal où tourne la commande SSH.

---

## 5. Si le tunnel refuse de se connecter

```bash
# Vérifier que les services monitoring sont bien lancés sur le VPS
ssh -i ~/.ssh/id_ed25519_forges forgesadmin@92.205.164.97 \
  "docker ps --filter name=forges-grafana-edu --filter name=forges-loki-edu --format 'table {{.Names}}\t{{.Status}}'"
```

Si un container est arrêté, relancer le stack depuis le VPS :

```bash
ssh -i ~/.ssh/id_ed25519_forges forgesadmin@92.205.164.97 \
  "cd ~/forges-v2/forges-monorepo/infra/monitoring && ./monitoring-edu.sh start"
```

---

## 6. Accès au monitoring dev (pour comparaison)

Si tu veux aussi accéder au monitoring dev en même temps :

```bash
ssh -i ~/.ssh/id_ed25519_forges \
  -L 3051:localhost:3051 \
  -L 3004:localhost:3004 \
  -L 3052:localhost:3052 \
  -L 3007:localhost:3007 \
  -N \
  forgesadmin@92.205.164.97
```

| Outil | URL | Env |
|-------|-----|-----|
| Grafana dev | http://localhost:3051 | dev |
| Uptime Kuma dev | http://localhost:3004 | dev |
| Grafana edu | http://localhost:3052 | edu |
| Uptime Kuma edu | http://localhost:3007 | edu |
