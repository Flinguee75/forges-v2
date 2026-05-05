import { useState } from 'react';
import { dashboardApi } from '../../../api/dashboard.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ExportPage() {
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleExport = async (format) => {
    setError('');
    setSuccess('');

    try {
      if (format === 'csv') {
        setIsExportingCsv(true);
        const blob = await dashboardApi.exportRapportCSV();
        triggerDownload(blob, 'rapport_forges.csv');
        setSuccess('Export CSV téléchargé');
      } else {
        setIsExportingPdf(true);
        const blob = await dashboardApi.exportRapportPDF();
        triggerDownload(blob, 'rapport_forges.pdf');
        setSuccess('Export PDF téléchargé');
      }
    } catch (caught) {
      setError(caught?.message || 'Export impossible');
    } finally {
      setIsExportingCsv(false);
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-primary">Export de Rapports</h1>
        <p className="mt-2 text-subtext">
          Exportez les données de la plateforme au format CSV ou PDF.
        </p>
      </div>

      <Card title="Exports" bodyClassName="space-y-4">
        <p className="text-sm text-subtext">
          Les fichiers sont téléchargés directement dans votre navigateur.
        </p>

        {error ? (
          <div className="rounded-lg border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-lg border border-success/20 bg-success/10 p-4 text-sm text-success">
            {success}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button loading={isExportingCsv} onClick={() => handleExport('csv')}>
            Export CSV
          </Button>
          <Button variant="outline" loading={isExportingPdf} onClick={() => handleExport('pdf')}>
            Export PDF
          </Button>
        </div>
      </Card>
    </div>
  );
}
