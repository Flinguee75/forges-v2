import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { soumettreFormation } from '../../api/partenaires.api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../hooks/useToast';
import { PARTNER_SUBMIT_COPY, resolvePartnerLanguage } from './i18n';

const initialFormState = {
  titre: '',
  description: '',
  domaine: '',
  sous_domaine: '',
  public_cible: '',
  niveau: 'DEBUTANT',
  prerequis: '',
  objectifs: '',
  programme: '',
  competences_vises: '',
  modalite: 'EN_LIGNE',
  mode_formation: 'AVEC_SESSION',
  langue: 'FR',
  duree_heures: '',
  capacite_max: '',
  date_debut_souhaitee: '',
  date_fin_souhaitee: '',
  lieu: '',
  certification: '',
  contact_formateur: '',
  prix_coutant: '',
};

export default function SoumettreFormation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { execute, isLoading } = useApi();
  const [formData, setFormData] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const language = resolvePartnerLanguage(user?.langue_preferee);
  const copy = PARTNER_SUBMIT_COPY[language] || PARTNER_SUBMIT_COPY.FR;

  const setField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateSubmission = () => {
    const nextErrors = {};

    const requiredTextFields = [
      'titre',
      'description',
      'domaine',
      'public_cible',
      'objectifs',
      'programme',
      'competences_vises',
      'duree_heures',
      'capacite_max',
      'prix_coutant',
    ];

    requiredTextFields.forEach((field) => {
      if (!String(formData[field] || '').trim()) {
        nextErrors[field] = copy.requiredField;
      }
    });

    if (formData.prix_coutant && Number(formData.prix_coutant) <= 0) nextErrors.prix_coutant = copy.invalidAmount;
    if (formData.duree_heures && Number(formData.duree_heures) <= 0) nextErrors.duree_heures = copy.invalidDuration;
    if (formData.capacite_max && Number(formData.capacite_max) <= 0) nextErrors.capacite_max = copy.invalidCapacity;

    if (formData.mode_formation === 'AVEC_SESSION' && formData.modalite !== 'EN_LIGNE' && !formData.lieu.trim()) {
      nextErrors.lieu = copy.locationRequired;
    }

    if (formData.date_debut_souhaitee && formData.date_fin_souhaitee && new Date(formData.date_fin_souhaitee) < new Date(formData.date_debut_souhaitee)) {
      nextErrors.date_fin_souhaitee = copy.invalidEndDate;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = () => ({
    ...formData,
    duree_heures: Number(formData.duree_heures),
    capacite_max: Number(formData.capacite_max),
    prix_coutant: Math.round(Number(formData.prix_coutant) * 100),
    date_debut_souhaitee: formData.date_debut_souhaitee || null,
    date_fin_souhaitee: formData.date_fin_souhaitee || null,
    lieu: formData.lieu || null,
    certification: formData.certification || null,
    contact_formateur: formData.contact_formateur || null,
    sous_domaine: formData.sous_domaine || null,
    prerequis: formData.prerequis || null,
  });

  const handleSave = async (brouillon = false) => {
    if (!brouillon && !validateSubmission()) {
      showError(copy.formError);
      return;
    }

    try {
      const result = await execute(
        () => soumettreFormation(buildPayload(), brouillon),
        { showSuccessToast: false }
      );

      if (result) {
        showSuccess(
          brouillon
            ? copy.draftSaved
            : copy.submitted
        );
        navigate('/partenaire/formations');
      }
    } catch (error) {
      showError(error?.message || copy.saveError);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-[#fff6ef] to-white p-6 border border-[#f3d0b9]">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--color-partenaire)]">
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--color-text)]">{copy.title}</h1>
        <p className="mt-2 text-[var(--color-subtext)]">
          {copy.description}
        </p>
      </div>

      <Card title={copy.section1}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.titleLabel}</label>
            <input value={formData.titre} onChange={(e) => setField('titre', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2" />
            {errors.titre && <p className="mt-1 text-sm text-red-600">{errors.titre}</p>}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.domain}</label>
            <input value={formData.domaine} onChange={(e) => setField('domaine', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2" />
            {errors.domaine && <p className="mt-1 text-sm text-red-600">{errors.domaine}</p>}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.subdomain}</label>
            <input value={formData.sous_domaine} onChange={(e) => setField('sous_domaine', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.target}</label>
            <input value={formData.public_cible} onChange={(e) => setField('public_cible', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2" />
            {errors.public_cible && <p className="mt-1 text-sm text-red-600">{errors.public_cible}</p>}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.level}</label>
            <select value={formData.niveau} onChange={(e) => setField('niveau', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2">
              <option value="DEBUTANT">{copy.beginner}</option>
              <option value="INTERMEDIAIRE">{copy.intermediate}</option>
              <option value="AVANCE">{copy.advanced}</option>
              <option value="EXPERT">{copy.expert}</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.language}</label>
            <select value={formData.langue} onChange={(e) => setField('langue', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2">
              <option value="FR">{copy.french}</option>
              <option value="EN">{copy.english}</option>
              <option value="ES">{copy.spanish}</option>
              <option value="PT">{copy.portuguese}</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.descriptionLabel}</label>
            <textarea rows="4" value={formData.description} onChange={(e) => setField('description', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2" />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
          </div>
        </div>
      </Card>

      <Card title={copy.section2}>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.objectives}</label>
            <textarea rows="4" value={formData.objectifs} onChange={(e) => setField('objectifs', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2" />
            {errors.objectifs && <p className="mt-1 text-sm text-red-600">{errors.objectifs}</p>}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.prerequisites}</label>
            <textarea rows="3" value={formData.prerequis} onChange={(e) => setField('prerequis', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.programme}</label>
            <textarea rows="6" value={formData.programme} onChange={(e) => setField('programme', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2" />
            {errors.programme && <p className="mt-1 text-sm text-red-600">{errors.programme}</p>}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.skills}</label>
            <textarea rows="4" value={formData.competences_vises} onChange={(e) => setField('competences_vises', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2" />
            {errors.competences_vises && <p className="mt-1 text-sm text-red-600">{errors.competences_vises}</p>}
          </div>
        </div>
      </Card>

      <Card title={copy.section3}>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.modality}</label>
            <select value={formData.modalite} onChange={(e) => setField('modalite', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2">
              <option value="EN_LIGNE">{copy.online}</option>
              <option value="HYBRIDE">{copy.hybrid}</option>
              <option value="PRESENTIEL">{copy.inPerson}</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.mode}</label>
            <select value={formData.mode_formation} onChange={(e) => setField('mode_formation', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2">
              <option value="AVEC_SESSION">{copy.withSession}</option>
              <option value="A_LA_DEMANDE">{copy.onDemand}</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.duration}</label>
            <input type="number" min="1" value={formData.duree_heures} onChange={(e) => setField('duree_heures', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2" />
            {errors.duree_heures && <p className="mt-1 text-sm text-red-600">{errors.duree_heures}</p>}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.capacity}</label>
            <input type="number" min="1" value={formData.capacite_max} onChange={(e) => setField('capacite_max', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2" />
            {errors.capacite_max && <p className="mt-1 text-sm text-red-600">{errors.capacite_max}</p>}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.startDate}</label>
            <input type="date" value={formData.date_debut_souhaitee} onChange={(e) => setField('date_debut_souhaitee', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.endDate}</label>
            <input type="date" value={formData.date_fin_souhaitee} onChange={(e) => setField('date_fin_souhaitee', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2" />
            {errors.date_fin_souhaitee && <p className="mt-1 text-sm text-red-600">{errors.date_fin_souhaitee}</p>}
          </div>
          <div className="md:col-span-3">
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.location}</label>
            <input type="text" value={formData.lieu} onChange={(e) => setField('lieu', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2" />
            {errors.lieu && <p className="mt-1 text-sm text-red-600">{errors.lieu}</p>}
          </div>
        </div>
      </Card>

      <Card title={copy.section4}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.trainerContact}</label>
            <input type="text" value={formData.contact_formateur} onChange={(e) => setField('contact_formateur', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.certification}</label>
            <input type="text" value={formData.certification} onChange={(e) => setField('certification', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2" />
          </div>
        </div>
      </Card>

      <Card title={copy.section5}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">{copy.costPrice}</label>
            <input type="number" min="1" step="1" value={formData.prix_coutant} onChange={(e) => setField('prix_coutant', e.target.value)} className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2" />
            {errors.prix_coutant && <p className="mt-1 text-sm text-red-600">{errors.prix_coutant}</p>}
          </div>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-sm text-[var(--color-subtext)]">
            {copy.readonlyNotice}
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button variant="secondary" onClick={() => navigate('/partenaire/formations')} disabled={isLoading}>
          {copy.cancel}
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={() => handleSave(true)} disabled={isLoading}>
            {copy.saveDraft}
          </Button>
          <Button variant="primary" onClick={() => handleSave(false)} disabled={isLoading}>
            {isLoading ? copy.submitting : copy.submitForReview}
          </Button>
        </div>
      </div>
    </div>
  );
}
