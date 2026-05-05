import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import devisApi from '../../../api/devis.api';
import formationsApi from '../../../api/formations.api';
import { organisationsApi } from '../../../api/organisations.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

export default function DevisForm() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { execute, isLoading } = useApi();

  const [formations, setFormations] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [formData, setFormData] = useState({
    organisation_id: '',
    formation_id: '',
    session_id: '',
    nb_places: 1,
    tarif_unitaire_xof: '',
    notes_admin: '',
  });

  const montantTotal = useMemo(() => {
    const places = Number(formData.nb_places) || 0;
    const tarif = Number(formData.tarif_unitaire_xof) || 0;
    return places * tarif;
  }, [formData.nb_places, formData.tarif_unitaire_xof]);

  useEffect(() => {
    execute(() => formationsApi.getAllBackoffice({ limit: 200 }), {
      onSuccess: (data) => setFormations(Array.isArray(data?.data) ? data.data : []),
      showErrorToast: false,
    });
    execute(() => organisationsApi.getAll({ limit: 200 }), {
      onSuccess: (data) => setOrganisations(Array.isArray(data?.data) ? data.data : []),
      showErrorToast: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field) => (e) => {
    setFormData((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await execute(() => devisApi.create(formData), {
      onSuccess: (devis) => {
        showToast(`Devis ${devis.numero_devis} créé.`, 'success');
        navigate(`/backoffice/devis/${devis.id}`);
      },
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">Nouveau devis</p>
        <h2 className="mt-3 text-2xl font-semibold text-primary">Création d'un devis</h2>
        <p className="mt-2 text-subtext">Le montant total est calculé automatiquement à partir du tarif unitaire et du nombre de places.</p>
      </div>

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Organisation</label>
            <select
              data-testid="select-organisation"
              value={formData.organisation_id}
              onChange={handleChange('organisation_id')}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text"
              required
            >
              <option value="">Sélectionner une organisation</option>
              {organisations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.raison_sociale}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Formation</label>
            <select
              data-testid="select-formation"
              value={formData.formation_id}
              onChange={handleChange('formation_id')}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text"
              required
            >
              <option value="">Sélectionner une formation</option>
              {formations.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.intitule || f.titre}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="ID session (optionnel)"
            placeholder="UUID de la session liée"
            value={formData.session_id}
            onChange={handleChange('session_id')}
            data-testid="input-session-id"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              type="number"
              label="Nombre de places"
              min={1}
              value={formData.nb_places}
              onChange={handleChange('nb_places')}
              data-testid="input-nb-places"
              required
            />
            <Input
              type="number"
              label="Tarif unitaire (XOF)"
              min={1}
              value={formData.tarif_unitaire_xof}
              onChange={handleChange('tarif_unitaire_xof')}
              data-testid="input-tarif"
              required
            />
          </div>

          {montantTotal > 0 && (
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <p className="text-sm text-subtext">Montant total estimé</p>
              <p className="mt-1 text-xl font-semibold text-primary" data-testid="montant-total-preview">
                {montantTotal.toLocaleString('fr-FR')} XOF
              </p>
              <p className="mt-1 text-xs text-subtext">Confirmé par le backend à la création.</p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Notes admin (optionnel)</label>
            <textarea
              value={formData.notes_admin}
              onChange={handleChange('notes_admin')}
              maxLength={1000}
              rows={3}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text"
              placeholder="Contexte, conditions particulières..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate('/backoffice/devis')}>
              Annuler
            </Button>
            <Button type="submit" loading={isLoading} data-testid="btn-submit-devis">
              Créer le devis
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
