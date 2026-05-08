# Grafana Demo — Deploiement et acces

Stack de monitoring pour l'environnement demo : Grafana + Loki + Promtail + Uptime Kuma.
Acces en SSH tunnel uniquement (non expose publiquement).

---

## Fichiers crees

| Fichier | Role |
|---|---|
| `docker-compose.monitoring.demo.yml` | Stack Docker : Loki, Promtail, Grafana, Uptime Kuma |
| `monitoring-demo.sh` | Script de gestion (start/stop/status/health/logs/backup) |
| `deploy-monitoring-demo.sh` | Script de deploiement local -> VPS via scp + SSH |
| `.env.monitoring.demo` | Variables Grafana + SMTP (Brevo, sync avec .env.demo.deploy) |
| `loki-config.yml` | Configuration Loki (agregation logs) |
| `promtail-config.yml` | Collecteur de logs Docker (tags par environnement) |
| `grafana/provisioning/datasources/loki.yml` | Datasource Loki auto-provisionnee |
| `grafana/provisioning/dashboards/dashboards.yml` | Provisionnement dashboards depuis fichiers JSON |
| `grafana/provisioning/alerting/rules.yml` | Regles d'alerte (error rate, backend down) |
| `grafana/provisioning/alerting/contactpoints.yml` | Destination alertes email |
| `grafana/provisioning/alerting/policies.yml` | Politique de routage des alertes |
| `grafana/dashboards/forges-demo.json` | Dashboard principal (logs, erreurs, volumes) |

---

## Deployer sur le VPS

Depuis la racine du repo en local :

```bash
cd forges-monorepo/infra/monitoring
./deploy-monitoring-demo.sh
```

Ce script :
1. Verifie que `.env.monitoring.demo` est rempli
2. Copie tous les fichiers sur le VPS via `scp`
3. Lance `./monitoring-demo.sh start` sur le VPS
4. Attend 15s puis verifie la sante des services
5. Affiche les instructions d'acces

---

## Acceder a Grafana (SSH tunnel)

```bash
ssh -i ~/.ssh/id_ed25519_forges -L 3050:localhost:3050 forgesadmin@92.205.164.97
```

Puis dans le navigateur : `http://localhost:3050`

| Champ | Valeur |
|---|---|
| Login | admin |
| Mot de passe | forges2026! |
| Dashboard par defaut | FORGES Demo Monitoring |

Pour Uptime Kuma en meme temps :

```bash
ssh -i ~/.ssh/id_ed25519_forges \
  -L 3050:localhost:3050 \
  -L 3001:localhost:3001 \
  forgesadmin@92.205.164.97
```

---

## Gestion sur le VPS

```bash
ssh -i ~/.ssh/id_ed25519_forges forgesadmin@92.205.164.97
cd ~/forges-v2/forges-monorepo/infra/monitoring

./monitoring-demo.sh status    # etat des containers
./monitoring-demo.sh health    # sante des services
./monitoring-demo.sh logs      # logs en temps reel
./monitoring-demo.sh logs grafana  # logs d'un service specifique
./monitoring-demo.sh stop
./monitoring-demo.sh restart
./monitoring-demo.sh backup    # sauvegarde volumes Grafana + Loki
```

---

## Architecture

```
[forges-backend-demo]  ──logs──>  [Promtail]  ──push──>  [Loki]  <──query──  [Grafana :3050]
[forges-postgres-demo] ──logs──>      |
[forges-redis-demo]    ──logs──>      |
                                      v
                              tags: environment="demo"
                                    service="backend|postgres|redis"
                                    level="info|warn|error"
```

---

## Alertes configurees

| Alerte | Condition | Destinataire |
|---|---|---|
| DEMO - High Error Rate | > 0.05 erreurs/s sur 2 min | TidianeCisse9@outlook.fr |
| DEMO - Backend Container Down | Aucun log depuis 5 min | TidianeCisse9@outlook.fr |

---

## Ports (internes VPS — non exposes)

| Service | Port local VPS |
|---|---|
| Grafana | 3050 |
| Loki API | 3100 |
| Uptime Kuma | 3001 |
