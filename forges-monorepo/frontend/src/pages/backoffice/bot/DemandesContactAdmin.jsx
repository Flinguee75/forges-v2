import { useEffect, useState, useCallback } from 'react';
import { useApi } from '../../../hooks/useApi';
import botApi from '../../../api/bot.api';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Spinner from '../../../components/feedback/Spinner';
import EmptyState from '../../../components/feedback/EmptyState';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('fr-FR');
}

function getStatutBadge(statut) {
  const mapping = {
    NOUVELLE: { variant: 'info', label: 'Nouvelle' },
    EN_COURS: { variant: 'warning', label: 'En cours' },
    TRAITEE: { variant: 'success', label: 'Traitée' },
    CLOTUREE: { variant: 'gray', label: 'Clôturée' },
    ABANDONNEE: { variant: 'gray', label: 'Abandonnée' },
  };

  const config = mapping[statut] || { variant: 'gray', label: statut || 'Inconnu' };
  return <Badge variant={config.variant} size="small">{config.label}</Badge>;
}

export default function DemandesContactAdmin() {
  const [data, setData] = useState(null);
  const { execute, isLoading } = useApi();

  const loadData = useCallback(async () => {
    await execute(
      () => botApi.getDemandesContact(),
      {
        onSuccess: (response) => {
          setData(response.data);
        },
      },
    );
  }, [execute]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="large" />
      </div>
    );
  }

  if (!data) return null;

  const { demandes, meta } = data;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/60">
          Bot admin
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-primary">
          Demandes de contact
        </h1>
        <p className="mt-2 text-sm text-subtext">
          Demandes captées depuis le flux conseil organisation, avec le motif, le commentaire et l’organisation liée.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-center">
            <p className="text-sm text-subtext">Total demandes</p>
            <p className="mt-2 text-3xl font-bold text-primary">{meta.total}</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-subtext">Page {meta.page} / {meta.totalPages}</p>
            <p className="mt-2 text-sm text-subtext">Limite: {meta.limit} par page</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-subtext">Demandes ouvertes</p>
            <p className="mt-2 text-3xl font-bold text-primary">
              {demandes.filter((demande) => demande.statut === 'NOUVELLE').length}
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-primary">
            Demandes reçues ({demandes.length})
          </h2>
        </div>
        {demandes.length === 0 ? (
          <EmptyState title="Aucune demande" message="Aucune demande de contact n'a été enregistrée pour le moment." />
        ) : (
          <div className="space-y-3 p-4">
            {demandes.map((demande) => (
              <div key={demande.id} className="rounded-lg border border-border bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text">
                      {demande.organisation?.raison_sociale || 'Organisation inconnue'}
                    </p>
                    <p className="mt-1 text-xs text-subtext">
                      {demande.organisation?.contact_referent || '-'} · {demande.organisation?.email || '-'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getStatutBadge(demande.statut)}
                    <Badge variant="info" size="small">{demande.motif}</Badge>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-sm text-text sm:grid-cols-3">
                  <p><span className="font-semibold">Date</span> {formatDate(demande.date_saisie)}</p>
                  <p><span className="font-semibold">Type</span> {demande.type_utilisateur}</p>
                  <p><span className="font-semibold">Session bot</span> {demande.session_bot_id || '-'}</p>
                </div>

                {demande.commentaire ? (
                  <p className="mt-3 rounded-md bg-bg px-3 py-2 text-sm text-text">
                    {demande.commentaire}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
