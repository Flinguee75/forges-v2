import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import vouchersApi from '../../../api/vouchers.api';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/feedback/Spinner';

export default function VoucherDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const { showToast } = useToast();

  const [voucher, setVoucher] = useState(null);
  const [motif, setMotif] = useState('');

  useEffect(() => {
    execute(() => vouchersApi.getById(id), {
      onSuccess: setVoucher,
      showErrorToast: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleValidate = async () => {
    await execute(() => vouchersApi.valider(id), {
      onSuccess: (data) => {
        setVoucher(data);
        showToast('Voucher validé.', 'success');
      },
    });
  };

  const handleReject = async () => {
    await execute(() => vouchersApi.refuser(id, motif), {
      onSuccess: (data) => {
        setVoucher(data);
        showToast('Voucher refusé.', 'success');
      },
    });
  };

  if (isLoading && !voucher) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (!voucher) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <p className="text-subtext">Voucher introuvable.</p>
        <Button className="mt-4" onClick={() => navigate('/backoffice/vouchers')}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  const canModerate = voucher.type === 'PROMOTIONNEL' && voucher.statut === 'BROUILLON';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">Détail voucher</p>
        <h2 className="mt-3 text-2xl font-semibold text-primary">{voucher.code}</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Badge variant={voucher.statut === 'ACTIF' ? 'success' : voucher.statut === 'BROUILLON' ? 'warning' : 'gray'}>
            {voucher.statut}
          </Badge>
          <Badge variant="info">{voucher.type}</Badge>
        </div>
      </div>

      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-subtext">Formation</p>
            <p className="mt-2 text-text">{voucher.formation?.titre || voucher.formation?.intitule || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-subtext">Statut</p>
            <p className="mt-2 text-text">{voucher.statut}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-subtext">Quota</p>
            <p className="mt-2 text-text">{voucher.quota_utilise || 0} / {voucher.quota_max || 0}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-subtext">Expiration</p>
            <p className="mt-2 text-text">{voucher.date_expiration ? new Date(voucher.date_expiration).toLocaleDateString('fr-FR') : 'N/A'}</p>
          </div>
        </div>
      </Card>

      {canModerate && (
        <Card>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Validation promotionnelle</h3>
            <div className="flex flex-col gap-3 md:flex-row">
              <Button onClick={handleValidate} loading={isLoading}>Valider</Button>
              <Input
                placeholder="Motif de refus"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
              />
              <Button variant="outline" onClick={handleReject} loading={isLoading}>
                Refuser
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => navigate('/backoffice/vouchers')}>
          Retour à la liste
        </Button>
      </div>
    </div>
  );
}
