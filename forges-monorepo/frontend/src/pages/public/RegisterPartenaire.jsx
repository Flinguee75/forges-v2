import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import { confirmEmailPartenaire, registerPartenaire } from '../../api/partenaires.api';

const INITIAL_FORM = {
  email: '',
  password: '',
  confirmPassword: '',
  raison_sociale: '',
  telephone: '',
  type_partenaire: 'AUTRE',
  langue_preferee: 'FR',
  responsable_designe_id: '',
};

export default function RegisterPartenaire() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const { execute, isLoading } = useApi();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const token = searchParams.get('token');
  const isActivationFlow = Boolean(token);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: null }));
    }
  };

  const validateRegistration = () => {
    const nextErrors = {};

    if (!formData.email.trim()) nextErrors.email = 'L email est obligatoire';
    if (!formData.raison_sociale.trim()) nextErrors.raison_sociale = 'La raison sociale est obligatoire';
    if (formData.telephone.trim() && formData.telephone.trim().length < 8) {
      nextErrors.telephone = 'Le telephone doit contenir au moins 8 caracteres';
    }
    if (!formData.password) nextErrors.password = 'Le mot de passe est obligatoire';
    if (formData.password && formData.password.length < 8) nextErrors.password = 'Le mot de passe doit contenir au moins 8 caracteres';
    if (formData.password && !/[A-Z]/.test(formData.password)) nextErrors.password = 'Le mot de passe doit contenir une majuscule';
    if (formData.password && !/[0-9]/.test(formData.password)) nextErrors.password = 'Le mot de passe doit contenir un chiffre';
    if (formData.password !== formData.confirmPassword) nextErrors.confirmPassword = 'Les mots de passe ne correspondent pas';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateActivation = () => {
    const nextErrors = {};

    if (!formData.password) nextErrors.password = 'Le mot de passe est obligatoire';
    if (formData.password && formData.password.length < 8) nextErrors.password = 'Le mot de passe doit contenir au moins 8 caracteres';
    if (formData.password && !/[A-Z]/.test(formData.password)) nextErrors.password = 'Le mot de passe doit contenir une majuscule';
    if (formData.password && !/[0-9]/.test(formData.password)) nextErrors.password = 'Le mot de passe doit contenir un chiffre';
    if (formData.password !== formData.confirmPassword) nextErrors.confirmPassword = 'Les mots de passe ne correspondent pas';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isActivationFlow) {
      if (!validateActivation()) {
        showToast('Veuillez corriger les erreurs du formulaire', 'error');
        return;
      }

      await execute(() => confirmEmailPartenaire(token, formData.password), {
        showSuccessToast: false,
        onSuccess: (result) => {
          showToast(result?.message || 'Compte partenaire activé.', 'success');
          navigate('/login', {
            state: {
              message: 'Compte partenaire activé. Vous pouvez maintenant vous connecter.',
            },
          });
        },
      });
      return;
    }

    if (!validateRegistration()) {
      showToast('Veuillez corriger les erreurs du formulaire', 'error');
      return;
    }

    const payload = {
      email: formData.email.trim(),
      password: formData.password,
      raison_sociale: formData.raison_sociale.trim(),
      telephone: formData.telephone.trim() || undefined,
      type_partenaire: formData.type_partenaire,
      langue_preferee: formData.langue_preferee,
    };

    if (formData.responsable_designe_id.trim()) {
      payload.responsable_designe_id = formData.responsable_designe_id.trim();
    }

    await execute(() => registerPartenaire(payload), {
      showSuccessToast: false,
      onSuccess: (result) => {
        showToast(
          result?.message || 'Votre demande a ete enregistree. Consultez votre boite email pour confirmer le compte.',
          'success'
        );
        navigate('/login', {
          state: {
            message: 'Demande partenaire envoyee. Verifiez votre email pour finaliser la confirmation.',
          },
        });
      },
    });
  };

  if (isActivationFlow) {
    return (
      <div className="min-h-screen bg-[linear-gradient(135deg,#F4F6F7_0%,#FFFFFF_45%,#FCEFE6_100%)] px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <Card bodyClassName="space-y-6">
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-partenaire)]">
                Activation partenaire
              </p>
              <h1 className="mt-4 text-3xl font-bold text-[var(--color-text)]">
                Finaliser votre compte partenaire
              </h1>
              <p className="mt-3 text-sm text-[var(--color-subtext)]">
                Ce lien d&apos;invitation est valide 48h. Choisissez maintenant votre mot de passe pour activer le compte.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Mot de passe"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  required
                />
                <Input
                  label="Confirmer le mot de passe"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  error={errors.confirmPassword}
                  required
                />
              </div>

              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
                <p className="text-sm font-medium text-[var(--color-text)]">Ce que fait ce formulaire</p>
                <ul className="mt-2 space-y-2 text-sm text-[var(--color-subtext)]">
                  <li>Le backend active le compte et génère le hash du mot de passe.</li>
                  <li>Le token est consommé une seule fois.</li>
                  <li>Vous pourrez ensuite vous connecter avec ce mot de passe.</li>
                </ul>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit" variant="primary" loading={isLoading}>
                  Activer mon compte partenaire
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/register-partenaire')}>
                  Retour à l&apos;inscription
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#F4F6F7_0%,#FFFFFF_45%,#FCEFE6_100%)]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 lg:flex-row lg:items-center lg:gap-10">
        <div className="mb-8 max-w-xl lg:mb-0 lg:flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-partenaire)]">
            Espace Partenaire Fournisseur
          </p>
          <h1 className="mt-4 text-4xl font-bold text-[var(--color-text)]">
            Creer un compte partenaire
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-[var(--color-subtext)]">
            Cette inscription publique suit le flux RM-126. Aucun champ de type de formation n&apos;est exposé ici.
            La validation administrative intervient apres confirmation email.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-[var(--color-text)]">Flux B</p>
              <p className="mt-1 text-sm text-[var(--color-subtext)]">Auto-inscription publique puis approbation Admin.</p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-[var(--color-text)]">Protection RM-127</p>
              <p className="mt-1 text-sm text-[var(--color-subtext)]">Aucun champ reserve au backoffice dans ce formulaire.</p>
            </div>
          </div>
        </div>

        <Card className="w-full max-w-2xl lg:flex-1" bodyClassName="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-partenaire)]">Inscription partenaire</h2>
            <p className="mt-2 text-sm text-[var(--color-subtext)]">
              Remplissez les informations de base de votre organisation pour demarrer.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Email professionnel"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                required
                placeholder="contact@entreprise.com"
              />
              <Input
                label="Raison sociale"
                name="raison_sociale"
                value={formData.raison_sociale}
                onChange={handleChange}
                error={errors.raison_sociale}
                required
                placeholder="Nom legal de l organisation"
              />
              <Input
                label="Telephone"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                error={errors.telephone}
                placeholder="+2250102030405"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="register-partenaire-type" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                  Type de partenaire
                </label>
                <select
                  id="register-partenaire-type"
                  name="type_partenaire"
                  value={formData.type_partenaire}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-partenaire)]"
                >
                  <option value="AUTRE">Autre</option>
                  <option value="ENTREPRISE_FORMATION">Organisme de formation</option>
                  <option value="UNIVERSITE">Universite</option>
                  <option value="ONG">ONG</option>
                  <option value="INSTITUTION">Institution</option>
                </select>
              </div>

              <div>
                <label htmlFor="register-partenaire-langue" className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                  Langue preferee
                </label>
                <select
                  id="register-partenaire-langue"
                  name="langue_preferee"
                  value={formData.langue_preferee}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-partenaire)]"
                >
                  <option value="FR">Francais</option>
                  <option value="EN">Anglais</option>
                  <option value="ES">Espagnol</option>
                  <option value="PT">Portugais</option>
                </select>
              </div>
            </div>

            <Input
              label="Identifiant du responsable designe"
              name="responsable_designe_id"
              value={formData.responsable_designe_id}
              onChange={handleChange}
              placeholder="UUID optionnel"
            />

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Mot de passe"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                required
              />
              <Input
                label="Confirmer le mot de passe"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                required
              />
            </div>

            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
              <p className="text-sm font-medium text-[var(--color-text)]">Points de controle</p>
              <ul className="mt-2 space-y-2 text-sm text-[var(--color-subtext)]">
                <li>Aucun champ type_formation n&apos;est present.</li>
                <li>La validation du compte se fait apres confirmation email.</li>
                <li>La langue preferee sera reprise pour les emails automatiques.</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" variant="primary" loading={isLoading}>
                Creer mon compte partenaire
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/login')}>
                J ai deja un compte
              </Button>
            </div>
          </form>

          <p className="text-sm text-[var(--color-subtext)]">
            En vous inscrivant, vous acceptez le processus de validation Admin defini par RM-126.
          </p>
        </Card>
      </div>
    </div>
  );
}
