import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.api';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Icon from '../../components/ui/Icon';

/**
 * RegisterOrganisationPage - Formulaire d'inscription organisation
 * Référence: CLAUDE.md section 17 - Étape F-5
 * Règles métier: RM-28, RM-43, RM-48
 */
export default function RegisterOrganisationPage() {
  const navigate = useNavigate();
  const { execute, isLoading, error } = useApi();
  const selectClassName = 'w-full appearance-none px-4 py-2.5 border rounded-lg bg-white text-text transition-colors focus:outline-none focus:ring-2 focus:ring-primary';

  const [formData, setFormData] = useState({
    raison_sociale: '',
    type: 'ENTREPRISE',
    identifiant_legal: '',
    pays: 'CI',
    email: '',
    password: '',
    confirmPassword: '',
    contact_referent: '',
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

    // Nom organisation
    if (!formData.raison_sociale) {
      errors.raison_sociale = 'La raison sociale est requise';
    }

    // Identifiant légal (RM-43)
    if (!formData.identifiant_legal) {
      errors.identifiant_legal = 'L\'identifiant légal (RCCM/IFU) est requis';
    }

    // Pays (RM-48)
    if (!formData.pays) {
      errors.pays = 'Le pays est requis';
    }

    // Email (RM-28)
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

    // Contact
    if (!formData.contact_referent) {
      errors.contact_referent = 'Le contact référent est requis';
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
      raison_sociale: formData.raison_sociale,
      type: formData.type,
      identifiant_legal: formData.identifiant_legal,
      pays: formData.pays,
      email: formData.email,
      password: formData.password,
      contact_referent: formData.contact_referent,
      consentement_rgpd: formData.consentement_rgpd,
    };

    await execute(() => authApi.registerOrganisation(payload), {
      onSuccess: () => {
        navigate('/login', {
          state: {
            message:
              'Inscription réussie ! Votre compte organisation est en attente de validation. Vous recevrez un email de confirmation.',
          },
        });
      },
      showSuccessToast: true,
      successMessage: 'Inscription réussie ! En attente de validation.',
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
              <span className="text-text">Organisation</span>
            </nav>
          </div>

          <Card>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-primary mb-2">
                Inscription organisation
              </h1>
              <p className="text-subtext">
                Créez votre compte organisation pour gérer les formations de vos
                employés ou membres
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informations organisation */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-text">
                  Informations de l'organisation
                </h2>

                <Input
                  label="Raison sociale *"
                  name="raison_sociale"
                  value={formData.raison_sociale}
                  onChange={handleChange}
                  error={validationErrors.raison_sociale}
                  required
                  placeholder="Ex: Entreprise ABC, Association XYZ..."
                />

                <div>
                  <label
                    htmlFor="type"
                    className="block text-sm font-medium text-text mb-2"
                  >
                    Type d'organisation *
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className={selectClassName}
                    required
                  >
                    <option value="ENTREPRISE">Entreprise</option>
                    <option value="ASSOCIATION">Association</option>
                    <option value="GOUVERNEMENT">Organisme gouvernemental</option>
                  </select>
                </div>

                <Input
                  label="Identifiant légal *"
                  name="identifiant_legal"
                  value={formData.identifiant_legal}
                  onChange={handleChange}
                  error={validationErrors.identifiant_legal}
                  required
                  placeholder="Ex: CI-ABJ-01-2024-B12-12345"
                />

                <div>
                  <label
                    htmlFor="pays"
                    className="block text-sm font-medium text-text mb-2"
                  >
                    Pays *
                  </label>
                  <select
                    id="pays"
                    name="pays"
                    value={formData.pays}
                    onChange={handleChange}
                    className={`${selectClassName} ${
                      validationErrors.pays ? 'border-danger' : 'border-border'
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
                  {validationErrors.pays && (
                    <p className="mt-1 text-sm text-danger">
                      {validationErrors.pays}
                    </p>
                  )}
                </div>
              </div>

              {/* Compte de connexion */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-text">
                  Compte de connexion
                </h2>

                <Input
                  type="email"
                  label="Email de l'organisation *"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  error={validationErrors.email}
                  required
                  placeholder="contact@organisation.com"
                />

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

              {/* Personne de contact */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-text">
                  Personne de contact
                </h2>

                <div className="grid gap-4">
                  <Input
                    label="Contact référent *"
                    name="contact_referent"
                    value={formData.contact_referent}
                    onChange={handleChange}
                    error={validationErrors.contact_referent}
                    required
                    placeholder="Ex: Nom Prénom, Fonction"
                  />
                </div>

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
                    J'accepte le traitement de mes données personnelles et le consentement RGPD *
                  </span>
                </label>
                {validationErrors.consentement_rgpd && (
                  <p className="text-sm text-danger">
                    {validationErrors.consentement_rgpd}
                  </p>
                )}
              </div>

              {/* Error global */}
              {error && (
                <div className="p-4 border border-danger bg-red-50 rounded-lg">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}

              {/* Info validation */}
              <div className="p-4 border border-warning bg-warning/5 rounded-lg">
                <p className="text-sm text-warning">
                  <strong>Important :</strong> Votre compte sera créé avec le
                  statut "En attente" et devra être validé par un administrateur
                  FORGES avant que vous puissiez l'utiliser. Vous recevrez un
                  email de confirmation dès que votre compte sera activé.
                </p>
              </div>

              {/* Submit */}
              <div className="pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  size="large"
                  fullWidth
                  loading={isLoading}
                >
                  Créer le compte organisation
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
