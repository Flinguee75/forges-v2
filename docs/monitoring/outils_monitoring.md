FORGES - Formules gratuit/payant et stratégie de scaling

Maintenance et monitoring Docker en production

_Version opérationnelle - Mai 2026_

**Décision recommandée**

**Démarrer avec une stack quasi gratuite : Portainer CE + Uptime Kuma + Trivy + Sentry Developer + Better Stack Free.** Puis payer en priorité Sentry et Better Stack dès que FORGES traite des vrais paiements, reçoit du trafic réel, ou nécessite une rétention de logs supérieure à quelques jours.

# 1\. Stack retenue et logique financière

Le but n'est pas de payer dès le premier jour. Le but est de ne pas confondre économie et aveuglement opérationnel. La stack gratuite suffit pour observer une première prod, mais elle devient insuffisante dès que le volume, les paiements et le nombre d'intervenants augmentent.

| **Outil**              | **Rôle FORGES**                                                                                               | **Formule gratuite**                                                                                   | **Formule payante / quand payer**                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Portainer CE           | Interface Docker : conteneurs, images, volumes, réseaux, logs rapides, restart manuel.                        | Portainer CE est le choix de départ : gratuit/open-source, suffisant pour un VPS ou une petite équipe. | Portainer Business si plusieurs noeuds, besoin de RBAC avancé, support officiel, gestion multi-environnements ou gouvernance plus stricte.                                                                                  |
| Uptime Kuma            | Surveillance disponibilité : frontend, backend, /health, /api/health, certificat SSL.                         | Gratuit et self-hosted. Suffisant pour alerter si le site ou l'API tombe.                              | Pas besoin de payer au départ. Scale possible vers service externe si besoin de SLA externe, multi-région, ou astreinte avancée.                                                                                            |
| Sentry                 | Crash reporting applicatif : erreurs 500, stack traces, routes cassées, exceptions Prisma, webhooks paiement. | Developer plan : \$0, 1 utilisateur, error monitoring/tracing, alertes email.                          | Team à partir d'environ \$26/mois ; Business à partir d'environ \$80/mois. Payer quand plusieurs devs doivent diagnostiquer, quand les erreurs dépassent le quota gratuit ou quand les intégrations deviennent nécessaires. |
| Better Stack / Logtail | Logs centralisés : recherche dans les logs, alertes sur mots-clés, incidents, live tail.                      | Offre gratuite utile pour démarrer : volume limité et rétention courte.                                | Nano autour de \$25-\$30/mois pour plus de volume et de rétention. Monter ensuite selon le volume de logs, les traces, les métriques et la rétention souhaitée.                                                             |
| Trivy                  | Scan sécurité des images Docker : vulnérabilités CVE, misconfigurations, secrets, SBOM.                       | Open-source, utilisable gratuitement en CLI ou Docker.                                                 | Pas besoin de payer au départ. Scale possible vers plateforme sécurité plus complète si besoin de gouvernance, historique, policies, reporting ou conformité.                                                               |

# 2\. Formules recommandées

| **Formule**                        | **Budget indicatif**                                                | **Composition**                                                                                             | **À utiliser quand**                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Formule A - Démarrage contrôlé     | 0 \$/mois possible                                                  | Portainer CE, Uptime Kuma, Trivy, Sentry Developer, Better Stack Free.                                      | Mise en prod initiale, faible trafic, un seul mainteneur, peu de logs, pas encore de forte criticité commerciale.                         |
| Formule B - Prod sérieuse minimale | Environ 25 à 60 \$/mois                                             | Stack A + Better Stack Nano et/ou Sentry Team.                                                              | Premiers vrais utilisateurs, paiements actifs, besoin de conserver les logs, besoin d'alerter proprement, plusieurs personnes impliquées. |
| Formule C - Scaling opérationnel   | Environ 100 à 250+ \$/mois                                          | Sentry Business ou quota augmenté, Better Stack Micro/Nano selon volume, éventuellement Portainer Business. | Trafic régulier, incidents à historiser, support client, astreinte, plusieurs serveurs ou obligation de diagnostic rapide.                |
| Formule D - Observabilité mature   | Variable, souvent 250+ \$/mois ou self-hosted plus coûteux en temps | Stack dédiée type Grafana/Loki/Prometheus/Alertmanager ou plateforme observabilité complète.                | Plusieurs environnements, forte charge, exigences SLA, reporting direction, besoin de métriques DB/API détaillées.                        |

# 3\. Pourquoi on devra probablement scaler ensuite

- **Volume de logs :** Au début, quelques logs suffisent. Avec des utilisateurs réels, les logs backend, paiement, auth, scheduler et DB grossissent vite. Une rétention de 3 jours peut devenir insuffisante pour enquêter sur un incident déclaré tardivement.
- **Paiements et webhooks :** FORGES a des flux sensibles : inscription, dossier, paiement, webhook, commission. Un bug silencieux peut coûter plus cher qu'un outil payant de monitoring.
- **Diagnostic en équipe :** Un plan gratuit limité à un utilisateur devient vite un blocage si plusieurs devs, testeurs ou ops doivent accéder aux erreurs et aux incidents.
- **Historique et audit :** Quand un client signale "j'ai payé mais mon dossier n'est pas à jour", il faut retrouver l'événement précis : requête, timestamp, transaction, statut, erreur éventuelle.
- **Rétention :** La prod ne se diagnostique pas uniquement en temps réel. Il faut pouvoir revenir plusieurs jours ou semaines en arrière, surtout pour les paiements, les abonnements et les dossiers.
- **Astreinte et alertes :** Au départ, un email suffit. Ensuite il faut des alertes fiables : down API, erreurs 500, DB inaccessible, webhook failed, latence anormale.
- **Multi-serveur :** Une seule VM est simple. Dès que le backend, la DB, Redis ou les workers sont séparés, une interface Docker locale ne suffit plus à comprendre tout le système.

# 4\. Seuils de passage gratuit -> payant

| **Signal observé**                                       | **Risque**                                                  | **Action recommandée**                                       |
| -------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| Plusieurs personnes doivent accéder aux erreurs          | Le diagnostic dépend d'une seule personne.                  | Passer Sentry de Developer à Team.                           |
| Logs dépassent le quota gratuit ou rétention trop courte | Impossible d'enquêter correctement après coup.              | Passer Better Stack à Nano ou équivalent.                    |
| Premiers paiements réels activés                         | Un incident paiement non détecté devient coûteux.           | Activer Sentry sérieusement + logs centralisés avec alertes. |
| Erreurs 500 récurrentes                                  | L'équipe découvre les bugs via les utilisateurs.            | Configurer alertes Sentry et seuils d'erreur.                |
| Webhook paiement échoue ou prend du retard               | Dossiers incohérents, double traitement, support manuel.    | Créer alerte dédiée "PAYMENT_WEBHOOK_FAILED".                |
| Besoin de remonter > 3 jours dans les logs               | Rétention gratuite insuffisante.                            | Payer pour plus de rétention et volume.                      |
| Plusieurs VPS/noeuds Docker                              | Portainer CE/local devient insuffisant pour la gouvernance. | Évaluer Portainer Business ou stack ops plus robuste.        |
| Clients réels + obligations de disponibilité             | Le coût d'un incident dépasse le coût outil.                | Budget mensuel monitoring à sanctuariser.                    |

# 5\. Budget cible par phase

| **Phase**                 | **Objectif**                                                     | **Budget cible**   | **Décision**                                                       |
| ------------------------- | ---------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------ |
| Avant prod / staging      | Vérifier que tout fonctionne et que les alertes de base partent. | 0 \$/mois          | Self-hosted + plans gratuits.                                      |
| Première prod             | Voir les crashs, endpoints down, logs critiques.                 | 0 à 30 \$/mois     | Payer Better Stack ou Sentry uniquement si le gratuit bloque déjà. |
| Prod avec paiements réels | Réduire le risque de bug silencieux sur dossiers/paiements.      | 25 à 60 \$/mois    | Sentry Team ou Better Stack Nano devient justifiable.              |
| Croissance                | Améliorer rétention, collaboration, alertes, diagnostic.         | 100 à 250+ \$/mois | Adapter aux volumes réels, pas aux suppositions.                   |

# 6\. Décision opérationnelle FORGES

La bonne décision n'est pas "tout gratuit pour toujours". La bonne décision est : gratuit tant que le risque est faible, payant dès que le coût d'un incident dépasse le coût de l'outil.

Décision de départ :  
\- Portainer CE : gratuit, obligatoire  
\- Uptime Kuma : gratuit, obligatoire  
\- Trivy : gratuit, obligatoire avant déploiement  
\- Sentry Developer : gratuit au début, à scaler en Team si plusieurs intervenants ou erreurs récurrentes  
\- Better Stack Free : acceptable au début, à scaler dès que la rétention/volume devient insuffisante

**Point critique :** ne pas attendre une panne de paiement pour payer un outil de logs ou d'erreurs. La surveillance doit précéder les incidents, pas les suivre.

# 7\. Règle de gouvernance recommandée

| **Question**                                                             | **Réponse attendue avant de rester gratuit**   |
| ------------------------------------------------------------------------ | ---------------------------------------------- |
| Peut-on savoir en moins de 5 minutes pourquoi le backend a crashé ?      | Oui, via Sentry ou logs centralisés.           |
| Peut-on savoir si /api/health tombe ?                                    | Oui, via Uptime Kuma.                          |
| Peut-on retrouver un webhook paiement échoué datant de plusieurs jours ? | Si non, il faut augmenter la rétention logs.   |
| Peut-on scanner l'image backend avant prod ?                             | Oui, via Trivy.                                |
| Peut-on auditer un incident client sans accès direct au serveur ?        | Si non, il faut améliorer Sentry/Better Stack. |

# 8\. Sources et repères prix

Les prix sont des repères observés sur les pages officielles en mai 2026. Ils doivent être revérifiés avant achat ou engagement annuel.

| **Outil**    | **Source officielle consultée**    | **Information utilisée**                                                      |
| ------------ | ---------------------------------- | ----------------------------------------------------------------------------- |
| Portainer    | <https://www.portainer.io/pricing> | Portainer CE / Business Edition, notion de noeuds et support.                 |
| Uptime Kuma  | <https://uptimekuma.org/>          | Outil de monitoring self-hosted open-source et gratuit.                       |
| Trivy        | <https://trivy.dev/>               | Scanner open-source pour images conteneurs, IaC, SBOM, Kubernetes.            |
| Sentry       | <https://sentry.io/pricing/>       | Developer \$0, Team autour de \$26/mois, Business autour de \$80/mois.        |
| Better Stack | <https://betterstack.com/pricing>  | Offre logs/traces incluse avec volume limité, bundles payants Nano/Micro/etc. |