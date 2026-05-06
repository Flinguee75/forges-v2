import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { sessionsApi } from '../../../api/sessions.api';
import { formationsApi } from '../../../api/formations.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/feedback/Spinner';

const DEFAULT_FORM = {
  formation_id: '',
  date_ouverture: '',
  date_cloture: '',
  date_debut: '',
  date_fin: '',
  capacite: 20,
};

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocal(value) {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

export default function SessionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { execute, isLoading, error } = useApi();

  const isEdit = Boolean(id);
  const [formations, setFormations] = useState([]);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [initialLoaded, setInitialLoaded] = useState(!isEdit);

  const title = useMemo(() => (isEdit ? 'Édition session' : 'Création session'), [isEdit]);

  const loadFormations = async () => {
    await execute(() => formationsApi.getAllBackoffice({ limit: 100 }), {
      onSuccess: (response) => {
        setFormations(response?.data || []);
      },
    });
  };

  useEffect(() => {
    loadFormations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isEdit) return;

    execute(() => sessionsApi.getById(id), {
      onSuccess: (response) => {
        const session = response?.data || response;
        setFormData({
          formation_id: session.formation_id || session.formation?.id || '',
          date_ouverture: toDateTimeLocal(session.date_ouverture),
          date_cloture: toDateTimeLocal(session.date_cloture),
          date_debut: toDateTimeLocal(session.date_debut),
          date_fin: toDateTimeLocal(session.date_fin),
          capacite: session.capacite ?? 20,
        });
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

    if (!formData.formation_id) nextErrors.formation_id = 'La formation est obligatoire.';
    if (!formData.date_ouverture) nextErrors.date_ouverture = 'La date d’ouverture est obligatoire.';
    if (!formData.date_cloture) nextErrors.date_cloture = 'La date de clôture est obligatoire.';
    if (!formData.date_debut) nextErrors.date_debut = 'La date de début est obligatoire.';
    if (!formData.date_fin) nextErrors.date_fin = 'La date de fin est obligatoire.';
    if (!Number.isInteger(Number(formData.capacite)) || Number(formData.capacite) < 1) {
      nextErrors.capacite = 'La capacité doit être un entier supérieur ou égal à 1.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const payload = {
      formation_id: formData.formation_id,
      date_ouverture: fromDateTimeLocal(formData.date_ouverture),
      date_cloture: fromDateTimeLocal(formData.date_cloture),
      date_debut: fromDateTimeLocal(formData.date_debut),
      date_fin: fromDateTimeLocal(formData.date_fin),
      capacite: Number(formData.capacite),
    };

    await execute(
      () => (isEdit ? sessionsApi.update(id, payload) : sessionsApi.create(payload)),
      {
        onSuccess: (response) => {
          const saved = response?.data || response;
          const nextId = saved?.id || id;
          navigate(`/backoffice/sessions/${nextId}`);
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
          Formulaire session
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-primary">
          {title}
        </h2>
        <p className="mt-2 text-subtext">
          Création et édition des sessions backoffice.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      <Card>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">
              Formation
            </label>
            <select
              value={formData.formation_id}
              onChange={(event) => handleChange('formation_id', event.target.value)}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Sélectionner une formation</option>
              {formations.map((formation) => (
                <option key={formation.id} value={formation.id}>
                  {formation.titre}
                </option>
              ))}
            </select>
            {fieldErrors.formation_id && (
              <p className="mt-1 text-sm text-danger">{fieldErrors.formation_id}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="datetime-local"
              label="Date ouverture"
              value={formData.date_ouverture}
              onChange={(event) => handleChange('date_ouverture', event.target.value)}
              error={fieldErrors.date_ouverture}
              required
            />
            <Input
              type="datetime-local"
              label="Date clôture"
              value={formData.date_cloture}
              onChange={(event) => handleChange('date_cloture', event.target.value)}
              error={fieldErrors.date_cloture}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="datetime-local"
              label="Date début"
              value={formData.date_debut}
              onChange={(event) => handleChange('date_debut', event.target.value)}
              error={fieldErrors.date_debut}
              required
            />
            <Input
              type="datetime-local"
              label="Date fin"
              value={formData.date_fin}
              onChange={(event) => handleChange('date_fin', event.target.value)}
              error={fieldErrors.date_fin}
              required
            />
          </div>

          <Input
            type="number"
            label="Capacité"
            value={formData.capacite}
            onChange={(event) => handleChange('capacite', event.target.value)}
            error={fieldErrors.capacite}
            min="1"
            required
          />

          <div className="rounded-lg border border-border bg-gray-50 p-4 text-sm text-subtext">
            Les dates sont validées automatiquement. Les sessions ne peuvent pas se chevaucher sur la même formation.
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/backoffice/sessions')}
              disabled={isLoading}
            >
              Retour
            </Button>
            <Button type="submit" loading={isLoading}>
              {isEdit ? 'Enregistrer' : 'Créer la session'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
