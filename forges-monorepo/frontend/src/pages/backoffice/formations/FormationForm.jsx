import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { formationsApi } from '../../../api/formations.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/feedback/Spinner';

const DEFAULT_FORM = {
  intitule: '',
  description_courte: '',
  description_longue: '',
  duree_jours: 1,
  cout_catalogue: 0,
  type_formation: '',
  mode_formation: 'PRESENTIEL',
  lieu: '',
  pilier_abonnement: '',
  langues_disponibles: 'FR',
  certification_delivree: false,
  public_cible: '',
  objectifs_pedagogiques: '',
  prerequis: '',
  duree_acces_jours: 365,
  url_contenu: '',
};

function normalizeToForm(formation) {
  if (!formation) return DEFAULT_FORM;

  return {
    intitule: formation.intitule || formation.titre || '',
    description_courte: formation.description_courte || formation.description || '',
    description_longue: formation.description_longue || '',
    duree_jours: formation.duree_jours ?? formation.duree ?? 1,
    cout_catalogue: formation.cout_catalogue ?? formation.tarif ?? 0,
    type_formation: formation.type_formation || '',
    mode_formation: formation.mode_formation || 'PRESENTIEL',
    lieu: formation.lieu || '',
    pilier_abonnement: formation.pilier_abonnement || '',
    langues_disponibles: Array.isArray(formation.langues_disponibles)
      ? formation.langues_disponibles.join(', ')
      : 'FR',
    certification_delivree: Boolean(formation.certification_delivree),
    public_cible: formation.public_cible || '',
    objectifs_pedagogiques: Array.isArray(formation.objectifs_pedagogiques)
      ? formation.objectifs_pedagogiques.join(', ')
      : '',
    prerequis: formation.prerequis || '',
    duree_acces_jours: formation.duree_acces_jours ?? 365,
    url_contenu: formation.url_contenu || '',
  };
}

function buildPayload(formData) {
  const langues = formData.langues_disponibles
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter((value) => ['FR', 'EN', 'ES', 'PT'].includes(value));

  const objectifs = formData.objectifs_pedagogiques
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const payload = {
    intitule: formData.intitule.trim(),
    description_courte: formData.description_courte.trim(),
    description_longue: formData.description_longue.trim() || undefined,
    duree_jours: Number(formData.duree_jours),
    cout_catalogue: Number(formData.cout_catalogue),
    mode_formation: formData.mode_formation,
    langues_disponibles: langues.length > 0 ? langues : ['FR'],
    certification_delivree: Boolean(formData.certification_delivree),
    public_cible: formData.public_cible.trim() || undefined,
    objectifs_pedagogiques: objectifs.length > 0 ? objectifs : undefined,
    prerequis: formData.prerequis.trim() || undefined,
    duree_acces_jours: Number(formData.duree_acces_jours),
    lieu: formData.lieu.trim() || undefined,
  };

  if (formData.url_contenu && formData.url_contenu.trim()) {
    payload.url_contenu = formData.url_contenu.trim();
  }

  if (formData.type_formation) {
    payload.type_formation = formData.type_formation;
  }

  if (formData.pilier_abonnement) {
    payload.pilier_abonnement = formData.pilier_abonnement;
  }

  return payload;
}

export default function FormationForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { execute, isLoading, error } = useApi();

  const isEdit = Boolean(id);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [initialLoaded, setInitialLoaded] = useState(!isEdit);

  const title = useMemo(() => (isEdit ? 'Édition formation' : 'Création formation'), [isEdit]);

  useEffect(() => {
    if (!isEdit) return;

    execute(() => formationsApi.getByIdBackoffice(id), {
      onSuccess: (response) => {
        setFormData(normalizeToForm(response?.data || response));
        setInitialLoaded(true);
      },
    }).catch(() => {
      setInitialLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: '' }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.intitule.trim()) nextErrors.intitule = 'L’intitulé est obligatoire.';
    if (!formData.description_courte.trim()) nextErrors.description_courte = 'La description courte est obligatoire.';
    if (!Number.isInteger(Number(formData.duree_jours)) || Number(formData.duree_jours) < 1) {
      nextErrors.duree_jours = 'La durée doit être un entier supérieur ou égal à 1.';
    }
    if (!Number.isInteger(Number(formData.cout_catalogue)) || Number(formData.cout_catalogue) < 0) {
      nextErrors.cout_catalogue = 'Le tarif doit être un entier positif en FCFA.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const payload = buildPayload(formData);

    await execute(
      () => (isEdit ? formationsApi.update(id, payload) : formationsApi.create(payload)),
      {
        onSuccess: (response) => {
          const saved = response?.data || response;
          const nextId = saved?.id || id;
          navigate(`/backoffice/formations/${nextId}`);
        },
      }
    );
  };

  if (isEdit && !initialLoaded && isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
          Formulaire formation
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-primary">
          {title}
        </h2>
        <p className="mt-2 text-subtext">
          Création et édition des formations backoffice.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <Card>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Intitulé"
              value={formData.intitule}
              onChange={(event) => handleChange('intitule', event.target.value)}
              error={fieldErrors.intitule}
              required
            />
            <Input
              type="number"
              label="Durée (jours)"
              value={formData.duree_jours}
              onChange={(event) => handleChange('duree_jours', event.target.value)}
              error={fieldErrors.duree_jours}
              min="1"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">
              Description courte
            </label>
            <textarea
              value={formData.description_courte}
              onChange={(event) => handleChange('description_courte', event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {fieldErrors.description_courte && (
              <p className="mt-1 text-sm text-danger">{fieldErrors.description_courte}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">
              Description longue
            </label>
            <textarea
              value={formData.description_longue}
              onChange={(event) => handleChange('description_longue', event.target.value)}
              rows={5}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="number"
              label="Tarif catalogue (FCFA)"
              value={formData.cout_catalogue}
              onChange={(event) => handleChange('cout_catalogue', event.target.value)}
              error={fieldErrors.cout_catalogue}
              min="0"
              required
            />
            <Input
              type="number"
              label="Durée accès (jours)"
              value={formData.duree_acces_jours}
              onChange={(event) => handleChange('duree_acces_jours', event.target.value)}
              min="1"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">
                Mode formation
              </label>
              <select
                value={formData.mode_formation}
                onChange={(event) => handleChange('mode_formation', event.target.value)}
                className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="PRESENTIEL">Présentiel</option>
                <option value="EN_LIGNE">En ligne</option>
                <option value="A_LA_DEMANDE">À la demande</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">
                Type formation
              </label>
              <select
                value={formData.type_formation}
                onChange={(event) => handleChange('type_formation', event.target.value)}
                className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Automatique / non précisé</option>
                <option value="STANDARD">Standard</option>
                <option value="PREMIUM">Premium</option>
                <option value="SUR_DEVIS">Sur devis</option>
              </select>
            </div>
          </div>

          {(formData.mode_formation === 'PRESENTIEL' || formData.mode_formation === 'EN_LIGNE') && (
            <Input
              label="Lieu"
              value={formData.lieu}
              onChange={(event) => handleChange('lieu', event.target.value)}
              placeholder="Ex: AIGF, Abidjan, Côte d'Ivoire"
            />
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">
                Piliers abonnement
              </label>
              <select
                value={formData.pilier_abonnement}
                onChange={(event) => handleChange('pilier_abonnement', event.target.value)}
                className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Non défini</option>
                <option value="RETAIL">Retail</option>
                <option value="B2B">B2B</option>
                <option value="INSTITUTIONNEL">Institutionnel</option>
                <option value="TOUS">Tous</option>
              </select>
            </div>
            <Input
              label="Langues disponibles"
              value={formData.langues_disponibles}
              onChange={(event) => handleChange('langues_disponibles', event.target.value)}
              placeholder="FR, EN"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Public cible"
              value={formData.public_cible}
              onChange={(event) => handleChange('public_cible', event.target.value)}
            />
            <Input
              label="Prérequis"
              value={formData.prerequis}
              onChange={(event) => handleChange('prerequis', event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">
              Objectifs pédagogiques
            </label>
            <textarea
              value={formData.objectifs_pedagogiques}
              onChange={(event) => handleChange('objectifs_pedagogiques', event.target.value)}
              rows={4}
              placeholder="Objectif 1, Objectif 2"
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {formData.mode_formation === 'A_LA_DEMANDE' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">
                URL du contenu (LMS)
              </label>
              <input
                type="url"
                value={formData.url_contenu}
                onChange={(event) => handleChange('url_contenu', event.target.value)}
                placeholder="https://lms.forges.com/formations/..."
                className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-subtext">
                L'URL sera chiffrée (AES-256) avant stockage. Visible uniquement pour les formations à la demande.
              </p>
            </div>
          )}

          <label className="flex items-center gap-3 text-sm text-text">
            <input
              type="checkbox"
              checked={formData.certification_delivree}
              onChange={(event) => handleChange('certification_delivree', event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            Certification délivrée
          </label>

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/backoffice/formations')}
              disabled={isLoading}
            >
              Retour
            </Button>
            <Button type="submit" loading={isLoading}>
              {isEdit ? 'Enregistrer' : 'Créer la formation'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
