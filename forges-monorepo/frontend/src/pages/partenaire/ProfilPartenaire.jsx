import { useEffect, useRef, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
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
    type: 'UNIVERSITE',
    site_web: '',
    telephone: '',
    description: '',
    logo_url: null,
  });
  const fileInputRef = useRef(null);

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
              type: result?.type || 'UNIVERSITE',
              site_web: result?.site_web || '',
              telephone: result?.telephone || '',
              description: result?.description || '',
              logo_url: result?.logo_url || null,
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
      type: formData.type,
      site_web: formData.site_web.trim() || null,
      telephone: formData.telephone.trim() || null,
      description: formData.description.trim() || null,
      logo_url: formData.logo_url,
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

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 200;
        const ratio = Math.min(MAX / img.width, MAX / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        setFormData((prev) => ({ ...prev, logo_url: canvas.toDataURL('image/jpeg', 0.85) }));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const initials = (formData.raison_sociale || profil?.raison_sociale || '?')
    .split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const statusDot = {
    ACTIF:                  'bg-emerald-500',
    EN_ATTENTE_VERIFICATION:'bg-amber-400',
    INVITE:                 'bg-gray-400',
    SUSPENDU:               'bg-red-400',
    RESILIE:                'bg-red-600',
  }[profil?.statut] || 'bg-gray-400';

  return (
    <div className="space-y-8">

      {/* Header moderne avec logo */}
      <div className="rounded-xl border border-[var(--color-border)] bg-white shadow-sm overflow-hidden">
        {/* Bandeau couleur */}
        <div className="h-24 bg-gradient-to-r from-[var(--color-primary)] to-[#2471A3]" />

        <div className="px-6 pb-6">
          {/* Avatar logo */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between -mt-10">
            <div className="relative">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Changer le logo"
                className="group relative h-20 w-20 rounded-xl border-4 border-white bg-[var(--color-primary)] shadow-md overflow-hidden flex items-center justify-center cursor-pointer"
              >
                {formData.logo_url ? (
                  <img src={formData.logo_url} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-white tracking-tight">{initials}</span>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Icon name="pencil" size={18} className="text-white" />
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>

            <div className="flex flex-col gap-2 pb-1 sm:items-end">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs font-medium text-[var(--color-text)]">
                <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                {statutConfig.label}
              </span>
            </div>
          </div>

          {/* Nom + description */}
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)]/60">{copy.eyebrow}</p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-[var(--color-text)]">
              {formData.raison_sociale || copy.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">

        {/* Form */}
        <div className="rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
          <div className="border-b border-[var(--color-border)] px-6 py-4">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">{copy.editableTitle}</h2>
          </div>
          <form className="px-6 py-6 space-y-6" onSubmit={handleSubmit}>

            {/* Identité */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-subtext)]">Identité</p>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label={copy.email} name="email" type="email" value={formData.email} onChange={handleChange} required />
                <Input label={copy.companyName} name="raison_sociale" value={formData.raison_sociale} onChange={handleChange} required />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--color-text)]">Type de partenaire</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-none"
                  >
                    <option value="UNIVERSITE">Université</option>
                    <option value="ENTREPRISE_FORMATION">Entreprise de formation</option>
                    <option value="ONG">ONG</option>
                    <option value="INSTITUTION">Institution</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>
                <Input label={copy.country} name="pays" value={formData.pays} onChange={handleChange} placeholder="CI" />
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-subtext)]">Contact</p>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Site web" name="site_web" type="url" value={formData.site_web} onChange={handleChange} placeholder="https://..." />
                <Input label="Téléphone" name="telephone" type="tel" value={formData.telephone} onChange={handleChange} placeholder="+225 07 00 00 00 00" />
              </div>
            </div>

            {/* Description */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-subtext)]">Présentation</p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--color-text)]">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  maxLength={1000}
                  placeholder="Décrivez votre organisation en quelques lignes..."
                  className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-subtext)] focus:border-[var(--color-primary)] focus:outline-none resize-none"
                />
                <p className="text-xs text-[var(--color-subtext)] text-right">{formData.description.length}/1000</p>
              </div>
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
            {profil.site_web && (
              <div className="flex items-start justify-between gap-4 py-3">
                <span className="shrink-0 text-sm text-[var(--color-subtext)]">Site web</span>
                <a href={profil.site_web} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[var(--color-primary)] hover:underline break-all text-right">
                  {profil.site_web}
                </a>
              </div>
            )}
            {profil.telephone && (
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-[var(--color-subtext)]">Téléphone</span>
                <span className="text-sm font-medium text-[var(--color-text)]">{profil.telephone}</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
