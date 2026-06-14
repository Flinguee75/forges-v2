import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/feedback/Spinner';
import {
  getMonProfilPartenaire,
  updateMonProfilPartenaire,
} from '../../api/partenaires.api';
import { PARTNER_STATUS_LABELS, resolvePartnerLanguage } from './i18n';

const COPY = {
  FR: {
    eyebrow: 'Espace Partenaire',
    title: 'Profil partenaire',
    description: 'Les informations modifiables sont limitees a l email, la raison sociale et le pays. La commission FORGES reste geree par le backoffice et n est pas exposee ici.',
    editableTitle: 'Informations modifiables',
    summaryTitle: 'Resume du compte',
    reminderTitle: 'Rappel metier',
    email: 'Email',
    companyName: 'Raison sociale',
    country: 'Pays',
    save: 'Enregistrer les modifications',
    status: 'Statut',
    partnerType: 'Type de partenaire',
    formations: 'Formations',
    validEmail: 'Email valide',
    autoRegistration: 'AUTO_INSCRIPTION',
    loading: 'Chargement du profil partenaire',
    loadError: 'Impossible de charger le profil partenaire pour le moment.',
    success: 'Profil partenaire mis a jour avec succes',
    reminder1: 'RM-127 interdit toute exposition ou modification de type_formation ici.',
    reminder2: 'RM-130 interdit toute exposition de commission_forges_pct dans cet espace.',
    reminder3: 'Le pays est conserve au niveau profil, sans autre logique metier locale.',
  },
  EN: {
    eyebrow: 'Partner Space',
    title: 'Partner profile',
    description: 'Editable information is limited to email, company name and country. FORGES commission remains managed by the back office and is not exposed here.',
    editableTitle: 'Editable information',
    summaryTitle: 'Account summary',
    reminderTitle: 'Business reminder',
    email: 'Email',
    companyName: 'Company name',
    country: 'Country',
    save: 'Save changes',
    status: 'Status',
    partnerType: 'Partner type',
    formations: 'Courses',
    validEmail: 'Validated email',
    autoRegistration: 'AUTO_REGISTRATION',
    loading: 'Loading partner profile',
    loadError: 'Unable to load partner profile right now.',
    success: 'Partner profile updated successfully',
    reminder1: 'RM-127 forbids exposing or editing type_formation here.',
    reminder2: 'RM-130 forbids exposing commission_forges_pct in this space.',
    reminder3: 'Country is kept at profile level only; no extra business logic lives here.',
  },
  ES: {
    eyebrow: 'Espacio Socio',
    title: 'Perfil del socio',
    description: 'La informacion editable se limita al correo, la razon social y el pais. La comision FORGES sigue gestionada por backoffice y no se expone aqui.',
    editableTitle: 'Informacion editable',
    summaryTitle: 'Resumen de la cuenta',
    reminderTitle: 'Recordatorio de negocio',
    email: 'Correo',
    companyName: 'Razon social',
    country: 'Pais',
    save: 'Guardar cambios',
    status: 'Estado',
    partnerType: 'Tipo de socio',
    language: 'Idioma',
    formations: 'Formaciones',
    validEmail: 'Correo validado',
    autoRegistration: 'AUTO_REGISTRO',
    loading: 'Cargando el perfil del socio',
    loadError: 'No se puede cargar el perfil del socio por ahora.',
    success: 'Perfil del socio actualizado con exito',
    reminder1: 'RM-127 prohibe exponer o modificar type_formation aqui.',
    reminder2: 'RM-130 prohibe exponer commission_forges_pct en este espacio.',
    reminder3: 'El pais se conserva a nivel de perfil sin logica de negocio adicional.',
  },
  PT: {
    eyebrow: 'Espaco Parceiro',
    title: 'Perfil do parceiro',
    description: 'As informacoes editaveis limitam-se ao email, razao social e pais. A comissao FORGES continua gerida pelo backoffice e nao e exposta aqui.',
    editableTitle: 'Informacoes editaveis',
    summaryTitle: 'Resumo da conta',
    reminderTitle: 'Lembrete de negocio',
    email: 'Email',
    companyName: 'Razao social',
    country: 'Pais',
    save: 'Guardar alteracoes',
    status: 'Estado',
    partnerType: 'Tipo de parceiro',
    language: 'Idioma',
    formations: 'Formacoes',
    validEmail: 'Email validado',
    autoRegistration: 'AUTO_REGISTO',
    loading: 'A carregar o perfil do parceiro',
    loadError: 'Nao foi possivel carregar o perfil do parceiro neste momento.',
    success: 'Perfil do parceiro atualizado com sucesso',
    reminder1: 'RM-127 impede expor ou modificar type_formation aqui.',
    reminder2: 'RM-130 impede expor commission_forges_pct neste espaco.',
    reminder3: 'O pais fica no nivel do perfil, sem logica de negocio adicional.',
  },
};

export default function ProfilPartenaire() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const { execute, isLoading, error } = useApi();
  const [profil, setProfil] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    raison_sociale: '',
    pays: 'CI',
  });

  useEffect(() => {
    const loadProfil = async () => {
      try {
        await execute(() => getMonProfilPartenaire(), {
          onSuccess: (result) => {
            setProfil(result);
            setFormData({
              email: result?.email_principal || result?.email || '',
              raison_sociale: result?.raison_sociale || '',
              pays: result?.pays || 'CI',
            });
          },
          showErrorToast: false,
        });
      } catch {
        // error is already available through the hook
      }
    };

    loadProfil();
  }, [execute]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const currentLanguage = resolvePartnerLanguage(user?.langue_preferee || 'FR');
  const copy = COPY[currentLanguage] || COPY.FR;

  const handleSubmit = async (event) => {
    event.preventDefault();

    await execute(() => updateMonProfilPartenaire({
      email: formData.email.trim(),
      raison_sociale: formData.raison_sociale.trim(),
      pays: formData.pays,
    }), {
      showSuccessToast: false,
      onSuccess: (result) => {
        setProfil((current) => ({ ...current, ...result }));
        updateUser?.({
          email: result?.email_principal || result?.email || formData.email.trim(),
          raison_sociale: result?.raison_sociale || formData.raison_sociale.trim(),
        });
        showToast(copy.success, 'success');
      },
    });
  };

  const statutConfig = {
    INVITE: { variant: 'gray', label: (PARTNER_STATUS_LABELS[currentLanguage] || PARTNER_STATUS_LABELS.FR).INVITE },
    EN_ATTENTE_VERIFICATION: { variant: 'warning', label: (PARTNER_STATUS_LABELS[currentLanguage] || PARTNER_STATUS_LABELS.FR).EN_ATTENTE_VERIFICATION },
    ACTIF: { variant: 'success', label: (PARTNER_STATUS_LABELS[currentLanguage] || PARTNER_STATUS_LABELS.FR).ACTIF },
    SUSPENDU: { variant: 'warning', label: (PARTNER_STATUS_LABELS[currentLanguage] || PARTNER_STATUS_LABELS.FR).SUSPENDU },
    RESILIE: { variant: 'danger', label: (PARTNER_STATUS_LABELS[currentLanguage] || PARTNER_STATUS_LABELS.FR).RESILIE },
  }[profil?.statut] || { variant: 'gray', label: profil?.statut || 'Inconnu' };

  if (isLoading && !profil) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="large" text={copy.loading} />
      </div>
    );
  }

  if (!profil) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">{copy.title}</h1>
        <p className="mt-2 text-sm text-[var(--color-subtext)]">{error || copy.loadError}</p>
      </div>
    );
  }

  const statusDot = {
    ACTIF:                  'bg-emerald-500',
    EN_ATTENTE_VERIFICATION:'bg-amber-400',
    INVITE:                 'bg-gray-400',
    SUSPENDU:               'bg-red-400',
    RESILIE:                'bg-red-600',
  }[profil?.statut] || 'bg-gray-400';

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)]/60 mb-1">
          {copy.eyebrow}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">{copy.title}</h1>
            <p className="mt-1 text-sm text-[var(--color-subtext)] max-w-xl">{copy.description}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs font-medium text-[var(--color-text)] sm:self-auto">
            <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
            {statutConfig.label}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">

        {/* Form */}
        <div className="rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
          <div className="border-b border-[var(--color-border)] px-6 py-4">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">{copy.editableTitle}</h2>
          </div>
          <form className="px-6 py-6 space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label={copy.email}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <Input
                label={copy.companyName}
                name="raison_sociale"
                value={formData.raison_sociale}
                onChange={handleChange}
                required
              />
              <Input
                label={copy.country}
                name="pays"
                value={formData.pays}
                onChange={handleChange}
                placeholder="CI"
              />
            </div>
            <Button type="submit" variant="primary" loading={isLoading}>
              {copy.save}
            </Button>
          </form>
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
          <div className="border-b border-[var(--color-border)] px-6 py-4">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">{copy.summaryTitle}</h2>
          </div>
          <div className="divide-y divide-[var(--color-border)] px-6">
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-[var(--color-subtext)]">{copy.status}</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-text)]">
                <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                {statutConfig.label}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-[var(--color-subtext)]">{copy.partnerType}</span>
              <span className="text-sm font-medium text-[var(--color-text)]">{profil.type || 'AUTRE'}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-[var(--color-subtext)]">{copy.country}</span>
              <span className="text-sm font-medium text-[var(--color-text)]">{profil.pays || 'CI'}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-[var(--color-subtext)]">{copy.formations}</span>
              <span className="text-sm font-medium text-[var(--color-text)]">{profil.nb_formations || 0}</span>
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <span className="shrink-0 text-sm text-[var(--color-subtext)]">{copy.validEmail}</span>
              <span className="break-all text-right text-sm font-medium text-[var(--color-text)]">
                {profil.email_principal || profil.email || user?.email || '-'}
              </span>
            </div>
            {profil.mode_inscription && (
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-[var(--color-subtext)]">Mode d'inscription</span>
                <span className="text-sm font-medium text-[var(--color-text)]">{profil.mode_inscription}</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
