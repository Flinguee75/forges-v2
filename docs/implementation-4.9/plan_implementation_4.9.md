



prisma/schema.prisma
model Devis {
id              String        @id @default(uuid())
numero_devis    String        @unique
organisation_id String
formation_id    String
session_id      String?
nb_places       Int
tarif_unitaire_xof Decimal   @db.Decimal(12,2)
montant_total_xof Decimal   @db.Decimal(12,2)
statut          StatutDevis  @default(CREE)
notes_admin     String?
paid_at         DateTime?
cancelled_at    DateTime?
created_by      String
created_at      DateTime     @default(now())
## }
model Paiement {
// champs existants...
payment_token_ngser String?
order_ngser         String?  @unique
montant_initie      Decimal? @db.Decimal(12,2)
## }
model FormationPartenaire {
// champs existants...
url_certificat_partenaire String?
activation_confirmee_le   DateTime?
ratio_online_pct          Int?
## }
enum StatutDevis {
## CREE
## PAYE
## ANNULE
## }
npx prisma migrate dev --name add_devis_ngser_export

backend/src/modules/
devis/devis.service.js
devis/devis.controller.js
devis/devis.routes.js
paiements/paiement-ngser.service.js
paiements/ipn.controller.js
partenaires/export-csv.service.js
partenaires/proxy-acces.service.js
backend/src/app.jsserver.js
const devisRoutes = require('./modules/devis/devis.routes');
const paiementRoutes = require('./modules/paiements/paiement.routes');
const partenaireRoutes = require('./modules/partenaires/partenaire.routes');
app.use('/api/admin/devis', devisRoutes);
app.use('/api/paiements', paiementRoutes);
app.use('/api/partenaire', partenaireRoutes);
## .env
## COMMISSION_FORGES_DEFAULT_PCT=30
HMAC_ANONYMISATION_SEL=un_sel_secret_64chars
NGSER_BASE_URL=https://securetest.crossroad-africa.net/
NGSER_AUTH_TOKEN=votre_token_sandbox
NGSER_OPERATION_TOKEN_PAIEMENT=votre_token_operation
NGSER_NOTIFICATION_URL=https://api.forges-group.com/webhooks/paiement
## NGSER_RECONCILIATION_PENDING_MINUTES=30

frontend/src/
pages/DevisForm.jsx
pages/ReconciliationExport.jsx
components/BotWidget.jsx
pages/NGSERPayment.jsx
## App.jsx
export const devisApi = {
creer: (data) => api.post('/admin/devis', data),
marquerPaye: (id) => api.put(`/admin/devis/${id}/paye`),
annuler: (id) => api.put(`/admin/devis/${id}/annuler`)
## };
export const paiementApi = {
initierNGSER: (dossierId) => api.post('/paiements/initier', { dossier_id:
## };
export const partenaireApi = {
exportCSV: (mois) => api.get('/partenaire/export-csv', { params: { mois },
## };
npm install --save-dev jest supertest @testing-library/react vitest

tests/unit/devis.service.test.js
tests/unit/paiement-ngser.service.test.js→
tests/integration/export-csv.test.js
tests/frontend/ReconciliationExport.test.jsx
npm run testnpm test
## ✔/api/docs
✔POST /api/paiements/initier
## ✔
## ✔
## ✔
## ✔