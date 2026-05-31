import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Icon from '../../components/ui/Icon';

/**
 * RegisterEtudiantPage - Formulaire d'inscription étudiant
 * Référence: CLAUDE.md section 17 - Étape F-5
 * Règles métier: RM-28, RM-34, RM-35, RM-36, RM-48
 */
export default function RegisterEtudiantPage() {
  const navigate = useNavigate();
  const { execute, isLoading, error } = useApi();
  const selectClassName = 'w-full appearance-none px-4 py-2.5 border rounded-lg bg-white text-text transition-colors focus:outline-none focus:ring-2 focus:ring-primary';
  const activeTypeClass = 'border-primary bg-primary text-white shadow-md shadow-primary/15';
  const inactiveTypeClass = 'border-border bg-white text-text hover:border-secondary hover:bg-bg';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nom: '',
    prenoms: '',
    type_apprenant: 'APPRENANT',
    secteur_activite: '',
    niveau_etude: '',
    pays_residence: 'CI',
    pays_nationalite: 'CI',
    telephone: '',
    consentement_rgpd: false,
  });

  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    // Email
    if (!formData.email) {
      errors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'L\'email n\'est pas valide';
    }

    // Password
    if (!formData.password) {
      errors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 8) {
      errors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    } else if (!/[A-Z]/.test(formData.password)) {
      errors.password = 'Le mot de passe doit contenir au moins une majuscule';
    } else if (!/[0-9]/.test(formData.password)) {
      errors.password = 'Le mot de passe doit contenir au moins un chiffre';
    }

    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    // Nom et prénom
    if (!formData.nom) errors.nom = 'Le nom est requis';
    if (!formData.prenoms) errors.prenoms = 'Le prénom est requis';

    // Type apprenant et champs conditionnels (RM-35, RM-36)
    if (formData.type_apprenant === 'PROFESSIONNEL' && !formData.secteur_activite) {
      errors.secteur_activite = 'Le secteur d\'activité est requis pour les professionnels';
    }
    if (formData.type_apprenant === 'APPRENANT' && !formData.niveau_etude) {
      errors.niveau_etude = 'Le niveau d\'étude est requis pour les étudiants';
    }

    // Pays (RM-48)
    if (!formData.pays_residence) {
      errors.pays_residence = 'Le pays de résidence est requis';
    }
    if (!formData.pays_nationalite) {
      errors.pays_nationalite = 'Le pays de nationalité est requis';
    }
    if (!formData.consentement_rgpd) {
      errors.consentement_rgpd = 'Vous devez accepter le consentement RGPD';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      email: formData.email,
      password: formData.password,
      nom: formData.nom,
      prenoms: formData.prenoms,
      type_apprenant: formData.type_apprenant,
      pays_residence: formData.pays_residence,
      pays_nationalite: formData.pays_nationalite,
      consentement_rgpd: formData.consentement_rgpd,
    };

    // Champs conditionnels (RM-35, RM-36)
    if (formData.type_apprenant === 'PROFESSIONNEL' && formData.secteur_activite) {
      payload.secteur_activite = formData.secteur_activite;
    }
    if (formData.type_apprenant === 'APPRENANT' && formData.niveau_etude) {
      payload.niveau_etude = formData.niveau_etude;
    }

    // Téléphone optionnel
    if (formData.telephone) {
      payload.telephone = formData.telephone;
    }

    await execute(() => authApi.registerEtudiant(payload), {
      onSuccess: () => {
        navigate('/login', {
          state: {
            message:
              'Inscription réussie ! Veuillez consulter votre email pour confirmer votre compte.',
          },
        });
      },
      showSuccessToast: true,
      successMessage: 'Inscription réussie ! Consultez votre email.',
    });
  };

  return (
    <div className="min-h-screen bg-bg py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link
              to="/register"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Retour au choix d'inscription"
            >
              <Icon name="arrowRight" size={16} className="rotate-180" />
              Retour au choix d'inscription
            </Link>
            <nav className="mt-4 text-sm text-subtext" aria-label="Fil d'Ariane">
              <Link to="/" className="text-secondary hover:text-primary">
                Accueil
              </Link>
              <span className="mx-2 text-subtext">/</span>
              <Link to="/register" className="text-secondary hover:text-primary">
                Inscription
              </Link>
              <span className="mx-2 text-subtext">/</span>
              <span className="text-text">Apprenant</span>
            </nav>
          </div>

          <Card>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-primary mb-2">
                Inscription apprenant
              </h1>
              <p className="text-subtext">
                Créez votre compte pour accéder aux formations FORGES
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informations personnelles */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-text">
                  Informations personnelles
                </h2>

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="Nom *"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    error={validationErrors.nom}
                    required
                  />
                  <Input
                    label="Prénoms *"
                    name="prenoms"
                    value={formData.prenoms}
                    onChange={handleChange}
                    error={validationErrors.prenoms}
                    required
                  />
                </div>

                <Input
                  type="email"
                  label="Email *"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={validationErrors.email}
                  required
                  placeholder="votre@email.com"
                />

                <Input
                  type="tel"
                  label="Téléphone"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  placeholder="+225 XX XX XX XX XX"
                />
              </div>

              {/* Type d'apprenant */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-text">
                  Profil
                </h2>

                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Type de profil *
                  </label>
                  <div className="grid md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          type_apprenant: 'APPRENANT',
                          secteur_activite: '',
                        }))
                      }
                      aria-pressed={formData.type_apprenant === 'APPRENANT'}
                      className={`cursor-pointer p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                        formData.type_apprenant === 'APPRENANT'
                          ? activeTypeClass
                          : inactiveTypeClass
                      }`}
                    >
                      <div className={`font-semibold ${formData.type_apprenant === 'APPRENANT' ? 'text-white' : 'text-text'}`}>
                        Apprenant
                      </div>
                      <div className={`text-sm ${formData.type_apprenant === 'APPRENANT' ? 'text-white/80' : 'text-subtext'}`}>
                        Formation académique
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          type_apprenant: 'PROFESSIONNEL',
                          niveau_etude: '',
                        }))
                      }
                      aria-pressed={formData.type_apprenant === 'PROFESSIONNEL'}
                      className={`cursor-pointer p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                        formData.type_apprenant === 'PROFESSIONNEL'
                          ? activeTypeClass
                          : inactiveTypeClass
                      }`}
                    >
                      <div className={`font-semibold ${formData.type_apprenant === 'PROFESSIONNEL' ? 'text-white' : 'text-text'}`}>
                        Professionnel
                      </div>
                      <div className={`text-sm ${formData.type_apprenant === 'PROFESSIONNEL' ? 'text-white/80' : 'text-subtext'}`}>
                        Formation continue
                      </div>
                    </button>
                  </div>
                </div>

                {/* Champs conditionnels (RM-35, RM-36) */}
                {formData.type_apprenant === 'PROFESSIONNEL' && (
                  <Input
                    label="Secteur d'activité *"
                    name="secteur_activite"
                    value={formData.secteur_activite}
                    onChange={handleChange}
                    error={validationErrors.secteur_activite}
                    required
                    placeholder="Ex: Informatique, Finance, Éducation..."
                  />
                )}

                {formData.type_apprenant === 'APPRENANT' && (
                  <div>
                    <label
                      htmlFor="niveau_etude"
                      className="block text-sm font-medium text-text mb-2"
                    >
                      Niveau d'étude *
                    </label>
                    <select
                      id="niveau_etude"
                      name="niveau_etude"
                      value={formData.niveau_etude}
                      onChange={handleChange}
                      className={`${selectClassName} ${
                        validationErrors.niveau_etude
                          ? 'border-danger'
                          : 'border-border'
                      }`}
                      required
                    >
                      <option value="">-- Sélectionnez --</option>
                      <option value="BAC">Baccalauréat</option>
                      <option value="LICENCE">Licence</option>
                      <option value="MASTER">Master</option>
                      <option value="DOCTORAT">Doctorat</option>
                      <option value="AUTRE">Autre</option>
                    </select>
                    {validationErrors.niveau_etude && (
                      <p className="mt-1 text-sm text-danger">
                        {validationErrors.niveau_etude}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Pays (RM-48) */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-text">
                  Localisation
                </h2>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="pays_residence"
                      className="block text-sm font-medium text-text mb-2"
                    >
                      Pays de résidence *
                    </label>
                    <select
                      id="pays_residence"
                      name="pays_residence"
                      value={formData.pays_residence}
                      onChange={handleChange}
                      className={`${selectClassName} ${
                        validationErrors.pays_residence
                          ? 'border-danger'
                          : 'border-border'
                      }`}
                      required
                    >
                      <option value="CI">Côte d'Ivoire</option>
                      <option value="SN">Sénégal</option>
                      <option value="BJ">Bénin</option>
                      <option value="BF">Burkina Faso</option>
                      <option value="ML">Mali</option>
                      <option value="NE">Niger</option>
                      <option value="TG">Togo</option>
                      <option value="GH">Ghana</option>
                      <option value="NG">Nigeria</option>
                      <option value="CM">Cameroun</option>
                      <option value="FR">France</option>
                    </select>
                    {validationErrors.pays_residence && (
                      <p className="mt-1 text-sm text-danger">
                        {validationErrors.pays_residence}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="pays_nationalite"
                      className="block text-sm font-medium text-text mb-2"
                    >
                      Pays de nationalité *
                    </label>
                    <select
                      id="pays_nationalite"
                      name="pays_nationalite"
                      value={formData.pays_nationalite}
                      onChange={handleChange}
                      className={`${selectClassName} ${
                        validationErrors.pays_nationalite
                          ? 'border-danger'
                          : 'border-border'
                      }`}
                      required
                    >
                      <option value="CI">Côte d'Ivoire</option>
                      <option value="SN">Sénégal</option>
                      <option value="BJ">Bénin</option>
                      <option value="BF">Burkina Faso</option>
                      <option value="ML">Mali</option>
                      <option value="NE">Niger</option>
                      <option value="TG">Togo</option>
                      <option value="GH">Ghana</option>
                      <option value="NG">Nigeria</option>
                      <option value="CM">Cameroun</option>
                      <option value="FR">France</option>
                    </select>
                    {validationErrors.pays_nationalite && (
                      <p className="mt-1 text-sm text-danger">
                        {validationErrors.pays_nationalite}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Consentement RGPD */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="consentement_rgpd"
                    checked={formData.consentement_rgpd}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        consentement_rgpd: e.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text">
                    J'accepte le traitement de mes données personnelles et le
                    consentement RGPD *
                  </span>
                </label>
                {validationErrors.consentement_rgpd && (
                  <p className="text-sm text-danger">
                    {validationErrors.consentement_rgpd}
                  </p>
                )}
              </div>

              {/* Mot de passe */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-text">
                  Sécurité
                </h2>

                <Input
                  type="password"
                  label="Mot de passe *"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  error={validationErrors.password}
                  required
                  placeholder="Minimum 8 caractères, 1 majuscule, 1 chiffre"
                />

                <Input
                  type="password"
                  label="Confirmer le mot de passe *"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={validationErrors.confirmPassword}
                  required
                />
              </div>

              {/* Error global */}
              {error && (
                <div className="p-4 border border-danger bg-red-50 rounded-lg">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}

              {/* Submit */}
              <div className="pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  size="large"
                  fullWidth
                  loading={isLoading}
                >
                  Créer mon compte
                </Button>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-subtext">
                Vous avez déjà un compte ?{' '}
                <Link
                  to="/login"
                  className="text-secondary hover:text-primary font-medium"
                >
                  Se connecter
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
