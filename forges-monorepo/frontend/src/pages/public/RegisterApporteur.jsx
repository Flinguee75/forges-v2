import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import apporteursApi from '../../api/apporteurs.api';
import { useToast } from '../../hooks/useToast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';

/**
 * RegisterApporteur - Auto-inscription apporteur d'affaires (Flux B)
 * Crée un compte EN_ATTENTE_VERIFICATION
 * Référence: CLAUDE.md v2.0 F-13, RM-126 (adapté pour apporteurs)
 */
export default function RegisterApporteur() {
  const { execute, isLoading } = useApi();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    type: 'INDIVIDU',
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    password: '',
    passwordConfirm: '',
    consentement_rgpd: false,
  });

  const [errors, setErrors] = useState({});

  // Validation
  const validate = () => {
    const newErrors = {};

    if (!formData.nom) {
      newErrors.nom = 'Le nom est obligatoire';
    }

    if (!formData.email) {
      newErrors.email = 'L\'email est obligatoire';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (!formData.telephone) {
      newErrors.telephone = 'Le téléphone est obligatoire';
    }

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est obligatoire';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = 'Les mots de passe ne correspondent pas';
    }

    if (!formData.consentement_rgpd) {
      newErrors.consentement_rgpd = 'Vous devez accepter les conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumettre l'inscription
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      showToast('Veuillez corriger les erreurs du formulaire', 'error');
      return;
    }

    const { passwordConfirm: _passwordConfirm, ...dataToSend } = formData;

    try {
      await execute(() => apporteursApi.register(dataToSend));
      showToast(
        'Demande d\'inscription envoyée avec succès. Vous recevrez un email une fois votre compte approuvé.',
        'success'
      );
      navigate('/login');
    } catch (error) {
      showToast(error?.message || 'Erreur lors de l\'inscription', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <Card>
          <div className="p-8">
            {/* En-tête */}
            <div className="text-center mb-8">
              <Link to="/" className="inline-block text-3xl font-bold text-[var(--color-apporteur)] mb-2">
                FORGES
              </Link>
              <h1 className="text-2xl font-bold text-text">Devenir Apporteur d'Affaires</h1>
              <p className="mt-2 text-sm text-subtext">
                Gagnez des commissions en parrainant de nouveaux apprenants
              </p>
            </div>

            {/* Info programme */}
            <div className="rounded-lg border border-[var(--color-apporteur)] bg-[var(--color-apporteur)]/10 p-4 mb-6">
              <div className="flex items-start gap-3">
                <Icon name="informationCircle" size={20} className="text-[var(--color-apporteur)] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-text">Programme d'affiliation FORGES</p>
                  <ul className="mt-2 space-y-1 text-sm text-subtext">
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-apporteur)]">•</span>
                      Commission de 5% sur chaque inscription parrainée
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-apporteur)]">•</span>
                      Code de parrainage unique et permanent
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-apporteur)]">•</span>
                      Reversements mensuels automatiques (dès 5 000 FCFA)
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-apporteur)]">•</span>
                      Suivi en temps réel de vos commissions
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type apporteur */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Type d'apporteur
                  <span className="text-danger">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'INDIVIDU' })}
                    className={`rounded-lg border-2 p-4 text-left transition-colors ${
                      formData.type === 'INDIVIDU'
                        ? 'border-[var(--color-apporteur)] bg-[var(--color-apporteur)]/10'
                        : 'border-border bg-white hover:border-[var(--color-apporteur)]/50'
                    }`}
                  >
                    <p className="font-medium text-text">Individu</p>
                    <p className="text-xs text-subtext mt-1">Personne physique</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'ORGANISATION' })}
                    className={`rounded-lg border-2 p-4 text-left transition-colors ${
                      formData.type === 'ORGANISATION'
                        ? 'border-[var(--color-apporteur)] bg-[var(--color-apporteur)]/10'
                        : 'border-border bg-white hover:border-[var(--color-apporteur)]/50'
                    }`}
                  >
                    <p className="font-medium text-text">Organisation</p>
                    <p className="text-xs text-subtext mt-1">Entreprise / Association</p>
                  </button>
                </div>
              </div>

              {/* Nom / Raison sociale */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  {formData.type === 'INDIVIDU' ? 'Nom complet' : 'Raison sociale'}
                  <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className={`w-full rounded-lg border px-4 py-2 text-sm text-text focus:outline-none focus:ring-2 ${
                    errors.nom
                      ? 'border-danger focus:border-danger focus:ring-danger/20'
                      : 'border-border focus:border-primary focus:ring-primary/20'
                  }`}
                />
                {errors.nom && <p className="mt-1 text-xs text-danger">{errors.nom}</p>}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Email
                    <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full rounded-lg border px-4 py-2 text-sm text-text focus:outline-none focus:ring-2 ${
                      errors.email
                        ? 'border-danger focus:border-danger focus:ring-danger/20'
                        : 'border-border focus:border-primary focus:ring-primary/20'
                    }`}
                  />
                  {errors.email && <p className="mt-1 text-xs text-danger">{errors.email}</p>}
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Téléphone
                    <span className="text-danger">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className={`w-full rounded-lg border px-4 py-2 text-sm text-text focus:outline-none focus:ring-2 ${
                      errors.telephone
                        ? 'border-danger focus:border-danger focus:ring-danger/20'
                        : 'border-border focus:border-primary focus:ring-primary/20'
                    }`}
                  />
                  {errors.telephone && <p className="mt-1 text-xs text-danger">{errors.telephone}</p>}
                </div>
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Adresse (optionnel)
                </label>
                <textarea
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-border px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Mot de passe */}
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Mot de passe
                    <span className="text-danger">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full rounded-lg border px-4 py-2 text-sm text-text focus:outline-none focus:ring-2 ${
                      errors.password
                        ? 'border-danger focus:border-danger focus:ring-danger/20'
                        : 'border-border focus:border-primary focus:ring-primary/20'
                    }`}
                  />
                  {errors.password && <p className="mt-1 text-xs text-danger">{errors.password}</p>}
                  <p className="mt-1 text-xs text-subtext">Minimum 8 caractères</p>
                </div>

                {/* Confirmation mot de passe */}
                <div>
                  <label className="block text-sm font-medium text-text mb-2">
                    Confirmer le mot de passe
                    <span className="text-danger">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.passwordConfirm}
                    onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                    className={`w-full rounded-lg border px-4 py-2 text-sm text-text focus:outline-none focus:ring-2 ${
                      errors.passwordConfirm
                        ? 'border-danger focus:border-danger focus:ring-danger/20'
                        : 'border-border focus:border-primary focus:ring-primary/20'
                    }`}
                  />
                  {errors.passwordConfirm && <p className="mt-1 text-xs text-danger">{errors.passwordConfirm}</p>}
                </div>
              </div>

              {/* Consentement RGPD */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.consentement_rgpd}
                    onChange={(e) => setFormData({ ...formData, consentement_rgpd: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="text-sm text-text">
                    J'accepte les conditions générales d'utilisation et la politique de confidentialité
                    <span className="text-danger">*</span>
                  </span>
                </label>
                {errors.consentement_rgpd && (
                  <p className="mt-1 text-xs text-danger">{errors.consentement_rgpd}</p>
                )}
              </div>

              {/* Bouton inscription */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Inscription en cours...' : 'S\'inscrire comme apporteur'}
              </Button>
            </form>

            {/* Lien connexion */}
            <div className="mt-6 text-center text-sm text-subtext">
              Vous avez déjà un compte ?{' '}
              <Link to="/login" className="font-medium text-[var(--color-apporteur)] hover:underline">
                Se connecter
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
