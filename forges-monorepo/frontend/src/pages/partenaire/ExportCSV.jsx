import { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { exportCsvPartenaire } from '../../api/partenaires.api';

function getMoisCourant() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

function getMoisOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const value = `${yyyy}-${mm}`;
    const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
}

const COLONNES = [
  'identifiant_anonymise',
  'formation_intitule',
  'activation_confirmee_le',
  'statut_acces',
  'certification_obtenue',
  'url_verification_certificat',
  'langue_formation',
];

export default function ExportCSV() {
  const [mois, setMois] = useState(getMoisCourant());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastExport, setLastExport] = useState(null);

  const moisOptions = getMoisOptions();

  const handleExport = async () => {
    setError('');
    setIsLoading(true);
    try {
      const blob = await exportCsvPartenaire(mois);
      const url = URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-partenaire-${mois}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setLastExport({ mois, at: new Date().toLocaleTimeString('fr-FR') });
    } catch (err) {
      if (err?.status === 400 || err?.statusCode === 400) {
        setError('Parametre mois invalide. Verifiez la selection.');
      } else {
        setError(err?.message || 'Impossible de generer l\'export. Reessayez.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
          Export CSV
        </p>
        <h1 className="mt-3 text-3xl font-bold text-text">Exporter mes apprenants</h1>
        <p className="mt-2 text-sm text-subtext">
          Exportez la liste de vos apprenants actifs pour un mois donne. Les donnees sont anonymisees
          — aucune information personnelle (nom, email, identifiant) n'est incluse dans le fichier.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <Card>
          <div className="space-y-5">
            <div>
              <label htmlFor="mois-select" className="block text-sm font-semibold text-text">
                Periode
              </label>
              <p className="mt-0.5 text-xs text-subtext">Selectionnez le mois a exporter</p>
              <select
                id="mois-select"
                value={mois}
                onChange={(e) => setMois(e.target.value)}
                className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                data-testid="select-mois"
              >
                {moisOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            {lastExport && !error && (
              <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                Export {lastExport.mois} telecharge a {lastExport.at}
              </div>
            )}

            <Button
              onClick={handleExport}
              disabled={isLoading}
              className="w-full"
              data-testid="btn-exporter"
            >
              {isLoading ? 'Generation en cours...' : 'Telecharger le CSV'}
            </Button>
          </div>
        </Card>

        <Card className="md:w-64">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-text">Colonnes incluses</p>
            <ul className="space-y-1.5">
              {COLONNES.map((col) => (
                <li key={col} className="flex items-center gap-2 text-xs text-subtext">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                  {col}
                </li>
              ))}
            </ul>
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-text">Donnees exclues</p>
              <p className="mt-1 text-xs text-subtext">
                Nom, prenom, email, telephone, identifiant legal, ID apprenant, credentials de formation.
              </p>
            </div>
            <div className="rounded-lg bg-primary/5 px-3 py-2">
              <p className="text-xs text-primary">
                Les identifiants sont anonymises via HMAC-SHA256 — stables mais irreversibles.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
