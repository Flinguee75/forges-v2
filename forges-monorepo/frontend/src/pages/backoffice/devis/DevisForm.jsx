import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import devisApi from '../../../api/devis.api';
import formationsApi from '../../../api/formations.api';
import { sessionsApi } from '../../../api/sessions.api';
import { organisationsApi } from '../../../api/organisations.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const TYPE_DEVIS = { ORGANISATION: 'ORGANISATION', APPRENANT: 'APPRENANT' };

export default function DevisForm() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { execute, isLoading } = useApi();

  const [typeDevis, setTypeDevis] = useState(TYPE_DEVIS.ORGANISATION);
  const [formations, setFormations] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [devisCree, setDevisCree] = useState(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [formData, setFormData] = useState({
    organisation_id: '',
    destinataire_nom: '',
    destinataire_email: '',
    destinataire_organisation: '',
    formation_id: '',
    session_id: '',
    nb_places: 1,
    tarif_unitaire_xof: '',
    notes_admin: '',
  });

  const estApprenant = typeDevis === TYPE_DEVIS.APPRENANT;

  const montantTotal = useMemo(() => {
    const places = estApprenant ? 1 : Number(formData.nb_places) || 0;
    const tarif = Number(formData.tarif_unitaire_xof) || 0;
    return places * tarif;
  }, [estApprenant, formData.nb_places, formData.tarif_unitaire_xof]);

  useEffect(() => {
    execute(() => formationsApi.getAllBackoffice({ limit: 200 }), {
      onSuccess: (data) => setFormations(Array.isArray(data?.data) ? data.data : []),
      showErrorToast: false,
    });
    execute(() => organisationsApi.getAll({ limit: 200 }), {
      onSuccess: (data) => setOrganisations(Array.isArray(data?.data) ? data.data : []),
      showErrorToast: false,
    });
    execute(() => sessionsApi.getBackofficeList({ limit: 200 }), {
      onSuccess: (data) => setSessions(Array.isArray(data?.data) ? data.data : []),
      showErrorToast: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setFormData((f) => ({
      ...f,
      [field]: value,
      ...(field === 'formation_id' ? { session_id: '' } : {}),
    }));
  };

  const handleTypeChange = (type) => {
    setTypeDevis(type);
    setFormData((f) => ({
      ...f,
      organisation_id: '',
      destinataire_nom: '',
      destinataire_email: '',
      destinataire_organisation: '',
    }));
  };

  const selectedFormationSessions = useMemo(() => {
    if (!formData.formation_id) return [];
    const openStatuses = ['PLANIFIEE', 'A_VENIR', 'INSCRIPTIONS_OUVERTES', 'OUVERTE', 'EN_COURS'];
    return sessions.filter((session) => {
      const sessionFormationId = session?.formation_id || session?.formation?.id;
      return sessionFormationId === formData.formation_id && openStatuses.includes(session?.statut);
    });
  }, [formData.formation_id, sessions]);

  const formatSessionLabel = (session) => {
    if (!session) return '';
    const options = { timeZone: 'UTC' };
    const debut = session.date_debut ? new Date(session.date_debut).toLocaleDateString('fr-FR', options) : '';
    const fin = session.date_fin ? new Date(session.date_fin).toLocaleDateString('fr-FR', options) : '';
    const periode = debut && fin ? `du ${debut} au ${fin}` : 'dates indisponibles';
    const lieu = session.lieu ? ` - ${session.lieu}` : '';
    return `${periode}${lieu}`;
  };

  const buildPayload = () => {
    if (estApprenant) {
      return {
        destinataire_nom: formData.destinataire_nom,
        destinataire_email: formData.destinataire_email,
        destinataire_organisation: formData.destinataire_organisation || undefined,
        formation_id: formData.formation_id,
        session_id: formData.session_id,
        tarif_unitaire_xof: Number(formData.tarif_unitaire_xof),
        notes_admin: formData.notes_admin || undefined,
      };
    }
    return {
      organisation_id: formData.organisation_id,
      formation_id: formData.formation_id,
      session_id: formData.session_id,
      nb_places: Number(formData.nb_places),
      tarif_unitaire_xof: Number(formData.tarif_unitaire_xof),
      notes_admin: formData.notes_admin || undefined,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await execute(() => devisApi.create(buildPayload()), {
      onSuccess: (devis) => {
        showToast(`Facture ${devis.numero_devis} creee.`, 'success');
        setDevisCree(devis);
      },
    });
  };

  const handleEnvoyerEmail = async () => {
    setIsSendingEmail(true);
    try {
      const result = await devisApi.envoyerEmail(devisCree.id);
      const dest = estApprenant
        ? devisCree.destinataire_email
        : result?.to || "l'organisation";
      showToast(`Email envoye a ${dest}.`, 'success');
    } catch {
      showToast("Erreur lors de l'envoi de l'email.", 'error');
    } finally {
      setIsSendingEmail(false);
      navigate(`/backoffice/devis/${devisCree.id}`);
    }
  };

  const handlePlusTard = () => {
    navigate(`/backoffice/devis/${devisCree.id}`);
  };

  if (devisCree) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-xl bg-white p-8 shadow-lg text-center space-y-6">
          <div className="w-14 h-14 mx-auto rounded-full bg-green-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-primary">Facture creee</h2>
            <p className="mt-1 font-mono text-sm text-subtext">{devisCree.numero_devis}</p>
          </div>
          <p className="text-sm text-text">
            {estApprenant
              ? `Voulez-vous envoyer cette facture par email a ${devisCree.destinataire_nom} maintenant ?`
              : "Voulez-vous envoyer cette facture par email a l'organisation maintenant ?"}
          </p>
          <div className="flex flex-col gap-3">
            <Button loading={isSendingEmail} onClick={handleEnvoyerEmail} className="w-full">
              Envoyer maintenant
            </Button>
            <Button variant="outline" onClick={handlePlusTard} className="w-full">
              Plus tard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">Nouvelle facture</p>
        <h2 className="mt-3 text-2xl font-semibold text-primary">Creation d'une facture</h2>
        <p className="mt-2 text-subtext">Le montant total est calcule automatiquement par le serveur.</p>
      </div>

      <Card>
        <div className="mb-6">
          <p className="mb-2 text-sm font-medium text-text">Type de destinataire</p>
          <div className="flex gap-2" data-testid="toggle-type-devis">
            <button
              type="button"
              data-testid="toggle-organisation"
              onClick={() => handleTypeChange(TYPE_DEVIS.ORGANISATION)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                typeDevis === TYPE_DEVIS.ORGANISATION
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-white text-text hover:bg-gray-50'
              }`}
            >
              Organisation (B2B)
            </button>
            <button
              type="button"
              data-testid="toggle-apprenant"
              onClick={() => handleTypeChange(TYPE_DEVIS.APPRENANT)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                typeDevis === TYPE_DEVIS.APPRENANT
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-white text-text hover:bg-gray-50'
              }`}
            >
              Apprenant individuel
            </button>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {typeDevis === TYPE_DEVIS.ORGANISATION ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text">Organisation</label>
              <select
                data-testid="select-organisation"
                value={formData.organisation_id}
                onChange={handleChange('organisation_id')}
                className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text"
                required
              >
                <option value="">Selectionner une organisation</option>
                {organisations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.raison_sociale}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Nom complet"
                  value={formData.destinataire_nom}
                  onChange={handleChange('destinataire_nom')}
                  data-testid="input-destinataire-nom"
                  placeholder="Kone Mamadou"
                  required
                />
                <Input
                  type="email"
                  label="Email"
                  value={formData.destinataire_email}
                  onChange={handleChange('destinataire_email')}
                  data-testid="input-destinataire-email"
                  placeholder="mamadou.kone@example.com"
                  required
                />
              </div>
              <Input
                label="Entreprise / Organisme (optionnel)"
                value={formData.destinataire_organisation}
                onChange={handleChange('destinataire_organisation')}
                data-testid="input-destinataire-organisation"
                placeholder="Ex : ACME CI, Ministere de l'Education..."
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Formation</label>
            <select
              data-testid="select-formation"
              value={formData.formation_id}
              onChange={handleChange('formation_id')}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text"
              required
            >
              <option value="">Selectionner une formation</option>
              {formations.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.intitule || f.titre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">Session</label>
            <select
              data-testid="select-session"
              value={formData.session_id}
              onChange={handleChange('session_id')}
              className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text"
              required
              disabled={!formData.formation_id}
            >
              <option value="">
                {formData.formation_id ? 'Selectionner une session' : 'Selectionnez d abord une formation'}
              </option>
              {selectedFormationSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {formatSessionLabel(session)}
                </option>
              ))}
            </select>
            {formData.formation_id && selectedFormationSessions.length === 0 && (
              <p className="mt-1 text-xs text-warning">
                Aucune session planifiee, a venir ou ouverte n&apos;est disponible pour cette formation.
              </p>
            )}
          </div>

          <div className={`grid gap-4 ${estApprenant ? '' : 'md:grid-cols-2'}`}>
            {!estApprenant && (
              <Input
                type="number"
                label="Nombre de places"
                min={1}
                value={formData.nb_places}
                onChange={handleChange('nb_places')}
                data-testid="input-nb-places"
                required
              />
            )}
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
              <p className="text-sm text-subtext">Montant total estime</p>
              <p className="mt-1 text-xl font-semibold text-primary" data-testid="montant-total-preview">
                {montantTotal.toLocaleString('fr-FR')} XOF
              </p>
              {estApprenant && (
                <p className="mt-1 text-xs text-subtext">1 place - tarif individuel.</p>
              )}
              <p className="mt-1 text-xs text-subtext">Confirme par le backend a la creation.</p>
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
              placeholder="Contexte, conditions particulieres..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate('/backoffice/devis')}>
              Annuler
            </Button>
            <Button type="submit" loading={isLoading} data-testid="btn-submit-devis">
              Creer la facture
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
