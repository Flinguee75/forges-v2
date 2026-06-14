import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import apporteursApi from '../../../api/apporteurs.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const INITIAL_FORM = {
  nom: '',
  type: 'INDIVIDU',
  email: '',
  taux_commission_pct: 5,
  langue_preferee: 'FR',
};

export default function CreateApporteur() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { execute, isLoading, error } = useApi();

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [creationResult, setCreationResult] = useState(null);

  const handleFieldChange = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
    setFieldErrors((current) => ({
      ...current,
      [field]: '',
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.nom.trim()) {
      nextErrors.nom = 'Le nom est obligatoire.';
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'L’email est obligatoire.';
    }

    if (!Number.isInteger(Number(formData.taux_commission_pct))) {
      nextErrors.taux_commission_pct = 'Le taux doit être un entier.';
    } else if (Number(formData.taux_commission_pct) < 0 || Number(formData.taux_commission_pct) > 100) {
      nextErrors.taux_commission_pct = 'Le taux doit être compris entre 0 et 100.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setFieldErrors({});
    setCreationResult(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const payload = {
      nom: formData.nom.trim(),
      type: formData.type,
      email: formData.email.trim(),
      taux_commission_pct: Number(formData.taux_commission_pct),
      langue_preferee: formData.langue_preferee,
    };

    await execute(
      () => apporteursApi.createApporteur(payload),
      {
        onSuccess: (data) => {
          const apporteurId = data?.apporteur_id || data?.id || data?.apporteur?.id || '';
          const codeApporteur = data?.code_apporteur || data?.apporteur?.code_apporteur || '';

          setCreationResult({
            apporteur_id: apporteurId,
            code_apporteur: codeApporteur,
          });
          setFormData(INITIAL_FORM);

          showToast('Apporteur créé avec succès.', 'success');
        },
      }
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
              Création Admin
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">
              Nouvel apporteur
            </h2>
            <p className="mt-2 text-subtext">
              Renseignez les informations du nouvel apporteur.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/backoffice/dashboard')}>
            Retour
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {creationResult && (
        <Card className="mb-6" bodyClassName="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-success">
              Création réussie
            </p>
            <h3 className="mt-2 text-xl font-semibold text-text">
              L&apos;apporteur a été créé et activé
            </h3>
          </div>
          <div className="grid gap-4 rounded-lg border border-border bg-[var(--color-bg)] p-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-subtext">ID apporteur</p>
              <p className="mt-1 break-all text-sm text-text">{creationResult.apporteur_id || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-subtext">Code apporteur</p>
              <p className="mt-1 break-all font-mono text-sm text-text">{creationResult.code_apporteur || 'N/A'}</p>
            </div>
          </div>
          <p className="text-sm text-[var(--color-subtext)]">
            Le code a été généré côté backend et transmis par email à l&apos;apporteur.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" onClick={resetForm}>
              Créer un autre apporteur
            </Button>
            <Button variant="outline" onClick={() => navigate('/backoffice/dashboard')}>
              Retour au backoffice
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            label="Nom"
            value={formData.nom}
            onChange={(event) => handleFieldChange('nom', event.target.value)}
            error={fieldErrors.nom}
            required
          />

          <div>
            <label htmlFor="apporteur-type" className="mb-1.5 block text-sm font-medium text-text">
              Type
            </label>
            <select
              id="apporteur-type"
              value={formData.type}
              onChange={(event) => handleFieldChange('type', event.target.value)}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="INDIVIDU">Individu</option>
              <option value="ORGANISATION">Organisation</option>
            </select>
          </div>

          <Input
            type="email"
            label="Email"
            value={formData.email}
            onChange={(event) => handleFieldChange('email', event.target.value)}
            error={fieldErrors.email}
            required
          />

          <Input
            type="number"
            label="Taux de commission (%)"
            value={formData.taux_commission_pct}
            onChange={(event) => handleFieldChange('taux_commission_pct', event.target.value)}
            error={fieldErrors.taux_commission_pct}
            min="0"
            max="100"
            step="1"
            required
          />

          <div>
            <label htmlFor="apporteur-langue" className="mb-1.5 block text-sm font-medium text-text">
              Langue préférée
            </label>
            <select
              id="apporteur-langue"
              value={formData.langue_preferee}
              onChange={(event) => handleFieldChange('langue_preferee', event.target.value)}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="FR">Français</option>
              <option value="EN">Anglais</option>
              <option value="ES">Espagnol</option>
              <option value="PT">Portugais</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => navigate('/backoffice/dashboard')}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" loading={isLoading}>
              Créer l&apos;apporteur
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
