import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formationsApi } from '../../api/formations.api';
import { organisationApi } from '../../api/espace-organisation.api';
import { useAuth } from '../../hooks/useAuth';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/feedback/Spinner';
import EmptyState from '../../components/feedback/EmptyState';
import FormationDetailView from '../../components/formations/FormationDetailView';

export default function FormationDetailApprenantPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isOrg = user?.role === 'ORGANISATION';
  const basePath = isOrg ? '/organisation' : '/apprenant';
  const { execute, isLoading, error } = useApi();
  const [formation, setFormation] = useState(null);

  // Modale inscription employé (org uniquement)
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [membres, setMembres] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [form, setForm] = useState({ beneficiaire_id: '', session_id: '', source_financement: 'B2B', voucher_organisation_id: '' });
  const [inscriptionSuccess, setInscriptionSuccess] = useState(false);
  const [inscriptionLoading, setInscriptionLoading] = useState(false);

  const openModal = async () => {
    setStep(1);
    setForm({ beneficiaire_id: '', session_id: '', source_financement: 'B2B', voucher_organisation_id: '' });
    setInscriptionSuccess(false);
    setModalOpen(true);
    const [membreRes, sessionRes, voucherRes] = await Promise.all([
      organisationApi.getMembres({ limit: 100 }).catch(() => ({ data: [] })),
      formationsApi.getSessionsOuvertes(id).catch(() => []),
      organisationApi.getVouchers({ statut: 'ACTIF', limit: 100 }).catch(() => ({ data: [] })),
    ]);
    setMembres(membreRes?.data || []);
    setSessions(Array.isArray(sessionRes?.data) ? sessionRes.data : Array.isArray(sessionRes) ? sessionRes : []);
    setVouchers((voucherRes?.data || []).filter((v) => v.statut === 'ACTIF'));
  };

  const handleInscrire = async () => {
    setInscriptionLoading(true);
    try {
      await organisationApi.inscrireBeneficiaire({
        beneficiaire_id: form.beneficiaire_id,
        session_id: form.session_id,
        source_financement: form.source_financement,
        ...(form.source_financement === 'VOUCHER' && { voucher_organisation_id: form.voucher_organisation_id }),
      });
      setInscriptionSuccess(true);
    } finally {
      setInscriptionLoading(false);
    }
  };

  useEffect(() => {
    execute(() => formationsApi.getFormationDetail(id), {
      onSuccess: (response) => setFormation(response?.data || response),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading && !formation) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (error && !formation) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card>
          <EmptyState
            title="Formation indisponible"
            message={error}
            action={
              <Button onClick={() => navigate(`${basePath}/catalogue`)}>
                Retour au catalogue
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  if (!formation) return null;

  const isALaDemande = formation.mode_formation === 'A_LA_DEMANDE';

  const apprenantActions = (
    <Button onClick={() => navigate(`/apprenant/inscrire/${id}`)}>
      {isALaDemande ? 'Accéder maintenant' : "S'inscrire à une session"}
    </Button>
  );

  const orgActions = (
    <Button onClick={openModal} data-testid="btn-inscrire-employe">
      Inscrire un employe
    </Button>
  );

  const canStep2 = form.beneficiaire_id !== '';
  const canStep3 = form.session_id !== '';
  const canSubmit = form.source_financement === 'B2B' || form.voucher_organisation_id !== '';

  return (
    <div className="mx-auto max-w-5xl">
      <button
        type="button"
        onClick={() => navigate(`${basePath}/catalogue`)}
        className="mb-4 text-sm text-primary hover:underline"
      >
        &larr; Retour au catalogue
      </button>
      <FormationDetailView formation={formation} actions={isOrg ? orgActions : (isALaDemande ? null : apprenantActions)} />
      <div className="mt-6 pb-6">
        <Button variant="outline" onClick={() => navigate(`${basePath}/catalogue`)}>
          Retour au catalogue
        </Button>
      </div>

      {isOrg && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Inscrire un employe" size="medium">
          {inscriptionSuccess ? (
            <div className="space-y-4 text-center py-4">
              <p className="text-success font-semibold">Inscription enregistree avec succes.</p>
              <p className="text-subtext text-sm">L'employe a ete notifie par email.</p>
              <Button onClick={() => setModalOpen(false)}>Fermer</Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Indicateur d'étapes */}
              <div className="flex items-center gap-2 text-sm">
                {[1, 2, 3].map((s) => (
                  <span key={s} className={`flex h-7 w-7 items-center justify-center rounded-full font-semibold ${step === s ? 'bg-primary text-white' : step > s ? 'bg-success text-white' : 'bg-border text-subtext'}`}>{s}</span>
                ))}
                <span className="ml-1 text-subtext">
                  {step === 1 ? 'Beneficiaire' : step === 2 ? 'Session' : 'Financement'}
                </span>
              </div>

              {/* Etape 1 — Choisir le bénéficiaire */}
              {step === 1 && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-text">Selectionner un employe</label>
                  <select
                    data-testid="select-beneficiaire"
                    className="w-full rounded-md border border-border px-3 py-2 text-sm"
                    value={form.beneficiaire_id}
                    onChange={(e) => setForm({ ...form, beneficiaire_id: e.target.value })}
                  >
                    <option value="">-- Choisir --</option>
                    {membres.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.prenoms || m.prenom} {m.nom} — {m.email}
                      </option>
                    ))}
                  </select>
                  <div className="flex justify-end">
                    <Button onClick={() => setStep(2)} disabled={!canStep2}>Suivant</Button>
                  </div>
                </div>
              )}

              {/* Etape 2 — Choisir la session */}
              {step === 2 && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-text">Selectionner une session</label>
                  <select
                    data-testid="select-session"
                    className="w-full rounded-md border border-border px-3 py-2 text-sm"
                    value={form.session_id}
                    onChange={(e) => setForm({ ...form, session_id: e.target.value })}
                  >
                    <option value="">-- Choisir --</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {new Date(s.date_debut).toLocaleDateString('fr-FR')} — {new Date(s.date_fin).toLocaleDateString('fr-FR')}
                        {s.lieu ? ` (${s.lieu})` : ''}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2 justify-between">
                    <Button variant="outline" onClick={() => setStep(1)}>Retour</Button>
                    <Button onClick={() => setStep(3)} disabled={!canStep3}>Suivant</Button>
                  </div>
                </div>
              )}

              {/* Etape 3 — Choisir le financement */}
              {step === 3 && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-text">Mode de financement</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:border-primary">
                      <input
                        type="radio"
                        name="source_financement"
                        value="B2B"
                        checked={form.source_financement === 'B2B'}
                        onChange={() => setForm({ ...form, source_financement: 'B2B', voucher_organisation_id: '' })}
                      />
                      <span className="text-sm">Abonnement B2B (place deduite du quota)</span>
                    </label>
                    <label className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:border-primary">
                      <input
                        type="radio"
                        name="source_financement"
                        value="VOUCHER"
                        checked={form.source_financement === 'VOUCHER'}
                        onChange={() => setForm({ ...form, source_financement: 'VOUCHER' })}
                      />
                      <span className="text-sm">Voucher organisation</span>
                    </label>
                  </div>
                  {form.source_financement === 'VOUCHER' && (
                    <select
                      data-testid="select-voucher"
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                      value={form.voucher_organisation_id}
                      onChange={(e) => setForm({ ...form, voucher_organisation_id: e.target.value })}
                    >
                      <option value="">-- Choisir un voucher --</option>
                      {vouchers.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.code} {v.formation ? `— ${v.formation.titre || v.formation.intitule}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="flex gap-2 justify-between">
                    <Button variant="outline" onClick={() => setStep(2)}>Retour</Button>
                    <Button
                      onClick={handleInscrire}
                      loading={inscriptionLoading}
                      disabled={!canSubmit}
                      data-testid="btn-confirmer-inscription-employe"
                    >
                      Inscrire
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
