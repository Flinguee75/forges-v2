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
  const [formData, setFormData] = useState({
    formation_id: '',
    valeur: 10,
    type_valeur: 'POURCENTAGE',
    quota_max: 1,
    date_expiration: getDefaultExpiry(),
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

    await execute(() => vouchersApi.createPromotionnel(formData), {
      onSuccess: (voucher) => {
        setCreatedVoucher(voucher);
        showToast('Voucher promotionnel créé.', 'success');
      },
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">Formulaire voucher</p>
        <h2 className="mt-3 text-2xl font-semibold text-primary">Création promotionnelle</h2>
        <p className="mt-2 text-subtext">Le contrat backend réactivé permet la création de vouchers promotionnels en brouillon.</p>
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
              <label className="mb-1.5 block text-sm font-medium text-text">Formation</label>
              <select
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

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                type="number"
                label="Valeur"
                value={formData.valeur}
                onChange={(e) => setFormData((current) => ({ ...current, valeur: e.target.value }))}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text">Type de valeur</label>
                <select
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
                Créer le voucher
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
