import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import utilisateursApi from '../../../api/utilisateurs.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const ROLE_DESCRIPTIONS = {
  SUPERVISEUR: 'Supervise l\'ensemble des activités : formations, sessions, dossiers, organisations, tableaux de bord analytiques et reversements.',
  AGENT: 'Gère la partie financière et commerciale : devis, factures, paiements et reversements partenaires.',
  RESPONSABLE: 'Valide les dossiers apprenants en attente et les formations soumises par les partenaires.',
  GESTIONNAIRE: 'Gère les opérations courantes : formations, sessions et suivi apprenants.',
};

const INITIAL_FORM = { email: '', nom: '', prenoms: '', role: 'SUPERVISEUR' };

export default function CreateUtilisateur() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { execute, isLoading } = useApi();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [created, setCreated] = useState(null);

  const handleChange = (field) => (e) =>
    setFormData((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    await execute(() => utilisateursApi.create(formData), {
      onSuccess: (data) => {
        showToast(`Compte ${formData.role} créé. Un email avec les identifiants a été envoyé.`, 'success');
        setCreated({ ...data, role: formData.role, email: formData.email, nom: formData.nom, prenoms: formData.prenoms });
      },
    });
  };

  if (created) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-xl bg-white p-8 shadow-lg text-center space-y-6">
          <div className="w-14 h-14 mx-auto rounded-full bg-green-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-primary">Compte créé</h2>
            <p className="mt-1 text-sm text-subtext">{created.prenoms} {created.nom} — {created.role}</p>
          </div>
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-left text-sm space-y-1">
            <p><span className="text-subtext">Email :</span> <strong>{created.email}</strong></p>
            <p className="text-subtext text-xs">Un email avec le mot de passe temporaire et la description du rôle a été envoyé automatiquement.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button onClick={() => { setCreated(null); setFormData(INITIAL_FORM); }} className="w-full">
              Créer un autre utilisateur
            </Button>
            <Button variant="outline" onClick={() => navigate('/backoffice/utilisateurs')} className="w-full">
              Retour à la liste
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">Administration</p>
            <h2 className="mt-3 text-2xl font-semibold text-primary">Créer un utilisateur backoffice</h2>
            <p className="mt-2 text-subtext">Un email avec les identifiants et la description du rôle sera envoyé automatiquement.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/backoffice/utilisateurs')}>Retour</Button>
        </div>
      </div>

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Prénom(s)"
              value={formData.prenoms}
              onChange={handleChange('prenoms')}
              data-testid="input-prenoms"
              required
            />
            <Input
              label="Nom"
              value={formData.nom}
              onChange={handleChange('nom')}
              data-testid="input-nom"
              required
            />
          </div>

          <Input
            type="email"
            label="Email"
            value={formData.email}
            onChange={handleChange('email')}
            data-testid="input-email"
            required
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Rôle</label>
            <select
              value={formData.role}
              onChange={handleChange('role')}
              data-testid="select-role"
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text"
              required
            >
              <option value="SUPERVISEUR">Superviseur</option>
              <option value="AGENT">Agent comptable</option>
              <option value="RESPONSABLE">Responsable pédagogique</option>
              <option value="GESTIONNAIRE">Gestionnaire</option>
            </select>
          </div>

          {formData.role && ROLE_DESCRIPTIONS[formData.role] && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-text">
              <p className="font-medium text-primary mb-1">{formData.role === 'AGENT' ? 'Agent comptable' : formData.role.charAt(0) + formData.role.slice(1).toLowerCase()}</p>
              <p className="text-subtext">{ROLE_DESCRIPTIONS[formData.role]}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate('/backoffice/utilisateurs')}>
              Annuler
            </Button>
            <Button type="submit" loading={isLoading} data-testid="btn-submit-utilisateur">
              Créer le compte
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
