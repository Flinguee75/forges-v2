import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { useToast } from '../../../hooks/useToast';
import vouchersApi from '../../../api/vouchers.api';
import { formatCurrency } from '../../../utils/currency';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/feedback/Spinner';

const STATUT_LABELS = {
  ACTIF: 'Actif',
  BROUILLON: 'Brouillon',
  EN_ATTENTE: 'En attente',
  EPUISE: 'Epuise',
  EXPIRE: 'Expire',
  REFUSE: 'Refuse',
};

const TYPE_LABELS = {
  ORGANISATION: 'Organisation',
  APPORTEUR: 'Apporteur',
  PROMOTIONNEL: 'Promotionnel',
};

const REDUCTION_LABELS = {
  POURCENTAGE: 'Pourcentage',
  MONTANT: 'Montant fixe',
};

function formatDate(value) {
  if (!value) return '-';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('fr-FR', { dateStyle: 'long' });
  }
  return new Date(value).toLocaleDateString('fr-FR', { dateStyle: 'long' });
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
}

function formatReductionValue(voucher) {
  if (!voucher) return '-';
  const value = Number(voucher.valeur ?? 0);
  if (voucher.type_valeur === 'MONTANT') {
    return formatCurrency(value);
  }
  return `${value}%`;
}

function getLinkedEntityLabel(voucher) {
  if (voucher?.organisation) {
    return voucher.organisation.raison_sociale || voucher.organisation.id || '-';
  }
  if (voucher?.apporteur) {
    return voucher.apporteur.nom || voucher.apporteur.code_apporteur || voucher.apporteur.id || '-';
  }
  return '-';
}

export default function VoucherDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { execute, isLoading } = useApi();
  const { showToast } = useToast();

  const [voucher, setVoucher] = useState(null);
  const [motif, setMotif] = useState('');
  const [utilisateurs, setUtilisateurs] = useState([]);

  useEffect(() => {
    execute(() => vouchersApi.getById(id), {
      onSuccess: setVoucher,
      showErrorToast: false,
    });
    execute(() => vouchersApi.getUtilisateurs(id), {
      onSuccess: (data) => setUtilisateurs(Array.isArray(data) ? data : []),
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
  const quotaMax = Number(voucher.quota_max ?? 0);
  const quotaUtilise = Number(voucher.quota_utilise ?? 0);
  const quotaRestant = Number(voucher.quota_restant ?? Math.max(0, quotaMax - quotaUtilise));
  const reductionTypeLabel = REDUCTION_LABELS[voucher.type_valeur] || voucher.type_valeur || '-';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">Détail voucher</p>
        <h2 className="mt-3 text-2xl font-semibold text-primary">{voucher.code}</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Badge variant={voucher.statut === 'ACTIF' ? 'success' : voucher.statut === 'BROUILLON' ? 'warning' : 'gray'}>
            {STATUT_LABELS[voucher.statut] || voucher.statut}
          </Badge>
          <Badge variant="info">{TYPE_LABELS[voucher.type] || voucher.type}</Badge>
          {voucher.type_valeur && (
            <Badge variant={voucher.type_valeur === 'POURCENTAGE' ? 'success' : 'warning'}>
              {reductionTypeLabel}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-subtext">Informations générales</h3>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Formation</dt>
              <dd className="mt-1 text-sm text-text">{voucher.formation?.titre || voucher.formation?.intitule || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Type de réduction</dt>
              <dd className="mt-1 text-sm text-text">{reductionTypeLabel}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Valeur de réduction</dt>
              <dd className="mt-1 text-sm text-text">{formatReductionValue(voucher)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Statut</dt>
              <dd className="mt-1 text-sm text-text">{STATUT_LABELS[voucher.statut] || voucher.statut}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-subtext">Quota et dates</h3>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Quota utilisé</dt>
              <dd className="mt-1 text-sm text-text">{quotaUtilise}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Quota maximum</dt>
              <dd className="mt-1 text-sm text-text">{quotaMax || '∞'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Quota restant</dt>
              <dd className="mt-1 text-sm text-text">{quotaRestant}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Expiration</dt>
              <dd className="mt-1 text-sm text-text">{formatDate(voucher.date_expiration)}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-subtext">Traçabilité</h3>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Organisation / apporteur</dt>
              <dd className="mt-1 text-sm text-text">{getLinkedEntityLabel(voucher)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Devis source</dt>
              <dd className="mt-1 text-sm text-text">{voucher.devis_id || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Créé le</dt>
              <dd className="mt-1 text-sm text-text">{formatDateTime(voucher.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Créé par</dt>
              <dd className="mt-1 text-sm text-text">{voucher.cree_par || '-'}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-subtext">Validation</h3>
          <dl className="space-y-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Validé par</dt>
              <dd className="mt-1 text-sm text-text">{voucher.valide_par || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Validé le</dt>
              <dd className="mt-1 text-sm text-text">{formatDateTime(voucher.valide_le)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Motif de refus</dt>
              <dd className="mt-1 text-sm text-text">{voucher.motif_refus || '-'}</dd>
            </div>
          </dl>
        </Card>
      </div>

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

      <Card>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-subtext">
          Utilisateurs ({utilisateurs.length})
        </h3>
        {utilisateurs.length === 0 ? (
          <p className="text-sm text-subtext">Aucun apprenant n'a encore utilisé ce voucher.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Nom</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Email</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-[0.16em] text-subtext">Date d'utilisation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {utilisateurs.map((u) => (
                  <tr key={u.dossier_id} className="hover:bg-bg">
                    <td className="py-3 font-medium text-text">
                      {u.apprenant?.nom} {u.apprenant?.prenoms}
                    </td>
                    <td className="py-3 text-subtext">{u.apprenant?.email || '-'}</td>
                    <td className="py-3 text-subtext">{formatDateTime(u.date_utilisation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => navigate('/backoffice/vouchers')}>
          Retour à la liste
        </Button>
      </div>
    </div>
  );
}
