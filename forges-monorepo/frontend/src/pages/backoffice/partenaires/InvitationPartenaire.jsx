import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import partenairesApi from '../../../api/partenaires.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const INITIAL_FORM = {
  raison_sociale: '',
  type: 'AUTRE',
  email: '',
  commission_forges_pct: 20,
};

export default function InvitationPartenaire() {
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const { showToast } = useToast();

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [inviteResult, setInviteResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: '' }));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.raison_sociale.trim()) {
      nextErrors.raison_sociale = 'La raison sociale est obligatoire';
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'L\'email est obligatoire';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = 'Format d\'email invalide';
    }

    if (!Number.isInteger(Number(formData.commission_forges_pct))) {
      nextErrors.commission_forges_pct = 'Le pourcentage doit être un entier';
    } else if (Number(formData.commission_forges_pct) < 0 || Number(formData.commission_forges_pct) > 100) {
      nextErrors.commission_forges_pct = 'Le pourcentage doit être compris entre 0 et 100';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setErrors({});
    setInviteResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      showToast('Veuillez corriger les erreurs du formulaire', 'error');
      return;
    }

    await execute(
      () =>
        partenairesApi.inviterPartenaire({
          raison_sociale: formData.raison_sociale,
          type: formData.type,
          email: formData.email,
          commission_forges_pct: Number(formData.commission_forges_pct),
        }),
      {
        onSuccess: (data) => {
          setInviteResult({
            partenaire_id: data?.partenaire_id || data?.id || '',
            message: data?.message || 'Invitation envoyée',
          });
          setFormData(INITIAL_FORM);
          showToast('Invitation envoyée avec succès.', 'success');
        },
      }
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
              Flux A: Invitation
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">
              Inviter un partenaire fournisseur
            </h2>
            <p className="mt-2 text-subtext">
              Le partenaire recevra un email d&apos;invitation avec un lien valable 48h pour finaliser son inscription.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/backoffice/dashboard')}>
            Retour
          </Button>
        </div>
      </div>

      {inviteResult && (
        <Card className="mb-6" bodyClassName="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-success">
              Invitation transmise
            </p>
            <h3 className="mt-2 text-xl font-semibold text-text">
              Le partenaire peut maintenant activer son compte
            </h3>
          </div>
          <div className="rounded-lg border border-border bg-[var(--color-bg)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-subtext">Partenaire ID</p>
            <p className="mt-1 break-all font-mono text-sm text-text">{inviteResult.partenaire_id || 'N/A'}</p>
            <p className="mt-3 text-sm text-[var(--color-subtext)]">{inviteResult.message}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" onClick={resetForm}>
              Nouvelle invitation
            </Button>
            <Button variant="outline" onClick={() => navigate('/backoffice/dashboard')}>
              Retour au backoffice
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="invitation-partenaire-raison-sociale" className="mb-2 block text-sm font-medium text-text">
                Raison sociale <span className="text-danger">*</span>
              </label>
              <Input
                id="invitation-partenaire-raison-sociale"
                name="raison_sociale"
                value={formData.raison_sociale}
                onChange={handleChange}
                placeholder="Ex: Université de Dakar"
                disabled={isLoading}
              />
              {errors.raison_sociale && (
                <p className="mt-1 text-sm text-danger">{errors.raison_sociale}</p>
              )}
            </div>

            <div>
              <label htmlFor="invitation-partenaire-email" className="mb-2 block text-sm font-medium text-text">
                Email professionnel <span className="text-danger">*</span>
              </label>
              <Input
                id="invitation-partenaire-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="contact@partenaire.com"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-danger">{errors.email}</p>
              )}
              <p className="mt-1 text-xs text-subtext">
                L&apos;invitation sera envoyée à cette adresse email.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="invitation-partenaire-type" className="mb-2 block text-sm font-medium text-text">
                Type de partenaire <span className="text-danger">*</span>
              </label>
              <select
                id="invitation-partenaire-type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                disabled={isLoading}
                className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none disabled:bg-gray-100"
              >
                <option value="UNIVERSITE">Université</option>
                <option value="ENTREPRISE_FORMATION">Entreprise de formation</option>
                <option value="ONG">ONG</option>
                <option value="INSTITUTION">Institution</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>

            <div>
              <label htmlFor="invitation-partenaire-commission" className="mb-2 block text-sm font-medium text-text">
                Commission FORGES (%) <span className="text-danger">*</span>
              </label>
              <Input
                id="invitation-partenaire-commission"
                type="number"
                name="commission_forges_pct"
                value={formData.commission_forges_pct}
                onChange={handleChange}
                placeholder="20"
                min="0"
                max="100"
                step="1"
                disabled={isLoading}
              />
              {errors.commission_forges_pct && (
                <p className="mt-1 text-sm text-danger">{errors.commission_forges_pct}</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-gray-50 p-4 text-sm text-subtext">
            Les champs obligatoires sont : raison sociale, type, email et commission FORGES.
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={isLoading}
            >
              Réinitialiser
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/backoffice/dashboard')}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
            >
              {isLoading ? 'Envoi en cours...' : 'Envoyer l\'invitation'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
