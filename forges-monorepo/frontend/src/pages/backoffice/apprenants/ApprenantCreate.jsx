import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import { apprenantsApi } from '../../../api/apprenants.api';
import { organisationsApi } from '../../../api/organisations.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

export default function ApprenantCreate() {
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const { showToast } = useToast();

  const [organisations, setOrganisations] = useState([]);
  const [form, setForm] = useState({
    email: '',
    nom: '',
    prenoms: '',
    type_apprenant: 'PROFESSIONNEL',
    secteur_activite: '',
    niveau_etude: '',
    pays_residence: 'CI',
    pays_nationalite: 'CI',
    langue_preferee: 'FR',
    organisation_id: '',
    mot_de_passe_temp: '',
  });
  const [errors, setErrors] = useState({});
  const [credentials, setCredentials] = useState(null);

  useEffect(() => {
    organisationsApi.getAll({ limit: 100 })
      .then(res => {
        const items = res?.data?.data || res?.data || [];
        setOrganisations(Array.isArray(items) ? items : []);
      })
      .catch(() => {});
  }, []);

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email obligatoire';
    if (!form.nom) e.nom = 'Nom obligatoire';
    if (!form.prenoms) e.prenoms = 'Prenoms obligatoires';
    if (form.type_apprenant === 'PROFESSIONNEL' && !form.secteur_activite) {
      e.secteur_activite = 'Secteur obligatoire pour un professionnel';
    }
    if (form.type_apprenant === 'APPRENANT' && !form.niveau_etude) {
      e.niveau_etude = "Niveau d'etude obligatoire";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    await execute(
      () => apprenantsApi.create({
        email: form.email,
        nom: form.nom,
        prenoms: form.prenoms,
        type_apprenant: form.type_apprenant,
        secteur_activite: form.secteur_activite || undefined,
        niveau_etude: form.niveau_etude || undefined,
        pays_residence: form.pays_residence,
        pays_nationalite: form.pays_nationalite,
        langue_preferee: form.langue_preferee,
        organisation_id: form.organisation_id || undefined,
        mot_de_passe_temp: form.mot_de_passe_temp || undefined,
      }),
      {
        onSuccess: (data) => {
          const apprenant = data?.data ?? data;
          setCredentials({
            email: apprenant.email,
            mot_de_passe_temp: apprenant.mot_de_passe_temp,
            id: apprenant.id,
          });
          showToast('Compte apprenant cree avec succes.', 'success');
        },
        onError: (err) => {
          const code = err?.response?.data?.error;
          if (code === 'EMAIL_ALREADY_EXISTS') {
            setErrors(prev => ({ ...prev, email: 'Cet email est deja utilise' }));
          } else if (code === 'ORGANISATION_NOT_FOUND') {
            setErrors(prev => ({ ...prev, organisation_id: 'Organisation introuvable' }));
          } else {
            showToast('Erreur lors de la creation du compte.', 'error');
          }
        },
      }
    );
  };

  if (credentials) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <div className="rounded-lg border border-success/30 bg-success/5 p-6">
          <h2 className="text-lg font-semibold text-primary" data-testid="success-title">
            Compte cree avec succes
          </h2>
          <p className="mt-2 text-sm text-subtext">
            Transmettez ces identifiants a l'apprenant de facon securisee.
          </p>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg bg-white p-4">
              <p className="text-xs text-subtext">Email de connexion</p>
              <p className="mt-1 font-mono text-sm font-medium text-text" data-testid="credentials-email">
                {credentials.email}
              </p>
            </div>
            <div className="rounded-lg bg-white p-4">
              <p className="text-xs text-subtext">Mot de passe temporaire</p>
              <p className="mt-1 font-mono text-sm font-medium text-text" data-testid="credentials-password">
                {credentials.mot_de_passe_temp}
              </p>
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <Button onClick={() => navigate(`/backoffice/apprenants/${credentials.id}`)} data-testid="btn-voir-profil">
              Voir le profil
            </Button>
            <Button variant="outline" onClick={() => { setCredentials(null); setForm({ email: '', nom: '', prenoms: '', type_apprenant: 'PROFESSIONNEL', secteur_activite: '', niveau_etude: '', pays_residence: 'CI', pays_nationalite: 'CI', langue_preferee: 'FR', organisation_id: '', mot_de_passe_temp: '' }); }}>
              Creer un autre compte
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Creer un compte apprenant</h1>
        <p className="mt-1 text-sm text-subtext">
          Le compte est active immediatement. Les identifiants sont affichés apres creation.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5" data-testid="form-creer-apprenant">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Nom"
              required
              value={form.nom}
              onChange={handleChange('nom')}
              error={errors.nom}
              data-testid="input-nom"
            />
            <Input
              label="Prenoms"
              required
              value={form.prenoms}
              onChange={handleChange('prenoms')}
              error={errors.prenoms}
              data-testid="input-prenoms"
            />
          </div>

          <Input
            label="Email institutionnel"
            type="email"
            required
            value={form.email}
            onChange={handleChange('email')}
            error={errors.email}
            placeholder="nom.prenom@organisation.ci"
            data-testid="input-email"
          />

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              Type apprenant <span className="text-danger">*</span>
            </label>
            <select
              value={form.type_apprenant}
              onChange={handleChange('type_apprenant')}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none"
              data-testid="select-type"
            >
              <option value="PROFESSIONNEL">Professionnel</option>
              <option value="APPRENANT">Apprenant scolarise</option>
            </select>
          </div>

          {form.type_apprenant === 'PROFESSIONNEL' && (
            <Input
              label="Secteur d'activite"
              required
              value={form.secteur_activite}
              onChange={handleChange('secteur_activite')}
              error={errors.secteur_activite}
              placeholder="Ex : Securite informatique, Finance..."
              data-testid="input-secteur"
            />
          )}

          {form.type_apprenant === 'APPRENANT' && (
            <Input
              label="Niveau d'etude"
              required
              value={form.niveau_etude}
              onChange={handleChange('niveau_etude')}
              error={errors.niveau_etude}
              data-testid="input-niveau"
            />
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Pays de residence (ISO)"
              value={form.pays_residence}
              onChange={handleChange('pays_residence')}
              placeholder="CI"
              data-testid="input-pays-residence"
            />
            <Input
              label="Pays de nationalite (ISO)"
              value={form.pays_nationalite}
              onChange={handleChange('pays_nationalite')}
              placeholder="CI"
              data-testid="input-pays-nationalite"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              Organisation (optionnel)
            </label>
            <select
              value={form.organisation_id}
              onChange={handleChange('organisation_id')}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none"
              data-testid="select-organisation"
            >
              <option value="">Aucune organisation</option>
              {organisations.map(org => (
                <option key={org.id} value={org.id}>{org.raison_sociale}</option>
              ))}
            </select>
            {errors.organisation_id && (
              <p className="mt-1 text-xs text-danger">{errors.organisation_id}</p>
            )}
          </div>

          <Input
            label="Mot de passe temporaire (laissez vide pour auto-generer)"
            value={form.mot_de_passe_temp}
            onChange={handleChange('mot_de_passe_temp')}
            placeholder="Auto-genere si vide"
            data-testid="input-mdp-temp"
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={isLoading} data-testid="btn-submit">
              Creer le compte
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/backoffice/apprenants')}>
              Annuler
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
