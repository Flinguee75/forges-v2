import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import vouchersApi from '../../../api/vouchers.api';
import formationsApi from '../../../api/formations.api';
import devisApi from '../../../api/devis.api';
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
  const [devisList, setDevisList] = useState([]);
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
    execute(async () => {
      const [formationsData, devisData] = await Promise.all([
        formationsApi.getAllBackoffice({ limit: 100 }),
        devisApi.getAll({ statut: 'CREE', limit: 100 }),
      ]);
      return { formationsData, devisData };
    }, {
      onSuccess: ({ formationsData, devisData }) => {
        const formationsItems = Array.isArray(formationsData?.data) ? formationsData.data : [];
        const devisItems = Array.isArray(devisData?.data) ? devisData.data : [];

        setFormations(formationsItems);
        setDevisList(devisItems);

        if (!formData.formation_id && formationsItems[0]?.id) {
          setFormData((current) => ({ ...current, formation_id: formationsItems[0].id }));
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
        <h2 className="mt-3 text-2xl font-semibold text-primary">Création de voucher</h2>
        <p className="mt-2 text-subtext">
          {modeCreation === 'ORGANISATION'
            ? 'Crée un voucher organisation lié à un devis existant.'
            : 'Crée un voucher promotionnel pour une formation donnée.'}
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
                <label htmlFor="voucher-devis" className="mb-1.5 block text-sm font-medium text-text">
                  Devis source du voucher
                </label>
                <select
                  id="voucher-devis"
                  value={formData.devis_id}
                  onChange={(e) => setFormData((current) => ({ ...current, devis_id: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-white px-4 py-2 text-sm text-text"
                  required
                >
                  <option value="">Sélectionner un devis</option>
                  {devisList.map((devis) => (
                    <option key={devis.id} value={devis.id}>
                      {devis.numero_devis} - {devis.organisation?.raison_sociale || devis.organisation_id} - {devis.formation?.intitule || devis.formation?.titre || 'Formation'}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-subtext">
                  Choisis un devis existant pour rattacher le voucher organisation.
                </p>
              </div>
            )}

            <div className="rounded-lg border border-border bg-gray-50 p-4">
              <p className="text-sm font-semibold text-primary">Récapitulatif avant création</p>
              <div className="mt-3 grid gap-2 text-sm text-text md:grid-cols-2">
                <div>
                  <span className="text-subtext">Type</span>
                  <div className="font-medium">
                    {modeCreation === 'ORGANISATION' ? 'Voucher organisation' : 'Voucher promotionnel'}
                  </div>
                </div>
                <div>
                  <span className="text-subtext">Formation</span>
                  <div className="font-medium">
                    {formationOptions.find((formation) => formation.id === formData.formation_id)?.titre
                      || formationOptions.find((formation) => formation.id === formData.formation_id)?.intitule
                      || 'Non sélectionnée'}
                  </div>
                </div>
                <div>
                  <span className="text-subtext">Réduction</span>
                  <div className="font-medium">
                    {formData.type_valeur === 'POURCENTAGE'
                      ? `${formData.valeur}%`
                      : `${Number(formData.valeur || 0).toLocaleString('fr-FR')} FCFA`}
                  </div>
                </div>
                <div>
                  <span className="text-subtext">Quota max</span>
                  <div className="font-medium">{formData.quota_max}</div>
                </div>
                <div>
                  <span className="text-subtext">Expiration</span>
                  <div className="font-medium">
                    {formData.date_expiration ? new Date(formData.date_expiration).toLocaleDateString('fr-FR') : 'N/A'}
                  </div>
                </div>
                {modeCreation === 'ORGANISATION' && (
                  <div>
                    <span className="text-subtext">Devis source</span>
                    <div className="font-medium">
                      {devisList.find((devis) => devis.id === formData.devis_id)?.numero_devis || 'Non sélectionné'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                type="number"
                label={formData.type_valeur === 'POURCENTAGE' ? 'Taux de réduction (%)' : 'Montant de réduction'}
                value={formData.valeur}
                onChange={(e) => setFormData((current) => ({ ...current, valeur: e.target.value }))}
              />
              <div>
                <label htmlFor="voucher-type-valeur" className="mb-1.5 block text-sm font-medium text-text">
                  Type de réduction
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
                <p className="mt-1 text-xs text-subtext">
                  {formData.type_valeur === 'POURCENTAGE'
                    ? 'Exemple : 10 = réduction de 10 % sur le catalogue.'
                    : 'Exemple : 5000 = réduction fixe de 5 000 FCFA.'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                type="number"
                label="Nombre maximum d'utilisations"
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
            <p className="text-xs text-subtext">
              Le nombre maximum d'utilisations correspond au nombre de bénéficiaires ou de passages autorisés par le voucher.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/backoffice/vouchers')}>
                Annuler
              </Button>
              <Button type="submit" loading={isLoading}>
                Créer un voucher
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
