import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { organisationsApi } from '../../../api/organisations.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';

const DEFAULT_FORM = {
  raison_sociale: '',
  email: '',
  type: 'ENTREPRISE',
  contact_referent: '',
  pays: 'CI',
  langue_preferee: 'FR',
  identifiant_legal: '',
};

export default function OrganisationCreate() {
  const navigate = useNavigate();
  const { execute, isLoading, error } = useApi();
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [successPayload, setSuccessPayload] = useState(null);

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: '' }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.raison_sociale.trim()) nextErrors.raison_sociale = 'La raison sociale est obligatoire.';
    if (!formData.email.trim()) nextErrors.email = "L'email est obligatoire.";
    if (!formData.contact_referent.trim()) nextErrors.contact_referent = 'Le contact référent est obligatoire.';
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      raison_sociale: formData.raison_sociale.trim(),
      email: formData.email.trim(),
      type: formData.type,
      contact_referent: formData.contact_referent.trim(),
      pays: formData.pays,
      langue_preferee: formData.langue_preferee,
      identifiant_legal: formData.identifiant_legal.trim() || undefined,
    };

    await execute(() => organisationsApi.create(payload), {
      onSuccess: (response) => {
        const created = response?.data || response;
        setSuccessPayload({
          id: created.id,
          email: created.email || payload.email,
          raison_sociale: created.raison_sociale || payload.raison_sociale,
          type: created.type || payload.type,
          contact_referent: created.contact_referent || payload.contact_referent,
          pays: created.pays || payload.pays,
          identifiant_legal: created.identifiant_legal || payload.identifiant_legal || '',
        });
      },
    });
  };

  const selectClass = 'w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
          Backoffice
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-primary">
          Créer une organisation
        </h2>
        <p className="mt-2 text-subtext">
          Création manuelle d'un compte organisation.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <Card>
        <form className="space-y-6" onSubmit={handleSubmit} data-testid="form-creer-organisation">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Raison sociale"
              value={formData.raison_sociale}
              onChange={(e) => handleChange('raison_sociale', e.target.value)}
              error={fieldErrors.raison_sociale}
              required
            />
            <Input
              type="email"
              label="Email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={fieldErrors.email}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">Type</label>
              <select
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className={selectClass}
              >
                <option value="ENTREPRISE">Entreprise</option>
                <option value="GOUVERNEMENT">Gouvernement</option>
                <option value="ONG">ONG</option>
                <option value="INSTITUTION">Institution</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
            <Input
              label="Contact référent"
              value={formData.contact_referent}
              onChange={(e) => handleChange('contact_referent', e.target.value)}
              error={fieldErrors.contact_referent}
              placeholder="Nom du responsable principal"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">Pays</label>
              <select
                value={formData.pays}
                onChange={(e) => handleChange('pays', e.target.value)}
                className={selectClass}
              >
                <option value="CI">Côte d'Ivoire</option>
                <option value="SN">Sénégal</option>
                <option value="CM">Cameroun</option>
                <option value="BF">Burkina Faso</option>
                <option value="ML">Mali</option>
                <option value="GN">Guinée</option>
                <option value="TG">Togo</option>
                <option value="BJ">Bénin</option>
                <option value="FR">France</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">Langue</label>
              <select
                value={formData.langue_preferee}
                onChange={(e) => handleChange('langue_preferee', e.target.value)}
                className={selectClass}
              >
                <option value="FR">Français</option>
                <option value="EN">Anglais</option>
              </select>
            </div>
          </div>

          <Input
            label="Identifiant légal"
            value={formData.identifiant_legal}
            onChange={(e) => handleChange('identifiant_legal', e.target.value)}
            placeholder="RCCM, NIF, numéro d'enregistrement..."
          />

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/backoffice/organisations')}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" loading={isLoading}>
              Créer l'organisation
            </Button>
          </div>
        </form>
      </Card>

      <Modal
        isOpen={Boolean(successPayload)}
        onClose={() => setSuccessPayload(null)}
        title="Organisation créée"
        size="large"
        footer={(
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" onClick={() => setSuccessPayload(null)}>
              Fermer
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/backoffice/organisations')}
            >
              Retour à la liste
            </Button>
            <Button onClick={() => navigate(`/backoffice/organisations/${successPayload?.id}`)}>
              Voir l’organisation
            </Button>
          </div>
        )}
      >
        {successPayload && (
          <div className="space-y-5">
            <p className="text-sm text-text">
              Compte organisation créé. Un email de confirmation a été envoyé à{' '}
              <strong>{successPayload.email}</strong>.
            </p>

            <div className="rounded-lg border border-border bg-bg p-4">
              <p className="text-sm font-semibold text-primary">Si l’email n’a pas été reçu</p>
              <p className="mt-2 text-sm text-subtext">
                Transmettre les informations suivantes au support ou à l’équipe concernée :
              </p>
              <ul className="mt-3 space-y-2 text-sm text-text">
                <li><strong>Raison sociale :</strong> {successPayload.raison_sociale}</li>
                <li><strong>Email :</strong> {successPayload.email}</li>
                <li><strong>Type :</strong> {successPayload.type}</li>
                <li><strong>Contact référent :</strong> {successPayload.contact_referent}</li>
                <li><strong>Pays :</strong> {successPayload.pays}</li>
                {successPayload.identifiant_legal && (
                  <li><strong>Identifiant légal :</strong> {successPayload.identifiant_legal}</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
