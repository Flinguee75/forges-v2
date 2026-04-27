# FORGES - Plateforme d'agrégation de formations certifiantes

## Prérequis
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16, Redis 7

## Installation
1. Cloner le dépôt
2. `cd backend && npm install && npx prisma migrate dev --name init && npm run seed`
3. `cd ../frontend && npm install`
4. Lancer les services Docker: `docker-compose -f infra/docker-compose.yml up -d`
5. Démarrer backend: `npm run dev` (port 3000)
6. Démarrer frontend: `npm run dev` (port 5173)

## Déploiement multi-environnements
- `./infra/scripts/deploy.sh dev` (environnement de développement)
- `./infra/scripts/deploy.sh test` (test)
- `./infra/scripts/deploy.sh demo` (démonstration)

## Tests
- Unitaires: `npm run test` (backend)
- Intégration: `npm run test:integration`
- E2E local: `cd frontend && npm run test:e2e`

## Documentation API
Lancer le backend puis accéder à `/api/docs` (Swagger)

## Licence
Propriétaire – GIE FORGES
