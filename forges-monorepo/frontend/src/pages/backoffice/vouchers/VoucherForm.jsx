import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import vouchersApi from '../../../api/vouchers.api';
import formationsApi from '../../../api/formations.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/feedback/Spinner';

function getDefaultExpiry() {
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  return nextYear.toISOString().slice(0, 10);
}

export default function VoucherForm() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { execute, isLoading } = useApi();

  const [formations, setFormations] = useState([]);
  const [modeCreation, setModeCreation] = useState('PROMOTIONNEL');
  const [formData, setFormData] = useState({
    formation_id: '',
    valeur: 10,
    type_valeur: 'POURCENTAGE',
    quota_max: 1,
    date_expiration: getDefaultExpiry(),
    devis_id: '',
  });
  const [createdVoucher, setCreatedVoucher] = useState(null);

  useEffect(() => {
    execute(() => formationsApi.getAllBackoffice({ limit: 100 }), {
      onSuccess: (data) => {
        setFormations(Array.isArray(data?.data) ? data.data : []);
        if (!formData.formation_id && Array.isArray(data?.data) && data.data[0]?.id) {
          setFormData((current) => ({ ...current, formation_id: data.data[0].id }));
        }
      },
      showErrorToast: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formationOptions = useMemo(() => formations, [formations]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const action = modeCreation === 'ORGANISATION'
      ? () => vouchersApi.createOrganisation(formData)
      : () => vouchersApi.createPromotionnel(formData);

    await execute(action, {
      onSuccess: (voucher) => {
        setCreatedVoucher(voucher);
        showToast(
          modeCreation === 'ORGANISATION'
            ? 'Voucher organisation créé.'
            : 'Voucher promotionnel créé.',
          'success'
        );
      },
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">Formulaire voucher</p>
        <h2 className="mt-3 text-2xl font-semibold text-primary">Création promotionnelle</h2>
        <p className="mt-2 text-subtext">
          Crée un voucher promotionnel ou un voucher organisation lié à un devis.
        </p>
      </div>

      {createdVoucher && (
        <Card bodyClassName="space-y-3">
          <div className="text-sm font-semibold text-success">Voucher créé</div>
          <div className="text-sm text-text">
            Code: <span className="font-mono">{createdVoucher.code}</span>
          </div>
          <div className="text-sm text-text">
            Statut: {createdVoucher.statut}
          </div>
          <Button variant="outline" onClick={() => navigate(`/backoffice/vouchers/${createdVoucher.id}`)}>
            Ouvrir le détail
          </Button>
        </Card>
      )}

      <Card>
        {isLoading && formationOptions.length === 0 ? (
          <div className="py-12">
            <Spinner size="large" />
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="voucher-mode-creation" className="mb-1.5 block text-sm font-medium text-text">
                Type de création
              </label>
              <select
                id="voucher-mode-creation"
                value={modeCreation}
                onChange={(e) => setModeCreation(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text"
              >
                <option value="PROMOTIONNEL">Voucher promotionnel</option>
                <option value="ORGANISATION">Voucher organisation</option>
              </select>
            </div>

            <div>
              <label htmlFor="voucher-formation" className="mb-1.5 block text-sm font-medium text-text">
                Formation
              </label>
              <select
                id="voucher-formation"
                value={formData.formation_id}
                onChange={(e) => setFormData((current) => ({ ...current, formation_id: e.target.value }))}
                className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text"
                required
              >
                {formationOptions.map((formation) => (
                  <option key={formation.id} value={formation.id}>
                    {formation.titre || formation.intitule}
                  </option>
                ))}
              </select>
            </div>

            {modeCreation === 'ORGANISATION' && (
              <div>
                <Input
                  type="text"
                  label="ID du devis"
                  value={formData.devis_id}
                  onChange={(e) => setFormData((current) => ({ ...current, devis_id: e.target.value }))}
                  placeholder="devis_id"
                />
                <p className="mt-1 text-xs text-subtext">
                  Obligatoire pour rattacher le voucher au devis de l'organisation.
                </p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                type="number"
                label="Valeur"
                value={formData.valeur}
                onChange={(e) => setFormData((current) => ({ ...current, valeur: e.target.value }))}
              />
              <div>
                <label htmlFor="voucher-type-valeur" className="mb-1.5 block text-sm font-medium text-text">
                  Type de valeur
                </label>
                <select
                  id="voucher-type-valeur"
                  value={formData.type_valeur}
                  onChange={(e) => setFormData((current) => ({ ...current, type_valeur: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text"
                >
                  <option value="POURCENTAGE">Pourcentage</option>
                  <option value="MONTANT">Montant fixe</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                type="number"
                label="Quota max"
                value={formData.quota_max}
                onChange={(e) => setFormData((current) => ({ ...current, quota_max: e.target.value }))}
              />
              <Input
                type="date"
                label="Date d'expiration"
                value={formData.date_expiration}
                onChange={(e) => setFormData((current) => ({ ...current, date_expiration: e.target.value }))}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/backoffice/vouchers')}>
                Annuler
              </Button>
              <Button type="submit" loading={isLoading}>
                {modeCreation === 'ORGANISATION' ? 'Créer le voucher organisation' : 'Créer le voucher promo'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
