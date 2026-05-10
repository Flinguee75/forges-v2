import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import { apprenantsApi } from '../../../api/apprenants.api';
import { organisationsApi } from '../../../api/organisations.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';

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
    telephone: '',
    mot_de_passe_temp: '',
  });
  const [errors, setErrors] = useState({});
  const [credentials, setCredentials] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
    if (!form.email.trim()) e.email = 'Email obligatoire';
    if (!form.nom.trim()) e.nom = 'Nom obligatoire';
    if (!form.prenoms.trim()) e.prenoms = 'Prenoms obligatoires';
    if (form.type_apprenant === 'PROFESSIONNEL' && !form.secteur_activite) {
      e.secteur_activite = 'Secteur obligatoire pour un professionnel';
    }
    if (form.type_apprenant === 'APPRENANT' && !form.niveau_etude) {
      e.niveau_etude = "Niveau d'etude obligatoire";
    }
    if (form.mot_de_passe_temp && form.mot_de_passe_temp.length > 0 && form.mot_de_passe_temp.length < 8) {
      e.mot_de_passe_temp = 'Minimum 8 caracteres';
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

    try {
      await execute(
        () => apprenantsApi.create({
          email: form.email.trim(),
          nom: form.nom.trim(),
          prenoms: form.prenoms.trim(),
          type_apprenant: form.type_apprenant,
          secteur_activite: form.secteur_activite?.trim() || undefined,
          niveau_etude: form.niveau_etude?.trim() || undefined,
          pays_residence: form.pays_residence.trim().toUpperCase(),
          pays_nationalite: form.pays_nationalite.trim().toUpperCase(),
          langue_preferee: form.langue_preferee,
          organisation_id: form.organisation_id || undefined,
          telephone: form.telephone?.trim() || undefined,
          mot_de_passe_temp: form.mot_de_passe_temp?.trim() || undefined,
        }),
        {
          onSuccess: (data) => {
            const apprenant = data?.data ?? data;
            const organisationLabel = organisations.find((org) => org.id === (form.organisation_id || ''))?.raison_sociale || '';
            setCredentials({
              email: apprenant.email,
              mot_de_passe_temp: apprenant.mot_de_passe_temp,
              id: apprenant.id,
              nom: apprenant.nom || form.nom.trim(),
              prenoms: apprenant.prenoms || form.prenoms.trim(),
              organisation: organisationLabel,
            });
            setShowSuccessModal(true);
            showToast('Compte apprenant cree avec succes.', 'success');
          },
          onError: (err) => {
            const code = err?.error ?? err?.response?.data?.error;
            const details = err?.details ?? err?.response?.data?.details;
            if (code === 'EMAIL_ALREADY_EXISTS') {
              setErrors(prev => ({ ...prev, email: 'Cet email est deja utilise' }));
            } else if (code === 'ORGANISATION_NOT_FOUND') {
              setErrors(prev => ({ ...prev, organisation_id: 'Organisation introuvable' }));
            } else if (code === 'VALIDATION_ERROR' && Array.isArray(details) && details.length > 0) {
              const first = details[0];
              const field = first?.path?.[0];
              if (field) {
                setErrors(prev => ({ ...prev, [field]: first?.message || 'Valeur invalide' }));
              } else {
                showToast(first?.message || 'Erreur de validation.', 'error');
              }
            } else {
              showToast(err?.message || 'Erreur lors de la creation du compte.', 'error');
            }
          },
        }
      );
    } catch {
      // L'erreur est deja traitee par onError ; on évite un rejet non capture dans la console.
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Creer un compte apprenant</h1>
        <p className="mt-1 text-sm text-subtext">
          Le compte est active immediatement. Les identifiants sont affichés apres creation.
        </p>
      </div>

      {credentials ? (
        <div className="rounded-lg border border-success/30 bg-success/5 p-6">
          <h2 className="text-lg font-semibold text-primary" data-testid="success-title">
            Compte cree avec succes
          </h2>
          <p className="mt-2 text-sm text-subtext">
            Les identifiants restent visibles ci-dessous. Vous pouvez aussi ouvrir le profil.
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
            <Button
              variant="outline"
              onClick={() => {
                setCredentials(null);
                setShowSuccessModal(false);
                setForm({
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
                  telephone: '',
                  mot_de_passe_temp: '',
                });
              }}
            >
              Creer un autre compte
            </Button>
          </div>
        </div>
      ) : (
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

          <Input
            label="Telephone (optionnel)"
            type="tel"
            value={form.telephone}
            onChange={handleChange('telephone')}
            placeholder="+225 07 00 00 00 00"
            data-testid="input-telephone"
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
            error={errors.mot_de_passe_temp}
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
      )}

      <Modal
        isOpen={showSuccessModal && Boolean(credentials)}
        onClose={() => setShowSuccessModal(false)}
        title="Compte apprenant créé"
        size="large"
        footer={(
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" onClick={() => setShowSuccessModal(false)}>
              Fermer
            </Button>
            <Button onClick={() => navigate(`/backoffice/apprenants/${credentials?.id}`)}>
              Voir le profil
            </Button>
          </div>
        )}
      >
        {credentials && (
          <div className="space-y-5">
            <p className="text-sm text-text">
              Un email de confirmation a été envoyé à <strong>{credentials.email}</strong>.
            </p>

            <div className="rounded-lg border border-border bg-bg p-4">
              <p className="text-sm font-semibold text-primary">Si l’email n’a pas été reçu</p>
              <p className="mt-2 text-sm text-subtext">
                Transmettre les informations suivantes à l’apprenant :
              </p>
              <ul className="mt-3 space-y-2 text-sm text-text">
                <li><strong>Email :</strong> {credentials.email}</li>
                <li><strong>Nom :</strong> {credentials.nom}</li>
                <li><strong>Prénoms :</strong> {credentials.prenoms}</li>
                {credentials.organisation && (
                  <li><strong>Organisation :</strong> {credentials.organisation}</li>
                )}
                <li><strong>Mot de passe temporaire :</strong> {credentials.mot_de_passe_temp}</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
