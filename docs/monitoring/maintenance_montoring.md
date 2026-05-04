**FORGES**

**Setup maintenance et monitoring Docker**

Portainer CE - Uptime Kuma - Sentry - Better Stack / Logtail - Trivy

Version 1.0 - 1 mai 2026

Baseline finale retenue : Portainer CE, Uptime Kuma, Sentry, Better Stack / Logtail, Trivy.

**Objectif :** mettre en place une stack minimale pour surveiller, diagnostiquer et maintenir les services Docker FORGES en production, sans complexifier inutilement l'exploitation.

# Table des matieres

**1\.** Objectif du setup

**2\.** Stack retenue

**3\.** Architecture cible

**4\.** Preparation serveur

**5\.** Installation Portainer CE

**6\.** Installation Uptime Kuma

**7\.** Configuration Sentry backend Node/Express

**8\.** Configuration Better Stack / Logtail

**9\.** Scan des images avec Trivy

**10\.** docker-compose.monitoring.yml

**11\.** Commandes de maintenance quotidienne

**12\.** Checklist de validation

**13\.** Criteres minimum de prod surveillee

**14\.** Elements non retenus au demarrage

**15\.** Procedure apres chaque deploiement

# 1\. Objectif du setup

Ce document decrit le setup minimal recommande pour maintenir et monitorer les services Docker FORGES en production.

La stack couvre les besoins suivants :

**1\.** Gestion des conteneurs Docker

**2\.** Surveillance uptime des endpoints critiques

**3\.** Detection des crashs backend

**4\.** Centralisation des logs applicatifs

**5\.** Scan de securite des images Docker avant deploiement

Point de vigilance : Portainer seul n'est pas du monitoring. Portainer administre Docker, mais ne remplace ni Sentry, ni les alertes uptime, ni les logs centralises.

# 2\. Stack retenue

| **Outil**              | **Role**                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| Portainer CE           | Interface pour gerer Docker : conteneurs, images, volumes, reseaux, logs rapides, restart manuel. |
| Uptime Kuma            | Surveillance des endpoints /health, /api/health, frontend et backend.                             |
| Sentry                 | Crash reporting backend Node/Express : erreurs 500, stack traces, routes cassees.                 |
| Better Stack / Logtail | Centralisation des logs applicatifs, recherche et alertes.                                        |
| Trivy                  | Scan de vulnerabilites des images Docker avant deploiement.                                       |

Stack a installer : Portainer CE + Uptime Kuma + Sentry + Better Stack / Logtail + Trivy.

# 3\. Architecture cible

VPS FORGES

|

|-- Docker Engine

|

|-- Services applicatifs FORGES

| |-- backend

| |-- frontend

| |-- postgres

| |-- redis

|

|-- Monitoring local

| |-- portainer

| |-- uptime-kuma

|

|-- Monitoring externe

| |-- sentry

| |-- better-stack / logtail

|

|-- Securite images

|-- trivy

# 4\. Preparation serveur

## 4.1 Verifier Docker

docker --version

docker compose version

## 4.2 Creer le dossier monitoring

mkdir -p /opt/forges/monitoring

cd /opt/forges/monitoring

# 5\. Installation Portainer CE

## 5.1 Creer le volume Portainer

docker volume create portainer_data

## 5.2 Lancer Portainer

docker run -d \\

\--name portainer \\

\--restart=always \\

\-p 9443:9443 \\

\-p 9000:9000 \\

\-v /var/run/docker.sock:/var/run/docker.sock \\

\-v portainer_data:/data \\

portainer/portainer-ce:latest

## 5.3 Acces

https://IP_DU_SERVEUR:9443

## 5.4 Actions a faire dans Portainer

**1\.** Creer le compte administrateur.

**2\.** Selectionner l'environnement Docker local.

**3\.** Verifier que les conteneurs FORGES sont visibles.

**4\.** Verifier les logs backend et frontend.

**5\.** Verifier les volumes Postgres et Redis.

**6\.** Tester un restart manuel du backend sur staging avant production.

# 6\. Installation Uptime Kuma

## 6.1 Creer le volume

docker volume create uptime-kuma

## 6.2 Lancer Uptime Kuma

docker run -d \\

\--name uptime-kuma \\

\--restart=always \\

\-p 3001:3001 \\

\-v uptime-kuma:/app/data \\

louislam/uptime-kuma:1

## 6.3 Acces

http://IP_DU_SERVEUR:3001

## 6.4 Monitors a creer

| **Monitor**       | **URL**                               | **Methode** | **Intervalle** |
| ----------------- | ------------------------------------- | ----------- | -------------- |
| Frontend FORGES   | <https://forges-group.com>            | GET         | 60s            |
| Backend Health    | <https://forges-group.com/api/health> | GET         | 60s            |
| API Health simple | <https://forges-group.com/health>     | GET         | 60s            |

## 6.5 Alertes minimales

- Email, Telegram ou Slack/Discord webhook.
- Alerte si service down.
- Alerte si certificat SSL bientot expire.
- Alerte si temps de reponse trop eleve.

# 7\. Configuration Sentry backend Node/Express

## 7.1 Creer un projet Sentry

Project type : Node.js / Express

Environment : production

Recuperer le DSN Sentry :

SENTRY_DSN=https://...

## 7.2 Ajouter les variables d'environnement backend

SENTRY_DSN=https://TON_DSN_SENTRY

SENTRY_ENVIRONMENT=production

SENTRY_RELEASE=forges-backend-v1

## 7.3 Installer le SDK

npm install @sentry/node

## 7.4 Initialiser Sentry dans Express

const Sentry = require("@sentry/node");

Sentry.init({

dsn: process.env.SENTRY_DSN,

environment: process.env.SENTRY_ENVIRONMENT || "production",

release: process.env.SENTRY_RELEASE,

tracesSampleRate: 0.1,

});

## 7.5 Ajouter un middleware d'erreur global

app.use((err, req, res, next) => {

Sentry.captureException(err);

console.error(err);

res.status(err.status || 500).json({

error: "INTERNAL_SERVER_ERROR",

message: process.env.NODE_ENV === "production"

? "Erreur interne serveur"

: err.message,

});

});

## 7.6 Evenements que Sentry doit capter

- Erreurs 500.
- Crashs backend.
- Exceptions Prisma.
- Timeouts DB.
- Erreurs webhook paiement.
- Erreurs inscription et dossier.
- Erreurs scheduler.

# 8\. Configuration Better Stack / Logtail

## 8.1 Creer une source logs

Source type : Node.js / Docker logs

Environment : production

Recuperer le token :

LOGTAIL_SOURCE_TOKEN=...

## 8.2 Ajouter les variables d'environnement

LOGTAIL_SOURCE_TOKEN=TON_TOKEN

LOG_LEVEL=info

## 8.3 Format recommande des logs backend

console.log(JSON.stringify({

level: "info",

event: "PAYMENT_WEBHOOK_RECEIVED",

dossier_id: dossierId,

transaction_id: transactionId,

timestamp: new Date().toISOString()

}));

console.error(JSON.stringify({

level: "error",

event: "PAYMENT_WEBHOOK_FAILED",

error: err.message,

stack: err.stack,

timestamp: new Date().toISOString()

}));

## 8.4 Alertes minimales a creer

- Erreur 500 detectee.
- Webhook paiement failed.
- DB connection failed.
- Backend restart detected.
- Taux d'erreur eleve.

# 9\. Scan des images Docker avec Trivy

## 9.1 Scanner une image backend

docker run --rm \\

\-v /var/run/docker.sock:/var/run/docker.sock \\

aquasec/trivy image forges-backend:latest

## 9.2 Scanner une image frontend

docker run --rm \\

\-v /var/run/docker.sock:/var/run/docker.sock \\

aquasec/trivy image forges-frontend:latest

## 9.3 Scan bloquant avant production

docker run --rm \\

\-v /var/run/docker.sock:/var/run/docker.sock \\

aquasec/trivy image \\

\--severity HIGH,CRITICAL \\

\--exit-code 1 \\

forges-backend:latest

docker run --rm \\

\-v /var/run/docker.sock:/var/run/docker.sock \\

aquasec/trivy image \\

\--severity HIGH,CRITICAL \\

\--exit-code 1 \\

forges-frontend:latest

Regle : aucune image avec vulnerabilite CRITICAL ne part en production sans decision explicite.

# 10\. Fichier docker-compose.monitoring.yml

## 10.1 Creer le fichier

nano /opt/forges/monitoring/docker-compose.monitoring.yml

## 10.2 Contenu du fichier

services:

portainer:

image: portainer/portainer-ce:latest

container_name: portainer

restart: always

ports:

\- "9443:9443"

\- "9000:9000"

volumes:

\- /var/run/docker.sock:/var/run/docker.sock

\- portainer_data:/data

uptime-kuma:

image: louislam/uptime-kuma:1

container_name: uptime-kuma

restart: always

ports:

\- "3001:3001"

volumes:

\- uptime_kuma_data:/app/data

volumes:

portainer_data:

uptime_kuma_data:

## 10.3 Lancer la stack monitoring

cd /opt/forges/monitoring

docker compose -f docker-compose.monitoring.yml up -d

## 10.4 Verifier

docker ps

# 11\. Commandes de maintenance quotidienne

## Voir les conteneurs actifs

docker ps

## Voir tous les conteneurs, meme arretes

docker ps -a

## Voir les logs backend

docker compose logs -f --tail=100 backend

## Voir les erreurs backend

docker compose logs backend | grep -E "ERROR|FATAL|Prisma|timeout|webhook"

## Voir la consommation CPU/RAM

docker stats

## Redemarrer le backend

docker compose restart backend

## Redemarrer toute la stack FORGES

docker compose down

docker compose up -d

## Nettoyer les images inutilisees

docker image prune

## Nettoyer les conteneurs arretes

docker container prune

Ne pas lancer aveuglement docker system prune -a : risque de supprimer des images utiles au rollback.

# 12\. Checklist de validation

## 12.1 Portainer

\- \[ \] Portainer accessible en HTTPS sur le port 9443.

\- \[ \] Tous les conteneurs FORGES visibles.

\- \[ \] Logs backend visibles.

\- \[ \] Restart manuel possible.

\- \[ \] Volumes visibles.

## 12.2 Uptime Kuma

\- \[ \] Monitor frontend cree.

\- \[ \] Monitor backend /api/health cree.

\- \[ \] Monitor /health cree.

\- \[ \] Alertes email ou Telegram configurees.

\- \[ \] Test d'alerte recu.

## 12.3 Sentry

\- \[ \] Projet backend cree.

\- \[ \] SENTRY_DSN ajoute au .env.production.

\- \[ \] Erreur test envoyee a Sentry.

\- \[ \] Stack trace visible.

\- \[ \] Environnement production visible.

## 12.4 Better Stack / Logtail

\- \[ \] Source logs creee.

\- \[ \] Token configure.

\- \[ \] Logs backend visibles.

\- \[ \] Recherche par ERROR possible.

\- \[ \] Alerte erreur critique configuree.

## 12.5 Trivy

\- \[ \] Scan backend lance.

\- \[ \] Scan frontend lance.

\- \[ \] Vulnerabilites CRITICAL analysees.

\- \[ \] Scan integre dans la procedure avant deploiement.

# 13\. Criteres minimum de prod surveillee

**1\.** Un conteneur down est visible dans Portainer.

**2\.** Un endpoint down declenche une alerte Uptime Kuma.

**3\.** Une erreur backend 500 remonte dans Sentry.

**4\.** Les logs backend sont consultables dans Better Stack / Logtail.

**5\.** Les images backend/frontend sont scannees avec Trivy avant deploiement.

# 14\. Elements non retenus au demarrage

| **Non retenu maintenant**   | **Raison**                                                         |
| --------------------------- | ------------------------------------------------------------------ |
| Grafana                     | Trop lourd pour une premiere prod maintenue seul.                  |
| Loki                        | Interessant plus tard pour logs self-hosted, mais pas prioritaire. |
| Prometheus                  | Utile pour metriques avancees, mais ajoute de la complexite.       |
| ELK                         | Trop lourd en ressources et maintenance.                           |
| Kubernetes                  | Inutile pour une premiere prod Docker simple.                      |
| Watchtower auto-update prod | Risque de casser la prod sans passer par staging.                  |

Raison globale : le besoin actuel est visibilite, alertes, crash reporting et securite minimale des images, pas une plateforme observability lourde.

# 15\. Procedure standard apres chaque deploiement

Apres chaque mise en production, executer :

docker ps

docker compose logs --tail=100 backend

docker compose logs --tail=100 frontend

docker stats

Puis verifier :

\- \[ \] Frontend accessible.

\- \[ \] /health retourne 200.

\- \[ \] /api/health retourne 200.

\- \[ \] Aucun crash Sentry.

\- \[ \] Aucun ERROR critique dans les logs.

\- \[ \] Aucun restart inattendu.

\- \[ \] Paiement sandbox/prod-test verifie si le deploiement touche aux paiements.

# 16\. Baseline finale retenue

Portainer CE

Uptime Kuma

Sentry

Better Stack / Logtail

Trivy

Conclusion : cette stack minimale couvre l'administration Docker, la disponibilite, les crashs applicatifs, les logs et la securite des images. Elle est suffisante pour une premiere production FORGES maintenue seul.